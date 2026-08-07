"use server"

import { prisma } from "@/lib/prisma"
import { addDays, addWeeks, addMonths } from "date-fns"
import { revalidatePath } from "next/cache"
import { getSession, getCurrentUserSummary } from "@/lib/session"
import { generateSecretaryCommissionExpense } from "./payment"
import { getSecretaryCommissionSettings, getCompanyCommissionSettings } from "./settings"
import { notifyLoanCreated, notifyLoanRefinanced, notifyLoanDefaulted, notifyPrincipalPayment, notifyLoanRevived } from "@/lib/telegram"

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

    const loan = await prisma.loan.findUnique({ 
      where: { id: loanId },
      include: { client: true }
    })
    if (loan) {
      await prisma.client.update({
        where: { id: loan.clientId },
        data: { isBlacklisted: true }
      })

      // Notificación Telegram
      const operator = await getCurrentUserSummary()
      notifyLoanDefaulted({
        loanId: loan.id,
        clientName: `${loan.client.firstName} ${loan.client.lastName}`,
        principalAmount: loan.principalAmount,
        performedBy: operator.label
      }).catch(err => console.error("Telegram notifyLoanDefaulted error:", err))
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

    // Notificación Telegram
    try {
      const operator = await getCurrentUserSummary()
      const loan = await prisma.loan.findUnique({
        where: { id: loanId },
        include: { client: true }
      })
      if (loan) {
        notifyLoanRevived({
          loanId: loan.id,
          clientName: `${loan.client.firstName} ${loan.client.lastName}`,
          performedBy: operator.label
        }).catch(err => console.error("Telegram notifyLoanRevived error:", err))
      }
    } catch (telErr) {
      console.error("Telegram reviveLoan error:", telErr)
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
      companyCommission,
      companyCommissionType,
      upfrontFee, // Add upfrontFee
      startDate,
      numberOfInstallments,
      investors, // Array of { investorId, participationPercentage, investedAmount }
      referredByInvestorId,
      refinancedFromId
    } = data

    // Verificar sesión y cargar comisión de secretaría y empresa por defecto si aplica
    const session = await getSession()
    let finalSecComm = typeof secretaryCommission === "number" ? secretaryCommission : parseFloat(secretaryCommission) || 0
    let finalSecCommType = secretaryCommissionType || "PERCENTAGE_INTEREST"

    if (finalSecComm === 0 || session?.role === "SECRETARY") {
      const defaultComm = await getSecretaryCommissionSettings()
      if (defaultComm && defaultComm.commissionValue > 0) {
        finalSecComm = defaultComm.commissionValue
        finalSecCommType = defaultComm.commissionType
        if (finalSecCommType === "FIXED_AMOUNT") {
          finalSecComm = Math.round(finalSecComm * 100)
        }
      }
    }

    let finalCompanyComm = typeof companyCommission === "number" ? companyCommission : parseFloat(companyCommission) || 0
    let finalCompanyCommType = companyCommissionType || "PERCENTAGE_INTEREST"

    if (finalCompanyComm === 0) {
      const defaultCompanyComm = await getCompanyCommissionSettings()
      if (defaultCompanyComm && defaultCompanyComm.commissionValue > 0) {
        finalCompanyComm = defaultCompanyComm.commissionValue
        finalCompanyCommType = defaultCompanyComm.commissionType
        if (finalCompanyCommType === "FIXED_AMOUNT") {
          finalCompanyComm = Math.round(finalCompanyComm * 100)
        }
      }
    }

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
          secretaryCommission: finalSecComm,
          secretaryCommissionType: finalSecCommType as any,
          companyCommission: finalCompanyComm,
          companyCommissionType: finalCompanyCommType as any,
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

    // Notificación en Telegram para colaboradores
    try {
      const operator = await getCurrentUserSummary()
      const clientInfo = await prisma.client.findUnique({ where: { id: clientId } })
      if (clientInfo) {
        const clientName = `${clientInfo.firstName} ${clientInfo.lastName}`
        if (refinancedFromId) {
          const oldLoan = await prisma.loan.findUnique({ where: { id: refinancedFromId } })
          notifyLoanRefinanced({
            newLoanId: loan.id,
            oldLoanId: refinancedFromId,
            clientName,
            oldOutstandingPrincipal: oldLoan ? oldLoan.principalAmount : 0,
            newPrincipal: loan.principalAmount,
            numberOfInstallments: loan.numberOfInstallments,
            installmentAmount: loan.installmentAmount,
            interestType: loan.interestType,
            performedBy: operator.label
          }).catch(err => console.error("Telegram refinance notification error:", err))
        } else {
          let investorsSummary = "Fondeo Propio"
          if (investors && investors.length > 0) {
            const invs = await prisma.investor.findMany({
              where: { id: { in: investors.map((i: any) => i.investorId) } }
            })
            investorsSummary = invs.map(i => i.name).join(", ")
          }
          notifyLoanCreated({
            loanId: loan.id,
            clientName,
            idDocument: clientInfo.idDocument,
            principalAmount: loan.principalAmount,
            numberOfInstallments: loan.numberOfInstallments,
            installmentAmount: loan.installmentAmount,
            interestType: loan.interestType,
            investorsSummary,
            performedBy: operator.label
          }).catch(err => console.error("Telegram new loan notification error:", err))
        }
      }
    } catch (telErr) {
      console.error("Telegram notification error in createLoan:", telErr)
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
            where: { status: { in: ["PENDING", "LATE", "PARTIAL"] } },
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
      // Obtener los inversionistas del préstamo para guardar la repartición exacta
      const loanForDist = await prisma.loan.findUnique({
        where: { id: loanId },
        include: {
          investors: {
            include: {
              investor: true
            }
          }
        }
      })

      const distributions = (loanForDist?.investors || []).map(inv => {
        const share = Math.round(amountInCents * (inv.participationPercentage / 100))
        return {
          investorId: inv.investorId,
          investorName: inv.investor.name,
          percentage: inv.participationPercentage,
          amount: share
        }
      })

      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: "PRINCIPAL_PAYMENT",
          entityType: "Loan",
          entityId: loanId,
          details: JSON.stringify({ 
            amount: amountInCents, 
            type: adjustmentType,
            distributions 
          })
        }
      })
    }

    // Notificación Telegram
    try {
      const operator = await getCurrentUserSummary()
      const loanData = await prisma.loan.findUnique({
        where: { id: loanId },
        include: { client: true, installments: { where: { status: "PENDING" } } }
      })
      if (loanData) {
        const remainingP = loanData.installments.reduce((sum, inst) => sum + inst.principalPart, 0)
        notifyPrincipalPayment({
          loanId,
          clientName: `${loanData.client.firstName} ${loanData.client.lastName}`,
          amountPaid: amountInCents,
          remainingPrincipal: remainingP,
          isFullyPaid: loanData.status === "PAID" || remainingP === 0,
          performedBy: operator.label
        }).catch(err => console.error("Telegram principal payment notification error:", err))
      }
    } catch (telErr) {
      console.error("Telegram error:", telErr)
    }

    revalidatePath(`/prestamos/${loanId}`)
    revalidatePath("/prestamos")
    revalidatePath("/", "layout")
    
    return result
  } catch (error: any) {
    console.error("Error en abono a capital:", error)
    return { error: error.message || "Error procesando el abono a capital" }
  }
}

export async function updateLoan(loanId: string, data: any) {
  try {
    const session = await getSession()
    if (!session || session.role !== "ADMIN") {
      return { error: "Solo los administradores pueden editar préstamos." }
    }

    // Validar que no tenga pagos
    const paymentsCount = await prisma.payment.count({
      where: { loanId, deletedAt: null }
    })
    if (paymentsCount > 0) {
      return { error: "No se puede editar un préstamo que ya cuenta con pagos registrados. Utilice la opción de Refinanciar o Abono a Capital." }
    }

    const {
      principalAmount,
      interestRate,
      interestAmount,
      interestType,
      secretaryCommission,
      secretaryCommissionType,
      companyCommission,
      companyCommissionType,
      upfrontFee,
      startDate,
      numberOfInstallments,
      investors,
      referredByInvestorId
    } = data

    // Calcular amortización
    const installmentsData: any[] = []
    let currentDate = new Date(startDate)
    
    let isFrench = false
    let fixedInstallmentAmount = 0
    let totalInterestInCents = 0
    let iRate = (interestRate || 0) / 100

    if (interestAmount && interestAmount > 0) {
      totalInterestInCents = interestAmount
      const pPart = Math.round(principalAmount / numberOfInstallments)
      const iPart = Math.round(totalInterestInCents / numberOfInstallments)
      fixedInstallmentAmount = pPart + iPart
    } else if (numberOfInstallments === 1) {
      totalInterestInCents = Math.round(principalAmount * iRate)
      fixedInstallmentAmount = principalAmount + totalInterestInCents
    } else {
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

      if (interestAmount && interestAmount > 0) {
        interestPart = Math.round(totalInterestInCents / numberOfInstallments)
        principalPart = Math.round(principalAmount / numberOfInstallments)
      } else if (numberOfInstallments === 1) {
        interestPart = totalInterestInCents
        principalPart = principalAmount
      } else if (isFrench) {
        interestPart = Math.round(outstandingPrincipal * iRate)
        principalPart = fixedInstallmentAmount - interestPart
        
        if (i === numberOfInstallments) {
          principalPart = outstandingPrincipal
          fixedInstallmentAmount = principalPart + interestPart
        }
        outstandingPrincipal -= principalPart
      }

      installmentsData.push({
        loanId,
        installmentNumber: i,
        dueDate: new Date(currentDate),
        expectedAmount: fixedInstallmentAmount,
        principalPart: principalPart,
        interestPart: interestPart,
        status: "PENDING",
        amountPaid: 0,
        lateFee: 0
      })
    }

    const endDate = installmentsData[installmentsData.length - 1].dueDate

    await prisma.$transaction(async (tx) => {
      // 1. Eliminar cuotas anteriores
      await tx.installment.deleteMany({
        where: { loanId }
      })

      // 2. Eliminar asignaciones de inversionistas previas
      await tx.investorLoan.deleteMany({
        where: { loanId }
      })

      // 3. Crear nuevas cuotas
      await tx.installment.createMany({
        data: installmentsData
      })

      // 4. Crear nuevas relaciones de inversionistas
      if (investors && investors.length > 0) {
        await tx.investorLoan.createMany({
          data: investors.map((inv: any) => ({
            loanId,
            investorId: inv.investorId,
            investedAmount: inv.investedAmount,
            participationPercentage: inv.participationPercentage
          }))
        })
      }

      // 5. Actualizar préstamo
      await tx.loan.update({
        where: { id: loanId },
        data: {
          principalAmount,
          interestRate: interestRate || 0,
          interestType: interestType as any,
          interestAmount: interestAmount || null,
          secretaryCommission: secretaryCommission || 0,
          secretaryCommissionType: secretaryCommissionType as any,
          companyCommission: companyCommission || 0,
          companyCommissionType: companyCommissionType as any,
          upfrontFee: upfrontFee || 0,
          startDate: new Date(startDate),
          endDate,
          numberOfInstallments,
          installmentAmount: fixedInstallmentAmount,
          referredByInvestorId: referredByInvestorId || null
        }
      })
    })

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "UPDATE_LOAN",
        entityType: "Loan",
        entityId: loanId,
        details: JSON.stringify({ principal: principalAmount, installments: numberOfInstallments })
      }
    })

    revalidatePath(`/prestamos/${loanId}`)
    revalidatePath("/prestamos")
    return { success: true }
  } catch (error: any) {
    console.error("Error updating loan:", error)
    return { error: error.message || "Error al actualizar el préstamo" }
  }
}

export async function uploadPromissoryNote(loanId: string, fileDataUrl: string, fileName: string) {
  try {
    const session = await getSession()
    if (!session) {
      return { error: "No autorizado. Inicie sesión nuevamente." }
    }

    if (!fileDataUrl || !fileName) {
      return { error: "Archivo no válido o vacío." }
    }

    const updatedLoan = await prisma.loan.update({
      where: { id: loanId },
      data: {
        promissoryNoteUrl: fileDataUrl,
        promissoryNoteName: fileName,
        promissoryNoteUploadedAt: new Date()
      },
      include: { client: true }
    })

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "UPLOAD_PROMISSORY_NOTE",
        entityType: "Loan",
        entityId: loanId,
        details: JSON.stringify({ fileName, client: `${updatedLoan.client.firstName} ${updatedLoan.client.lastName}` })
      }
    })

    revalidatePath(`/prestamos/${loanId}`)
    revalidatePath("/prestamos")
    return { success: true }
  } catch (error: any) {
    console.error("Error uploading promissory note:", error)
    return { error: "Error al guardar el pagaré firmado" }
  }
}

export async function deletePromissoryNote(loanId: string) {
  try {
    const session = await getSession()
    if (!session) {
      return { error: "No autorizado" }
    }

    await prisma.loan.update({
      where: { id: loanId },
      data: {
        promissoryNoteUrl: null,
        promissoryNoteName: null,
        promissoryNoteUploadedAt: null
      }
    })

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "DELETE_PROMISSORY_NOTE",
        entityType: "Loan",
        entityId: loanId,
        details: JSON.stringify({ loanId })
      }
    })

    revalidatePath(`/prestamos/${loanId}`)
    revalidatePath("/prestamos")
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting promissory note:", error)
    return { error: "Error al eliminar el pagaré" }
  }
}

export async function getInternalSettlementData(loanIds: string[]) {
  try {
    const loans = await prisma.loan.findMany({
      where: { id: { in: loanIds } },
      include: {
        client: true,
        installments: { orderBy: { installmentNumber: "asc" } },
        investors: { include: { investor: true } }
      }
    })

    if (!loans || loans.length === 0) {
      return { error: "No se encontraron los préstamos especificados" }
    }

    const results: any[] = []

    for (const loan of loans) {
      // Obtener logs de abonos extraordinarios a capital
      const principalPaymentsLog = await prisma.auditLog.findMany({
        where: {
          entityId: loan.id,
          action: "PRINCIPAL_PAYMENT"
        },
        orderBy: { createdAt: 'desc' }
      })

      const principalPaymentsFormatted = principalPaymentsLog.map(log => {
        let details: { amount: number, type: string, distributions?: { investorName: string, percentage: number, amount: number }[] } = { amount: 0, type: "" }
        try { details = JSON.parse(log.details) } catch (e) {}
        
        const distributions = details.distributions && details.distributions.length > 0
          ? details.distributions
          : loan.investors.length > 0
            ? loan.investors.map(inv => ({
                investorName: inv.investor.name,
                percentage: inv.participationPercentage,
                amount: Math.round((details.amount || 0) * (inv.participationPercentage / 100))
              }))
            : [{
                investorName: "Capital Propio (JyJ)",
                percentage: 100,
                amount: details.amount || 0
              }]

        return {
          id: log.id,
          date: log.createdAt ? log.createdAt.toISOString() : new Date().toISOString(),
          amount: details.amount || 0,
          type: details.type || "PRINCIPAL",
          distributions
        }
      })

      const totalPrincipalFromAbonos = principalPaymentsFormatted.reduce((sum, p) => sum + p.amount, 0)
      const paidInstallments = loan.installments.filter(i => i.status === "PAID")
      const totalPrincipalFromPaidInstallments = paidInstallments.reduce((sum, i) => sum + i.principalPart, 0)
      const totalPrincipalPaidTotal = totalPrincipalFromPaidInstallments + totalPrincipalFromAbonos
      const totalInterestPaidTotal = paidInstallments.reduce((sum, i) => sum + i.interestPart, 0)
      const totalLateFeesPaidTotal = paidInstallments.reduce((sum, i) => sum + (i.lateFee || 0), 0)
      const totalPaid = paidInstallments.reduce((sum, i) => sum + i.amountPaid, 0) + totalPrincipalFromAbonos

      // Outstanding principal
      const pendingInstallments = loan.installments.filter(i => i.status !== "PAID")
      const outstandingPrincipal = pendingInstallments.reduce((sum, i) => sum + (i.principalPart || 0), 0)

      // Comisiones
      let secretaryCommissionTotal = 0
      let companyCommissionTotal = 0
      let referrerCommissionTotal = 0

      paidInstallments.forEach(i => {
        const totalInstInterest = i.interestPart + (i.lateFee || 0)
        let secComm = 0
        if (loan.secretaryCommissionType === "FIXED_AMOUNT") {
          secComm = Math.round(loan.secretaryCommission / (loan.numberOfInstallments || 1))
        } else if (loan.secretaryCommissionType === "PERCENTAGE_PRINCIPAL") {
          const tot = loan.principalAmount * (loan.secretaryCommission / 100)
          secComm = Math.round(tot / (loan.numberOfInstallments || 1))
        } else {
          secComm = Math.round(totalInstInterest * (loan.secretaryCommission / 100))
        }
        let jyjComm = 0
        if (loan.companyCommissionType === "FIXED_AMOUNT") {
          jyjComm = Math.round(loan.companyCommission / (loan.numberOfInstallments || 1))
        } else if (loan.companyCommissionType === "PERCENTAGE_PRINCIPAL") {
          jyjComm = Math.round((loan.principalAmount * (loan.companyCommission / 100)) / (loan.numberOfInstallments || 1))
        } else {
          jyjComm = Math.round(totalInstInterest * (loan.companyCommission / 100))
        }

        const refComm = loan.referredByInvestorId ? Math.round(totalInstInterest * 0.03) : 0

        secretaryCommissionTotal += secComm
        companyCommissionTotal += jyjComm
        referrerCommissionTotal += refComm
      })

      const netInvestorYieldTotal = Math.max(0, (totalInterestPaidTotal + totalLateFeesPaidTotal) - secretaryCommissionTotal - companyCommissionTotal - referrerCommissionTotal)

      // Inversionistas
      let investorsSummary = loan.investors.map(inv => {
        const investedAmount = inv.investedAmount || Math.round(loan.principalAmount * (inv.participationPercentage / 100))
        const principalReturnedFromInstallments = Math.round(totalPrincipalFromPaidInstallments * (inv.participationPercentage / 100))
        const principalReturnedFromAbonos = principalPaymentsFormatted.reduce((sum, p) => {
          const dist = p.distributions.find(d => d.investorName === inv.investor.name)
          return sum + (dist ? dist.amount : 0)
        }, 0)
        const totalPrincipalReturned = principalReturnedFromInstallments + principalReturnedFromAbonos
        const interestEarned = Math.round(netInvestorYieldTotal * (inv.participationPercentage / 100))
        const totalLiquidated = totalPrincipalReturned + interestEarned
        const pendingPrincipal = Math.max(0, investedAmount - totalPrincipalReturned)

        return {
          id: inv.investorId,
          name: inv.investor.name,
          percentage: inv.participationPercentage,
          investedAmount,
          principalReturnedFromInstallments,
          principalReturnedFromAbonos,
          totalPrincipalReturned,
          interestEarned,
          totalLiquidated,
          pendingPrincipal
        }
      })

      if (investorsSummary.length === 0) {
        const totalPrincipalReturned = totalPrincipalPaidTotal
        const pendingPrincipal = Math.max(0, loan.principalAmount - totalPrincipalReturned)
        investorsSummary = [{
          id: "jyj-propio",
          name: "Capital Propio (JyJ Préstamos)",
          percentage: 100,
          investedAmount: loan.principalAmount,
          principalReturnedFromInstallments: totalPrincipalFromPaidInstallments,
          principalReturnedFromAbonos: totalPrincipalFromAbonos,
          totalPrincipalReturned,
          interestEarned: netInvestorYieldTotal,
          totalLiquidated: totalPrincipalReturned + netInvestorYieldTotal,
          pendingPrincipal
        }]
      }

      results.push({
        loanId: loan.id,
        clientName: `${loan.client.firstName} ${loan.client.lastName}`,
        idDocument: loan.client.idDocument,
        clientPhone: loan.client.phone || null,
        clientAddress: loan.client.address || null,
        status: loan.status,
        startDate: loan.startDate ? loan.startDate.toISOString() : new Date().toISOString(),
        settlementDate: new Date().toISOString(),
        principalAmount: loan.principalAmount,
        interestRate: loan.interestRate || 0,
        interestType: loan.interestType,
        numberOfInstallments: loan.numberOfInstallments,
        installmentAmount: loan.installmentAmount,
        totalPaid,
        totalPrincipalPaid: totalPrincipalPaidTotal,
        totalInterestPaid: totalInterestPaidTotal,
        totalLateFeesPaid: totalLateFeesPaidTotal,
        outstandingPrincipal,
        secretaryCommissionTotal,
        companyCommissionTotal,
        referrerCommissionTotal,
        netInvestorYieldTotal,
        principalPayments: principalPaymentsFormatted,
        investorsSummary
      })
    }

    return { success: true, data: JSON.parse(JSON.stringify(results)) }
  } catch (error: any) {
    console.error("Error in getInternalSettlementData:", error)
    return { error: error.message || "Error al obtener datos de liquidación interna" }
  }
}


