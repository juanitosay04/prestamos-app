"use server"

import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { getDaysDiffFromColombiaToday, getColombiaCurrentHour, getColombiaTodayStr } from "@/lib/dates"
import { notifyDailySummary } from "@/lib/telegram"

export async function getNotifications() {
  try {
    const now = new Date()
    const todayStr = getColombiaTodayStr(now)
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
    const telegramDueToday: Array<{ clientName: string, amount: number, installmentNumber: number }> = []
    const telegramUpcoming: Array<{ clientName: string, amount: number, installmentNumber: number, daysUntil: number }> = []
    const telegramOverdue: Array<{ clientName: string, amount: number, lateFee: number, daysOverdue: number, installmentNumber: number }> = []

    for (const inst of installments) {
      const diffDays = getDaysDiffFromColombiaToday(inst.dueDate, now)
      const pendingAmount = Math.max(0, inst.expectedAmount - (inst.amountPaid || 0))
      const clientFullName = `${inst.loan.client.firstName} ${inst.loan.client.lastName}`

      // Clasificar para el reporte automático de Rodolfo en Telegram (Por pagar hoy, Próximos a vencer, Vencidos)
      if (diffDays === 0) {
        telegramDueToday.push({
          clientName: clientFullName,
          amount: pendingAmount,
          installmentNumber: inst.installmentNumber
        })
      } else if (diffDays >= 1 && diffDays <= 3) {
        telegramUpcoming.push({
          clientName: clientFullName,
          amount: pendingAmount,
          installmentNumber: inst.installmentNumber,
          daysUntil: diffDays
        })
      } else if (diffDays < 0) {
        const daysLate = Math.abs(diffDays)
        const autoMora = inst.loan.autoLateFee !== false ? daysLate * 2000 * 100 : 0
        const lateFee = Math.max(inst.lateFee || 0, autoMora)
        telegramOverdue.push({
          clientName: clientFullName,
          amount: pendingAmount,
          lateFee,
          daysOverdue: daysLate,
          installmentNumber: inst.installmentNumber
        })
      }

      // En la campanita web: no notificar días antes de la fecha de pago
      if (diffDays > 0) {
        continue
      }

      // Si vence HOY, solo notificar en la campanita al momento de cerrar el día (no antes en la mañana/tarde)
      if (diffDays === 0 && !isEndOfDayCloseTime) {
        continue
      }

      const type = diffDays < 0 ? "OVERDUE" : "TODAY"

      notifications.push({
        id: inst.id,
        loanId: inst.loanId,
        clientName: clientFullName,
        installmentNumber: inst.installmentNumber,
        expectedAmount: pendingAmount,
        dueDate: inst.dueDate,
        type,
        daysLate: diffDays < 0 ? Math.abs(diffDays) : 0,
        daysUpcoming: 0,
        isSystem: false
      })
    }

    // Envío automático de Rodolfo al grupo de Telegram al momento de cerrar el día (1 vez por día desde las 5:00 PM Colombia)
    if (isEndOfDayCloseTime && (telegramDueToday.length > 0 || telegramUpcoming.length > 0 || telegramOverdue.length > 0)) {
      try {
        const settingKey = "LAST_TELEGRAM_CLOSING_REPORT_DATE"
        const lastReport = await prisma.setting.findUnique({ where: { key: settingKey } })
        if (!lastReport || lastReport.value !== todayStr) {
          await prisma.setting.upsert({
            where: { key: settingKey },
            create: { key: settingKey, value: todayStr },
            update: { value: todayStr }
          })
          await notifyDailySummary({
            dueToday: telegramDueToday,
            upcoming: telegramUpcoming,
            overdue: telegramOverdue,
            isClosingReport: true
          })
        }
      } catch (telErr) {
        console.error("Error sending automatic closing Telegram summary:", telErr)
      }
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
