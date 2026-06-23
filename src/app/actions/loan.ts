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
    return { loans: [], totalActivePrincipal: 0, totalExpectedInterest: 0, totalActiveCount: 0 }
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
      startDate,
      numberOfInstallments,
      investors, // Array of { investorId, participationPercentage, investedAmount }
      referredByInvestorId
    } = data

    // Check if client is blacklisted
    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (client?.isBlacklisted) {
      return { error: "Este cliente se encuentra en la lista negra por impago y no puede recibir nuevos préstamos." }
    }

    // 1. Calculate Total Interest
    let totalInterestInCents = 0
    if (interestAmount && interestAmount > 0) {
      totalInterestInCents = interestAmount
    } else {
      // Calculate total interest based on rate.
      // Assuming Simple Interest: Principal * Rate * Periods
      totalInterestInCents = Math.round(principalAmount * (interestRate / 100) * numberOfInstallments)
    }

    // 2. Calculate Installments
    const principalPerInstallment = Math.round(principalAmount / numberOfInstallments)
    const interestPerInstallment = Math.round(totalInterestInCents / numberOfInstallments)
    const installmentAmount = principalPerInstallment + interestPerInstallment

    // Calculate End Date and Installment Dates
    const installmentsData: any[] = []
    let currentDate = new Date(startDate)
    
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
      
      installmentsData.push({
        installmentNumber: i,
        dueDate: currentDate,
        expectedAmount: installmentAmount,
        principalPart: principalPerInstallment,
        interestPart: interestPerInstallment,
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
          startDate: new Date(startDate),
          endDate,
          numberOfInstallments,
          installmentAmount,
          status: "ACTIVE",
          referredByInvestorId: referredByInvestorId || null,
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
      if (adjustmentType === "REDUCE_AMOUNT") {
        // REDUCIR CUOTA: Mismo número de cuotas, menor valor
        const numPending = loan.installments.length
        const newPrincipalPerInst = Math.round(newOutstandingPrincipal / numPending)
        
        let newInterestPerInst = 0
        if (loan.interestRate > 0) {
          // Recalcular interés total basado en el nuevo saldo y dividirlo (Interés Simple)
          const newRemainingInterest = Math.round(newOutstandingPrincipal * (loan.interestRate / 100) * numPending)
          newInterestPerInst = Math.round(newRemainingInterest / numPending)
        } else {
          // Si era monto fijo precalculado, mantenemos el mismo interés (la parte de interés no se reduce, solo capital)
          newInterestPerInst = loan.installments[0].interestPart
        }

        const newExpectedAmount = newPrincipalPerInst + newInterestPerInst

        for (const inst of loan.installments) {
          await tx.installment.update({
            where: { id: inst.id },
            data: {
              principalPart: newPrincipalPerInst,
              interestPart: newInterestPerInst,
              expectedAmount: newExpectedAmount
            }
          })
        }

      } else if (adjustmentType === "REDUCE_TERM") {
        // REDUCIR PLAZO: Misma cuota de capital, se recortan cuotas
        const originalPrincipalPerInst = loan.installments[0].principalPart
        const originalInterestPerInst = loan.installments[0].interestPart
        
        // Número de cuotas que quedan completas
        const newNumPending = Math.ceil(newOutstandingPrincipal / originalPrincipalPerInst)
        
        let remainingPrincipalToDistribute = newOutstandingPrincipal

        for (let i = 0; i < loan.installments.length; i++) {
          const inst = loan.installments[i]
          
          if (i < newNumPending) {
            // Asignar capital
            const capitalToAssign = Math.min(originalPrincipalPerInst, remainingPrincipalToDistribute)
            remainingPrincipalToDistribute -= capitalToAssign
            
            // Asignar interés
            let interestToAssign = originalInterestPerInst
            if (loan.interestRate > 0) {
               // El interés mensual/semanal es % del capital restante
               interestToAssign = Math.round(newOutstandingPrincipal * (loan.interestRate / 100))
            }
            
            await tx.installment.update({
              where: { id: inst.id },
              data: {
                principalPart: capitalToAssign,
                interestPart: interestToAssign,
                expectedAmount: capitalToAssign + interestToAssign
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
