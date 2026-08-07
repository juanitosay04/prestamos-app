"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { notifyPaymentReceived, notifyBatchPayments } from "@/lib/telegram"

export async function payInstallment(installmentId: string, lateFeeInCents: number = 0, amountPaidInCents?: number) {
  try {
    const installment = await prisma.installment.findUnique({
      where: { id: installmentId },
      include: { loan: true }
    })

    if (!installment) {
      return { error: "Cuota no encontrada" }
    }
    
    if (installment.loan.status === "REFINANCED") {
      return { error: "No se pueden recibir pagos en préstamos refinanciados." }
    }

    if (installment.status === "PAID") {
      return { error: "Esta cuota ya está pagada" }
    }

    const currentAmountPaid = installment.amountPaid
    const expectedAmount = installment.expectedAmount

    // If amountPaidInCents is not provided, assume they pay the remaining balance
    const paymentAmount = amountPaidInCents !== undefined ? amountPaidInCents : (expectedAmount - currentAmountPaid)

    if (paymentAmount <= 0) {
      return { error: "El monto a pagar debe ser mayor a 0" }
    }

    const newAmountPaid = currentAmountPaid + paymentAmount
    const newStatus = newAmountPaid >= expectedAmount ? "PAID" : "PARTIAL"

    // Usar una transacción para actualizar la cuota y crear el registro de pago
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar la cuota a pagada o parcial
      await tx.installment.update({
        where: { id: installmentId },
        data: {
          status: newStatus,
          amountPaid: newAmountPaid >= expectedAmount ? expectedAmount : newAmountPaid,
          lateFee: installment.lateFee + lateFeeInCents, // Acumula la mora
          updatedAt: new Date()
        }
      })

      // 2. Crear el registro del Payment
      await tx.payment.create({
        data: {
          loanId: installment.loanId,
          installmentId: installment.id,
          amountPaid: paymentAmount,
          paymentDate: new Date(),
          isPartial: newStatus === "PARTIAL",
          lateFeeApplied: lateFeeInCents
        }
      })

      // 3. Revisar si todas las cuotas del préstamo están pagadas
      const pendingInstallments = await tx.installment.count({
        where: {
          loanId: installment.loanId,
          status: { not: "PAID" }
        }
      })

      // Si no quedan cuotas pendientes, marcar el préstamo como PAGADO
      if (pendingInstallments === 0) {
        await tx.loan.update({
          where: { id: installment.loanId },
          data: { status: "PAID" }
        })
        await generateSecretaryCommissionExpense(tx, installment.loanId)
      }
    })

    // Notificación Telegram
    try {
      const loanInfo = await prisma.loan.findUnique({
        where: { id: installment.loanId },
        include: {
          client: true,
          installments: true
        }
      })
      if (loanInfo) {
        const totalInst = loanInfo.installments.length
        const remainingBalance = loanInfo.installments
          .filter(i => i.status !== "PAID")
          .reduce((sum, i) => sum + (i.expectedAmount - i.amountPaid), 0)
        
        notifyPaymentReceived({
          loanId: loanInfo.id,
          clientName: `${loanInfo.client.firstName} ${loanInfo.client.lastName}`,
          installmentNumber: installment.installmentNumber,
          totalInstallments: totalInst,
          amountPaid: paymentAmount,
          lateFee: lateFeeInCents,
          remainingLoanBalance: remainingBalance,
          isFullyPaid: remainingBalance === 0
        }).catch(err => console.error("Telegram payment notification error:", err))
      }
    } catch (telErr) {
      console.error("Telegram notification error in payInstallment:", telErr)
    }

    revalidatePath(`/prestamos/${installment.loanId}`)
    revalidatePath(`/prestamos`)
    revalidatePath(`/`)
    
    return { success: true }
  } catch (error) {
    console.error("Error paying installment:", error)
    return { error: "Error al registrar el pago" }
  }
}

export async function generateSecretaryCommissionExpense(tx: any, loanId: string) {
  const loan = await tx.loan.findUnique({
    where: { id: loanId },
    include: {
      client: true,
      installments: {
        where: { status: "PAID" }
      }
    }
  })

  if (!loan || loan.secretaryCommission <= 0) return

  // Prevent double payment
  const existingExpense = await tx.expense.findFirst({
    where: { description: { contains: `Comisión de Secretaria - Préstamo ${loan.id}` } }
  })
  if (existingExpense) return

  let commissionAmount = 0

  if (loan.secretaryCommissionType === "FIXED_AMOUNT") {
    commissionAmount = loan.secretaryCommission
  } else if (loan.secretaryCommissionType === "PERCENTAGE_PRINCIPAL") {
    commissionAmount = Math.round(loan.principalAmount * (loan.secretaryCommission / 100))
  } else {
    // PERCENTAGE_INTEREST
    const totalInterestCollected = loan.installments.reduce((sum: number, inst: any) => sum + inst.interestPart + (inst.lateFee || 0), 0)
    commissionAmount = Math.round(totalInterestCollected * (loan.secretaryCommission / 100))
  }

  if (commissionAmount > 0) {
    await tx.expense.create({
      data: {
        description: `Comisión de Secretaria - Préstamo ${loan.id} (${loan.client.firstName} ${loan.client.lastName})`,
        amount: commissionAmount,
        category: "SALARY",
        date: new Date()
      }
    })
  }
}

export async function processBatchInstallments(loanIds: string[]) {
  try {
    const results = []
    
    // We process each sequentially to avoid transaction deadlocks
    for (const loanId of loanIds) {
      // Find the first pending installment for this loan
      const installment = await prisma.installment.findFirst({
        where: { 
          loanId: loanId,
          status: "PENDING"
        },
        orderBy: { installmentNumber: 'asc' },
        include: { 
          loan: { 
            include: { 
              client: true,
              investors: { include: { investor: true } } 
            } 
          } 
        }
      })

      if (!installment) {
        results.push({ loanId, success: false, error: "No hay cuotas pendientes" })
        continue
      }

      let referredByInvestorName = null
      if (installment.loan.referredByInvestorId) {
        const refInv = await prisma.investor.findUnique({ where: { id: installment.loan.referredByInvestorId } })
        if (refInv) referredByInvestorName = refInv.name
      }

      const payResult = await payInstallment(installment.id, 0) // Late fee 0 por defecto en batch
      
      if (payResult.error) {
        results.push({ loanId, success: false, error: payResult.error })
      } else {
        results.push({ 
          loanId, 
          success: true, 
          clientName: `${installment.loan.client.firstName} ${installment.loan.client.lastName}`,
          idDocument: installment.loan.client.idDocument,
          amountPaid: installment.expectedAmount,
          installmentNumber: installment.installmentNumber,
          
          // Breakdown Info
          principalAmount: installment.loan.principalAmount,
          numberOfInstallments: installment.loan.numberOfInstallments,
          secretaryCommissionType: installment.loan.secretaryCommissionType,
          secretaryCommission: installment.loan.secretaryCommission,
          principalPart: installment.principalPart,
          interestPart: installment.interestPart,
          lateFee: installment.lateFee,
          investors: installment.loan.investors || [],
          referredByInvestor: referredByInvestorName ? { name: referredByInvestorName } : null
        })
      }
    }

    // Notificación Telegram para recaudo masivo
    try {
      const successful = results.filter(r => r.success)
      if (successful.length > 0) {
        const totalAmount = successful.reduce((sum, r) => sum + (r.amountPaid || 0), 0)
        const clientNames = successful.map(r => r.clientName).filter(Boolean) as string[]
        notifyBatchPayments({
          processedCount: successful.length,
          totalAmount,
          clients: clientNames
        }).catch(err => console.error("Telegram batch payment notification error:", err))
      }
    } catch (telErr) {
      console.error("Telegram notification error in processBatchInstallments:", telErr)
    }

    revalidatePath(`/prestamos`)
    revalidatePath(`/`)
    
    return { success: true, results }
  } catch (error) {
    console.error("Error processing batch installments:", error)
    return { error: "Error interno procesando los cobros en lote" }
  }
}

export async function getBatchInstallmentsInfo(loanIds: string[]) {
  try {
    const results = []
    
    for (const loanId of loanIds) {
      const installment = await prisma.installment.findFirst({
        where: { 
          loanId: loanId,
          status: "PENDING"
        },
        orderBy: { installmentNumber: 'asc' },
        include: { 
          loan: { 
            include: { 
              client: true,
              investors: { include: { investor: true } } 
            } 
          } 
        }
      })

      if (installment) {
        let referredByInvestorName = null
        if (installment.loan.referredByInvestorId) {
          const refInv = await prisma.investor.findUnique({ where: { id: installment.loan.referredByInvestorId } })
          if (refInv) referredByInvestorName = refInv.name
        }

        results.push({ 
          loanId, 
          success: true, 
          clientName: `${installment.loan.client.firstName} ${installment.loan.client.lastName}`,
          idDocument: installment.loan.client.idDocument,
          amountPaid: installment.expectedAmount,
          installmentNumber: installment.installmentNumber,
          
          // Breakdown Info
          principalAmount: installment.loan.principalAmount,
          numberOfInstallments: installment.loan.numberOfInstallments,
          secretaryCommissionType: installment.loan.secretaryCommissionType,
          secretaryCommission: installment.loan.secretaryCommission,
          principalPart: installment.principalPart,
          interestPart: installment.interestPart,
          lateFee: installment.lateFee,
          investors: installment.loan.investors || [],
          referredByInvestor: referredByInvestorName ? { name: referredByInvestorName } : null
        })
      }
    }
    
    return { success: true, results }
  } catch (error) {
    console.error("Error fetching batch info:", error)
    return { error: "Error interno obteniendo información de cuotas" }
  }
}
