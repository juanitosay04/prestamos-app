"use server"

import { prisma } from "@/lib/prisma"
import { addDays, addWeeks, addMonths } from "date-fns"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/session"
import { generateSecretaryCommissionExpense } from "./payment"

export async function getLoans(month?: number, year?: number) {
  try {
    let dateFilter = {}
    if (month && year) {
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0, 23, 59, 59, 999)
      dateFilter = {
        startDate: {
          gte: startDate,
          lte: endDate
        }
      }
    }

    return await prisma.loan.findMany({
      where: { deletedAt: null, ...dateFilter },
      orderBy: { createdAt: "desc" },
      include: {
        client: true,
        installments: true,
        investors: {
          include: {
            investor: true
          }
        }
      }
    })
  } catch (error) {
    console.error("Error fetching loans:", error)
    return []
  }
}

export async function markLoanAsDefaulted(loanId: string) {
  try {
    const session = await getSession()
    if (!session || session.role !== "ADMIN") {
      return { error: "No autorizado" }
    }

    // Update the loan to defaulted
    await prisma.loan.update({
      where: { id: loanId },
      data: { 
        status: "DEFAULTED",
        defaultedAt: new Date()
      }
    })

    // Find the loan's clientId to blacklist them
    const loan = await prisma.loan.findUnique({ where: { id: loanId } })
    if (loan) {
      await prisma.client.update({
        where: { id: loan.clientId },
        data: { isBlacklisted: true }
      })
    }

    revalidatePath(`/prestamos/${loanId}`)
    revalidatePath(`/prestamos`)
    revalidatePath(`/clientes`)
    revalidatePath(`/`)
    
    return { success: true }
  } catch (error) {
    console.error("Error marking loan as defaulted:", error)
    return { error: "Error al marcar préstamo como perdido" }
  }
}

export async function reviveLoan(loanId: string) {
  try {
    const session = await getSession()
    if (!session || session.role !== "ADMIN") {
      return { error: "No autorizado" }
    }

    await prisma.loan.update({
      where: { id: loanId },
      data: { 
        status: "ACTIVE", // Or check if all installments are paid to mark as PAID, but if it was defaulted, it probably has pending ones
        defaultedAt: null
      }
    })

    // Also double check if it's overdue
    const hasOverdue = await prisma.installment.findFirst({
      where: { loanId, status: "PENDING", dueDate: { lt: new Date() } }
    })
    
    if (hasOverdue) {
      await prisma.loan.update({ where: { id: loanId }, data: { status: "OVERDUE" } })
    }

    revalidatePath(`/prestamos/${loanId}`)
    revalidatePath(`/prestamos`)
    revalidatePath(`/`)
    
    return { success: true }
  } catch (error) {
    console.error("Error reviving loan:", error)
    return { error: "Error al revivir préstamo" }
  }
}

export async function createLoan(data: any) {
  try {
    const {
      clientId,
      principalAmount, // in cents
      interestRate, // can be 0 if interestAmount is provided
      interestAmount, // in cents, optional
      interestType, // "MONTHLY", "WEEKLY", "BIWEEKLY", "DAILY"
      secretaryCommission,
      secretaryCommissionType,
      upfrontFee, // Add upfrontFee
      startDate,
      numberOfInstallments,
      investors, // Array of { investorId, participationPercentage, investedAmount }
      referredByInvestorId,
      refinancedFromId
    } = data

    // Check if client is blacklisted
    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (client?.isBlacklisted) {
      return { error: "Este cliente se encuentra en la lista negra por impago y no puede recibir nuevos préstamos." }
    }

    // 1. Calculate Installments (Amortización Francesa)
    const installmentsData: any[] = []
    let currentDate = new Date(startDate)
    
    let isFrench = false
    let fixedInstallmentAmount = 0
    let totalInterestInCents = 0
    let iRate = interestRate / 100

    if (interestAmount && interestAmount > 0) {
      // Fixed total interest
      totalInterestInCents = interestAmount
      const pPart = Math.round(principalAmount / numberOfInstallments)
      const iPart = Math.round(totalInterestInCents / numberOfInstallments)
      fixedInstallmentAmount = pPart + iPart
    } else if (numberOfInstallments === 1) {
      // 1 installment -> Simple Interest
      totalInterestInCents = Math.round(principalAmount * iRate)
      fixedInstallmentAmount = principalAmount + totalInterestInCents
    } else {
      // French Amortization
      isFrench = true
      if (iRate > 0) {
        fixedInstallmentAmount = Math.round(principalAmount * (iRate / (1 - Math.pow(1 + iRate, -numberOfInstallments))))
      } else {
        fixedInstallmentAmount = Math.round(principalAmount / numberOfInstallments)
      }
    }

    let outstandingPrincipal = principalAmount

    for (let i = 1; i <= numberOfInstallments; i++) {
      if (interestType === "MONTHLY") {
        currentDate = addMonths(currentDate, 1)
      } else if (interestType === "WEEKLY") {
        currentDate = addWeeks(currentDate, 1)
      } else if (interestType === "BIWEEKLY") {
        currentDate = addWeeks(currentDate, 2)
      } else if (interestType === "DAILY") {
        currentDate = addDays(currentDate, 1)
      }
      
      let interestPart = 0
      let principalPart = 0

      if (isFrench) {
        if (i === numberOfInstallments) {
          // Last installment adjusts to exact remaining principal
          principalPart = outstandingPrincipal
          interestPart = fixedInstallmentAmount - principalPart
        } else {
          interestPart = Math.round(outstandingPrincipal * iRate)
          principalPart = fixedInstallmentAmount - interestPart
        }
        outstandingPrincipal -= principalPart
      } else {
        principalPart = Math.round(principalAmount / numberOfInstallments)
        interestPart = Math.round(totalInterestInCents / numberOfInstallments)
      }
      
      installmentsData.push({
        installmentNumber: i,
        dueDate: currentDate,
        expectedAmount: fixedInstallmentAmount,
        principalPart: principalPart,
        interestPart: interestPart,
        status: "PENDING",
        amountPaid: 0,
        lateFee: 0
      })
    }

    const endDate = installmentsData[installmentsData.length - 1].dueDate

    // 3. Create Loan with Transaction
    const loan = await prisma.$transaction(async (tx) => {
      const newLoan = await tx.loan.create({
        data: {
          clientId,
          principalAmount,
          interestRate: interestRate || 0,
          interestType: interestType as any,
          interestAmount: interestAmount || null,
          secretaryCommission: secretaryCommission,
          secretaryCommissionType: secretaryCommissionType as any,
          upfrontFee: upfrontFee || 0,
          startDate: new Date(startDate),
          endDate,
          numberOfInstallments,
          installmentAmount: fixedInstallmentAmount,
          status: "ACTIVE",
          referredByInvestorId: referredByInvestorId || null,
          refinancedFromId: refinancedFromId || null,
          // Relaciones
          installments: {
            create: installmentsData
          },
          investors: {
            create: investors.map((inv: any) => ({
              investorId: inv.investorId,
              investedAmount: inv.investedAmount,
              participationPercentage: inv.participationPercentage
            }))
          }
        }
      })
      
      return newLoan
    })

    // Notificación / Auditoría
    const session = await getSession()
    if (session) {
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: "CREATE_LOAN",
          entityType: "Loan",
          entityId: loan.id,
          details: JSON.stringify({ principal: principalAmount, role: session.role })
        }
      })
    }

    revalidatePath("/prestamos")
    return { success: true, loan }
  } catch (error: any) {
    console.error("Error creating loan:", error)
    return { error: "Error al crear el préstamo" }
  }
}

export async function refinanceLoan(oldLoanId: string, newLoanData: any) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark old loan as REFINANCED
      await tx.loan.update({
        where: { id: oldLoanId },
        data: { status: "REFINANCED" }
      })

      // We cannot call createLoan inside transaction because it has its own transaction,
      // so we just return the data to be created outside, or we do it all here.
      // But for simplicity, we'll just update it outside the transaction or rewrite the creation.
    })

    // 2. Create the new loan using the existing createLoan function
    const newLoanResult = await createLoan(newLoanData)
    
    if (newLoanResult.error) {
      // If creation fails, we revert the status manually (since we didn't share transaction)
      await prisma.loan.update({
        where: { id: oldLoanId },
        data: { status: "ACTIVE" }
      })
      return newLoanResult
    }

    revalidatePath(`/prestamos/${oldLoanId}`)
    revalidatePath("/prestamos")
    return { success: true, newLoan: newLoanResult.loan }
  } catch (error: any) {
    console.error("Error refinancing loan:", error)
    return { error: "Error al refinanciar el préstamo" }
  }
}

export async function registerPrincipalPayment(
  loanId: string, 
  amountInCents: number, 
  adjustmentType: "REDUCE_AMOUNT" | "REDUCE_TERM"
) {
  try {
    const session = await getSession()
    
    const result = await prisma.$transaction(async (tx) => {
      // 1. Obtener préstamo actual con todas sus cuotas PENDING
      const loan = await tx.loan.findUnique({
        where: { id: loanId },
        include: {
          installments: {
            where: { status: { in: ["PENDING"] } },
            orderBy: { installmentNumber: "asc" }
          }
        }
      })

      if (!loan) throw new Error("Préstamo no encontrado")
      if (loan.status === "REFINANCED") throw new Error("No se pueden recibir pagos en préstamos refinanciados")
      if (loan.installments.length === 0) throw new Error("No hay cuotas pendientes para aplicar abono a capital")

      // Registrar el pago como PRINCIPAL
      await tx.payment.create({
        data: {
          loanId,
          amountPaid: amountInCents,
          type: "PRINCIPAL",
          isPartial: false
        }
      })

      // Sumar el capital pendiente de las cuotas futuras
      const currentOutstandingPrincipal = loan.installments.reduce((sum, inst) => sum + inst.principalPart, 0)
      const newOutstandingPrincipal = currentOutstandingPrincipal - amountInCents
      
      if (newOutstandingPrincipal <= 0) {
        // Se pagó la totalidad del capital restante
        // Marcar todas las cuotas pendientes como PAID sin cobrarles más interés
        for (const inst of loan.installments) {
          await tx.installment.update({
            where: { id: inst.id },
            data: { 
              status: "PAID",
              amountPaid: inst.principalPart,
              interestPart: 0,
              expectedAmount: inst.principalPart
            }
          })
        }
        await tx.loan.update({
          where: { id: loanId },
          data: { status: "PAID" }
        })
        await generateSecretaryCommissionExpense(tx, loanId)
        return { success: true, statusChanged: true }
      }

      // Si aún queda capital, recalcular según el método elegido
      const isFrench = loan.interestRate > 0 && loan.installments.length > 1
      const iRate = loan.interestRate / 100

      if (adjustmentType === "REDUCE_AMOUNT") {
        // REDUCIR CUOTA: Mismo número de cuotas, menor valor
        const numPending = loan.installments.length
        
        let newExpectedAmount = 0
        if (isFrench) {
          newExpectedAmount = Math.round(newOutstandingPrincipal * (iRate / (1 - Math.pow(1 + iRate, -numPending))))
        } else {
          // Simple or fixed interest logic unchanged for this branch
          const newRemainingInterest = loan.interestRate > 0 
            ? Math.round(newOutstandingPrincipal * iRate * numPending) 
            : (loan.installments[0].interestPart * numPending)
          newExpectedAmount = Math.round((newOutstandingPrincipal + newRemainingInterest) / numPending)
        }

        let tempPrincipal = newOutstandingPrincipal
        
        for (let i = 0; i < loan.installments.length; i++) {
          const inst = loan.installments[i]
          let pPart = 0
          let iPart = 0
          
          if (isFrench) {
            if (i === loan.installments.length - 1) {
              pPart = tempPrincipal
              iPart = newExpectedAmount - pPart
            } else {
              iPart = Math.round(tempPrincipal * iRate)
              pPart = newExpectedAmount - iPart
            }
            tempPrincipal -= pPart
          } else {
            pPart = Math.round(newOutstandingPrincipal / numPending)
            iPart = newExpectedAmount - pPart
          }
          
          await tx.installment.update({
            where: { id: inst.id },
            data: {
              principalPart: pPart,
              interestPart: iPart,
              expectedAmount: newExpectedAmount
            }
          })
        }

      } else if (adjustmentType === "REDUCE_TERM") {
        // REDUCIR PLAZO: Misma cuota, se recortan cuotas
        const fixedInstallmentAmount = loan.installmentAmount
        let tempPrincipal = newOutstandingPrincipal
        
        for (let i = 0; i < loan.installments.length; i++) {
          const inst = loan.installments[i]
          
          if (tempPrincipal > 0) {
            let iPart = 0
            let pPart = 0
            
            if (isFrench) {
              iPart = Math.round(tempPrincipal * iRate)
              pPart = fixedInstallmentAmount - iPart
              
              if (pPart > tempPrincipal) {
                pPart = tempPrincipal
                // Last installment is smaller
              }
            } else {
              pPart = Math.min(loan.installments[0].principalPart, tempPrincipal)
              iPart = loan.installments[0].interestPart // keep original fixed interest part
            }
            
            tempPrincipal -= pPart
            
            await tx.installment.update({
              where: { id: inst.id },
              data: {
                principalPart: pPart,
                interestPart: iPart,
                expectedAmount: pPart + iPart
              }
            })
          } else {
            // Eliminar las cuotas sobrantes del final
            await tx.installment.delete({
              where: { id: inst.id }
            })
          }
        }
      }

      return { success: true }
    })

    if (session) {
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: "PRINCIPAL_PAYMENT",
          entityType: "Loan",
          entityId: loanId,
          details: JSON.stringify({ amount: amountInCents, type: adjustmentType })
        }
      })
    }

    revalidatePath(`/prestamos/${loanId}`)
    revalidatePath("/prestamos")
    
    return result
  } catch (error: any) {
    console.error("Error en abono a capital:", error)
    return { error: error.message || "Error procesando el abono a capital" }
  }
}
