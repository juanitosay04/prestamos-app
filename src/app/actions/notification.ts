"use server"

import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"

export async function getNotifications() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const threeDaysFromNow = new Date(today)
    threeDaysFromNow.setDate(today.getDate() + 3)
    threeDaysFromNow.setHours(23, 59, 59, 999)

    // Buscar cuotas pendientes o en mora que estén vencidas, venzan hoy, o venzan en los próximos 3 días
    const installments = await prisma.installment.findMany({
      where: {
        status: { in: ["PENDING", "OVERDUE"] },
        dueDate: {
          lte: threeDaysFromNow
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

    const notifications = installments.map(inst => {
      const due = new Date(inst.dueDate)
      due.setHours(0, 0, 0, 0)
      
      const diffTime = due.getTime() - today.getTime()
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
      
      let type = ""
      if (diffDays < 0) type = "OVERDUE"
      else if (diffDays === 0) type = "TODAY"
      else type = "UPCOMING"

      return {
        id: inst.id,
        loanId: inst.loanId,
        clientName: `${inst.loan.client.firstName} ${inst.loan.client.lastName}`,
        installmentNumber: inst.installmentNumber,
        expectedAmount: inst.expectedAmount,
        dueDate: inst.dueDate,
        type,
        daysLate: diffDays < 0 ? Math.abs(diffDays) : 0,
        daysUpcoming: diffDays > 0 ? diffDays : 0,
        isSystem: false
      }
    })

    const session = await getSession()
    if (session && session.role === "ADMIN") {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      
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
