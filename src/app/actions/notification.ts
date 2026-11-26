"use server"

import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { getDaysDiffFromColombiaToday, getColombiaCurrentHour } from "@/lib/dates"

export async function getNotifications() {
  try {
    const now = new Date()
    const currentColombiaHour = getColombiaCurrentHour(now)
    // El aviso de cobro del día actual solo se activa al momento de cerrar el día (desde las 5:00 PM / 17:00 hora Colombia)
    const isEndOfDayCloseTime = currentColombiaHour >= 17

    // Buscar cuotas pendientes/parciales únicamente de préstamos activos o en mora (excluyendo eliminados, pagados, refinanciados o en pérdida)
    const installments = await prisma.installment.findMany({
      where: {
        status: { in: ["PENDING", "PARTIAL", "OVERDUE", "LATE"] },
        loan: {
          deletedAt: null,
          status: { in: ["ACTIVE", "OVERDUE"] }
        }
      },
      include: {
        loan: {
          include: {
            client: true
          }
        }
      },
      orderBy: {
        dueDate: "asc"
      }
    })

    const notifications: any[] = []

    for (const inst of installments) {
      const diffDays = getDaysDiffFromColombiaToday(inst.dueDate, now)

      // No notificar días antes de la fecha de pago
      if (diffDays > 0) {
        continue
      }

      // Si vence HOY, solo notificar al momento de cerrar el día (no antes en la mañana/tarde)
      if (diffDays === 0 && !isEndOfDayCloseTime) {
        continue
      }

      const type = diffDays < 0 ? "OVERDUE" : "TODAY"
      const pendingAmount = Math.max(0, inst.expectedAmount - (inst.amountPaid || 0))

      notifications.push({
        id: inst.id,
        loanId: inst.loanId,
        clientName: `${inst.loan.client.firstName} ${inst.loan.client.lastName}`,
        installmentNumber: inst.installmentNumber,
        expectedAmount: pendingAmount,
        dueDate: inst.dueDate,
        type,
        daysLate: diffDays < 0 ? Math.abs(diffDays) : 0,
        daysUpcoming: 0,
        isSystem: false
      })
    }

    const session = await getSession()
    if (session && session.role === "ADMIN") {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      const auditLogs = await prisma.auditLog.findMany({
        where: {
          action: { in: ["CREATE_LOAN", "CREATE_CLIENT"] },
          userId: { not: session.userId },
          createdAt: { gte: yesterday }
        },
        include: { user: true },
        orderBy: { createdAt: "desc" }
      })

      const systemAlerts = auditLogs.map(log => ({
        id: log.id,
        loanId: log.entityType === "Loan" ? log.entityId : "",
        clientName: `Acción de ${log.user.name}`,
        installmentNumber: 0,
        expectedAmount: 0,
        dueDate: log.createdAt,
        type: "SYSTEM_ALERT",
        daysLate: 0,
        daysUpcoming: 0,
        isSystem: true,
        message: log.action === "CREATE_CLIENT" ? "Nuevo Cliente Registrado" : "Nuevo Préstamo Creado"
      }))

      return [...systemAlerts, ...notifications]
    }

    return notifications
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return []
  }
}
