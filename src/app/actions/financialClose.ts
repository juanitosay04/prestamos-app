"use server"

import { prisma } from "@/lib/prisma"

export async function runMonthlyCloseCheck() {
  try {
    const today = new Date()
    
    // We check if we need to close the PREVIOUS month (if today is between day 1 and 10 of new month)
    // AND we also check if we need to close the CURRENT month (if today is the last day of the month)
    
    const isLastDayOfMonth = (new Date(today.getFullYear(), today.getMonth() + 1, 0)).getDate() === today.getDate()
    
    let targetMonthsToClose: { month: number, year: number }[] = []
    
    // Always check previous month just in case they didn't log in on the last day
    let prevMonth = today.getMonth() - 1
    let prevYear = today.getFullYear()
    if (prevMonth < 0) {
      prevMonth = 11
      prevYear -= 1
    }
    targetMonthsToClose.push({ month: prevMonth, year: prevYear })
    
    if (isLastDayOfMonth) {
      targetMonthsToClose.push({ month: today.getMonth(), year: today.getFullYear() })
    }

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

    for (const target of targetMonthsToClose) {
      const monthStr = monthNames[target.month]
      const yearStr = target.year.toString()
      const descriptionTag = `Cierre ${monthStr} ${yearStr}`
      
      // Check if already closed
      const existingClose = await prisma.expense.findFirst({
        where: {
          description: { contains: descriptionTag },
          deletedAt: null
        }
      })

      if (!existingClose) {
        // Run closure for this month
        await executeClosure(target.month, target.year, descriptionTag)
      }
    }
    
    return { success: true }
  } catch (error) {
    console.error("Error in runMonthlyCloseCheck:", error)
    return { error: "Failed to run monthly close" }
  }
}

async function executeClosure(monthIndex: number, year: number, descriptionTag: string) {
  const startDate = new Date(year, monthIndex, 1, 0, 0, 0, 0)
  const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999)

  // 1. Find all payments in this month that were for installments
  const payments = await prisma.payment.findMany({
    where: {
      type: "INSTALLMENT",
      paymentDate: {
        gte: startDate,
        lte: endDate
      },
      deletedAt: null
    },
    include: {
      installment: true,
      loan: {
        include: {
          investors: true
        }
      }
    }
  })

  let totalJyjProfit = 0

  // 2. Calculate JyJ profit exactly as the UI breakdown does
  for (const payment of payments) {
    if (!payment.installment) continue

    const totalInterest = payment.installment.interestPart + payment.lateFeeApplied
    
    let secretaryCommissionAmount = 0
    if (payment.loan.secretaryCommissionType === "FIXED_AMOUNT") {
      secretaryCommissionAmount = Math.round(payment.loan.secretaryCommission / payment.loan.numberOfInstallments)
    } else if (payment.loan.secretaryCommissionType === "PERCENTAGE_PRINCIPAL") {
      const totalCommission = payment.loan.principalAmount * (payment.loan.secretaryCommission / 100)
      secretaryCommissionAmount = Math.round(totalCommission / payment.loan.numberOfInstallments)
    } else {
      secretaryCommissionAmount = Math.round(totalInterest * ((payment.loan.secretaryCommission || 0) / 100))
    }

    let jyjCommissionAmount = 0
    if (payment.loan.companyCommissionType === "FIXED_AMOUNT") {
      jyjCommissionAmount = Math.round(payment.loan.companyCommission / payment.loan.numberOfInstallments)
    } else if (payment.loan.companyCommissionType === "PERCENTAGE_PRINCIPAL") {
      jyjCommissionAmount = Math.round((payment.loan.principalAmount * (payment.loan.companyCommission / 100)) / payment.loan.numberOfInstallments)
    } else {
      jyjCommissionAmount = Math.round(totalInterest * ((payment.loan.companyCommission || 0) / 100))
    }
    
    const remainingInterest = Math.max(0, totalInterest - secretaryCommissionAmount - jyjCommissionAmount)
    
    const investorsTotalPercentage = payment.loan.investors.reduce((sum, inv) => sum + inv.participationPercentage, 0)
    const jyjFundingPercentage = Math.max(0, 100 - investorsTotalPercentage)
    
    const jyjInterestFromFunding = Math.round(remainingInterest * (jyjFundingPercentage / 100))
    
    const profitForThisPayment = jyjCommissionAmount + jyjInterestFromFunding
    totalJyjProfit += profitForThisPayment
  }

  // 3. Calculate 16% payroll for owners
  if (totalJyjProfit > 0) {
    const payrollAmount = Math.round(totalJyjProfit * 0.16)

    // 4. Register Expense
    await prisma.expense.create({
      data: {
        description: `Pago de nómina a dueños de la empresa (Juanes) - ${descriptionTag}`,
        amount: payrollAmount,
        category: "SALARY",
        date: new Date() // El gasto se registra con la fecha en que se corrió el proceso
      }
    })
  } else {
    // Si la ganancia fue 0, igual registramos el cierre para que no lo vuelva a correr
    await prisma.expense.create({
      data: {
        description: `Cierre en cero - Pago de nómina a dueños (Juanes) - ${descriptionTag}`,
        amount: 0,
        category: "SALARY",
        date: new Date()
      }
    })
  }
}
