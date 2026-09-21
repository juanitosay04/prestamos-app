"use server"

import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"

// ─── Guard: solo inversionistas autenticados ────────────────────────────────
async function getInvestorSession() {
  const session = await getSession()
  if (!session || session.role !== "INVESTOR" || !session.investorId) {
    throw new Error("Acceso no autorizado")
  }
  return session
}

// ─── Resumen de cartera del inversionista ───────────────────────────────────
export async function getMyPortfolio() {
  const session = await getInvestorSession()
  const investorId = session.investorId!

  const investorLoans = await prisma.investorLoan.findMany({
    where: { investorId },
    include: {
      loan: {
        include: {
          client: { select: { firstName: true, lastName: true } },
          installments: { orderBy: { installmentNumber: "asc" } },
          investors: true
        }
      }
    }
  })

  const loans = investorLoans.map((il) => {
    const loan = il.loan
    const pct = il.participationPercentage / 100

    const paidInstallments = loan.installments.filter(i => i.status === "PAID")
    const pendingInstallments = loan.installments.filter(i => i.status !== "PAID")

    // Calcular comisiones para estimar rendimiento neto
    const totalInterestFromPaid = paidInstallments.reduce((sum, i) => sum + i.interestPart + (i.lateFee || 0), 0)
    let secComm = 0, jyjComm = 0
    paidInstallments.forEach(i => {
      const totalInt = i.interestPart + (i.lateFee || 0)
      if (loan.secretaryCommissionType === "FIXED_AMOUNT") secComm += Math.round(loan.secretaryCommission / loan.numberOfInstallments)
      else if (loan.secretaryCommissionType === "PERCENTAGE_PRINCIPAL") secComm += Math.round((loan.principalAmount * loan.secretaryCommission / 100) / loan.numberOfInstallments)
      else secComm += Math.round(totalInt * loan.secretaryCommission / 100)
      if (loan.companyCommissionType === "FIXED_AMOUNT") jyjComm += Math.round(loan.companyCommission / loan.numberOfInstallments)
      else if (loan.companyCommissionType === "PERCENTAGE_PRINCIPAL") jyjComm += Math.round((loan.principalAmount * loan.companyCommission / 100) / loan.numberOfInstallments)
      else jyjComm += Math.round(totalInt * loan.companyCommission / 100)
    })
    const refComm = loan.referredByInvestorId ? Math.round(totalInterestFromPaid * 0.03) : 0
    const netYield = Math.max(0, totalInterestFromPaid - secComm - jyjComm - refComm)

    const capitalReturned = Math.round(paidInstallments.reduce((s, i) => s + i.principalPart, 0) * pct)
    const interestEarned = Math.round(netYield * pct)
    const capitalPending = Math.round(pendingInstallments.reduce((s, i) => s + i.principalPart, 0) * pct)
    const interestPending = Math.round(pendingInstallments.reduce((s, i) => s + i.interestPart, 0) * pct)

    return {
      loanId: loan.id,
      clientFirstName: loan.client.firstName,
      status: loan.status,
      participationPct: il.participationPercentage,
      investedAmount: il.investedAmount,
      totalInstallments: loan.numberOfInstallments,
      paidInstallments: paidInstallments.length,
      progressPct: Math.round((paidInstallments.length / loan.numberOfInstallments) * 100),
      capitalReturned,
      interestEarned,
      capitalPending,
      interestPending,
      nextDueDate: pendingInstallments[0]?.dueDate ?? null,
      startDate: loan.startDate,
      endDate: loan.endDate
    }
  })

  const totals = {
    totalInvested: loans.reduce((s, l) => s + l.investedAmount, 0),
    totalCapitalReturned: loans.reduce((s, l) => s + l.capitalReturned, 0),
    totalInterestEarned: loans.reduce((s, l) => s + l.interestEarned, 0),
    totalCapitalPending: loans.reduce((s, l) => s + l.capitalPending, 0),
    totalInterestPending: loans.reduce((s, l) => s + l.interestPending, 0),
    activeLoans: loans.filter(l => l.status === "ACTIVE" || l.status === "OVERDUE").length,
    completedLoans: loans.filter(l => l.status === "PAID").length,
  }

  return { loans, totals }
}

// ─── Detalle cuota a cuota de un préstamo para el inversionista ─────────────
export async function getMyLoanDetail(loanId: string) {
  const session = await getInvestorSession()
  const investorId = session.investorId!

  const il = await prisma.investorLoan.findFirst({
    where: { investorId, loanId },
    include: {
      loan: {
        include: {
          client: { select: { firstName: true, lastName: true, phone: true } },
          installments: { orderBy: { installmentNumber: "asc" } },
          investors: true
        }
      }
    }
  })

  if (!il) return null

  const loan = il.loan
  const pct = il.participationPercentage / 100

  // Calcular comisiones por cuota
  const installments = loan.installments.map(inst => {
    const totalInt = inst.interestPart + (inst.lateFee || 0)
    let secComm = 0, jyjComm = 0
    if (loan.secretaryCommissionType === "FIXED_AMOUNT") secComm = Math.round(loan.secretaryCommission / loan.numberOfInstallments)
    else if (loan.secretaryCommissionType === "PERCENTAGE_PRINCIPAL") secComm = Math.round((loan.principalAmount * loan.secretaryCommission / 100) / loan.numberOfInstallments)
    else secComm = Math.round(totalInt * loan.secretaryCommission / 100)
    if (loan.companyCommissionType === "FIXED_AMOUNT") jyjComm = Math.round(loan.companyCommission / loan.numberOfInstallments)
    else if (loan.companyCommissionType === "PERCENTAGE_PRINCIPAL") jyjComm = Math.round((loan.principalAmount * loan.companyCommission / 100) / loan.numberOfInstallments)
    else jyjComm = Math.round(totalInt * loan.companyCommission / 100)
    const refComm = loan.referredByInvestorId ? Math.round(totalInt * 0.03) : 0
    const netYield = Math.max(0, totalInt - secComm - jyjComm - refComm)

    const myCapital = Math.round(inst.principalPart * pct)
    const myInterest = Math.round(netYield * pct)
    const myTotal = myCapital + myInterest

    return {
      id: inst.id,
      number: inst.installmentNumber,
      dueDate: inst.dueDate,
      status: inst.status,
      myCapital,
      myInterest,
      myTotal,
      lateFee: inst.lateFee || 0
    }
  })

  return {
    loanId: loan.id,
    clientFirstName: loan.client.firstName,
    clientPhone: loan.client.phone,
    status: loan.status,
    participationPct: il.participationPercentage,
    investedAmount: il.investedAmount,
    startDate: loan.startDate,
    endDate: loan.endDate,
    numberOfInstallments: loan.numberOfInstallments,
    installments
  }
}

// ─── Admin: Crear acceso al portal para un inversionista ────────────────────
export async function createInvestorPortalAccess(investorId: string, email: string, password: string, name: string) {
  const session = await getSession()
  if (!session || session.role !== "ADMIN") {
    return { error: "Solo el administrador puede crear accesos" }
  }

  if (!email || !password || password.length < 6) {
    return { error: "Email y contraseña (mínimo 6 caracteres) son requeridos" }
  }

  try {
    // Verificar que el inversionista existe
    const investor = await prisma.investor.findUnique({ where: { id: investorId } })
    if (!investor) return { error: "Inversionista no encontrado" }

    // Verificar si ya tiene acceso
    const existing = await prisma.user.findFirst({ where: { investorId } })
    if (existing) return { error: "Este inversionista ya tiene acceso al portal" }

    const passwordHash = await bcrypt.hash(password, 10)
    await prisma.user.create({
      data: {
        name: name || investor.name,
        email: email.toLowerCase().trim(),
        passwordHash,
        role: "INVESTOR",
        investorId
      }
    })

    revalidatePath(`/inversionistas/${investorId}`)
    return { success: true }
  } catch (error: any) {
    if (error.code === "P2002") return { error: "Ese email ya está registrado" }
    return { error: "Error al crear el acceso: " + error.message }
  }
}

// ─── Admin: Resetear contraseña de un inversionista ─────────────────────────
export async function resetInvestorPortalPassword(investorId: string, newPassword: string) {
  const session = await getSession()
  if (!session || session.role !== "ADMIN") {
    return { error: "Solo el administrador puede resetear contraseñas" }
  }

  if (!newPassword || newPassword.length < 6) {
    return { error: "La contraseña debe tener mínimo 6 caracteres" }
  }

  try {
    const user = await prisma.user.findFirst({ where: { investorId } })
    if (!user) return { error: "Este inversionista no tiene acceso al portal aún" }

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })

    return { success: true }
  } catch (error: any) {
    return { error: "Error al resetear contraseña: " + error.message }
  }
}

// ─── Admin: Obtener info del acceso de un inversionista ─────────────────────
export async function getInvestorPortalAccess(investorId: string) {
  const user = await prisma.user.findFirst({
    where: { investorId },
    select: { id: true, email: true, name: true, createdAt: true }
  })
  return user
}
