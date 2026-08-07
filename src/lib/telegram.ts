import { getTelegramSettings } from "@/app/actions/settings"

/**
 * Función genérica para enviar mensajes HTML formateados a Telegram
 */
export async function sendTelegramMessage(htmlText: string): Promise<boolean> {
  try {
    const settings = await getTelegramSettings()
    
    if (!settings.enabled || !settings.botToken || !settings.chatId) {
      // Notificaciones deshabilitadas o sin configurar
      return false
    }

    const url = `https://api.telegram.org/bot${settings.botToken}/sendMessage`
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: settings.chatId,
        text: htmlText,
        parse_mode: "HTML"
      })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.warn("Telegram API Warning:", err)
      return false
    }

    return true
  } catch (error) {
    console.error("Error al enviar notificación a Telegram:", error)
    return false
  }
}

const formatMoney = (cents: number) => {
  return `$${(cents / 100).toLocaleString("es-CO", { maximumFractionDigits: 0 })}`
}

/**
 * 🚀 Notificación de Nuevo Préstamo Creado
 */
export async function notifyLoanCreated(data: {
  loanId: string
  clientName: string
  idDocument: string
  principalAmount: number
  numberOfInstallments: number
  installmentAmount: number
  interestType: string
  investorsSummary?: string
  performedBy?: string
}) {
  const periodicityMap: Record<string, string> = {
    DAILY: "Diario",
    WEEKLY: "Semanal",
    BIWEEKLY: "Quincenal",
    MONTHLY: "Mensual",
    CUSTOM: "Personalizado"
  }
  const periodicity = periodicityMap[data.interestType] || data.interestType

  const message = `🚀 <b>NUEVO PRÉSTAMO REGISTRADO</b>\n\n` +
    `👤 <b>Cliente:</b> ${data.clientName} (CC: ${data.idDocument})\n` +
    `💰 <b>Monto Prestado:</b> ${formatMoney(data.principalAmount)}\n` +
    `📅 <b>Modalidad:</b> ${periodicity} (${data.numberOfInstallments} cuotas)\n` +
    `💵 <b>Valor Cuota:</b> ${formatMoney(data.installmentAmount)}\n` +
    `🤝 <b>Fondeo:</b> ${data.investorsSummary || "Fondeo Propio"}\n` +
    (data.performedBy ? `✍️ <b>Registrado por:</b> ${data.performedBy}\n` : "") +
    `🆔 <b>ID:</b> <code>${data.loanId}</code>\n\n` +
    `⏱️ <i>Registrado el ${new Date().toLocaleString("es-CO")}</i>`

  return sendTelegramMessage(message)
}

/**
 * 🔄 Notificación de Refinanciación
 */
export async function notifyLoanRefinanced(data: {
  newLoanId: string
  oldLoanId: string
  clientName: string
  oldOutstandingPrincipal: number
  newPrincipal: number
  numberOfInstallments: number
  installmentAmount: number
  interestType: string
  performedBy?: string
}) {
  const periodicityMap: Record<string, string> = {
    DAILY: "Diario",
    WEEKLY: "Semanal",
    BIWEEKLY: "Quincenal",
    MONTHLY: "Mensual"
  }
  const periodicity = periodicityMap[data.interestType] || data.interestType

  const message = `🔄 <b>PRÉSTAMO REFINANCIADO</b>\n\n` +
    `👤 <b>Cliente:</b> ${data.clientName}\n` +
    `📊 <b>Saldo Insoluto Anterior:</b> ${formatMoney(data.oldOutstandingPrincipal)}\n` +
    `💰 <b>Nuevo Capital Total:</b> ${formatMoney(data.newPrincipal)}\n` +
    `📅 <b>Nuevo Plan:</b> ${data.numberOfInstallments} cuotas ${periodicity} de ${formatMoney(data.installmentAmount)}\n` +
    (data.performedBy ? `🔄 <b>Refinanciado por:</b> ${data.performedBy}\n` : "") +
    `🔗 <b>Préstamo Anterior:</b> <code>${data.oldLoanId}</code>\n` +
    `✨ <b>Nuevo Préstamo:</b> <code>${data.newLoanId}</code>\n\n` +
    `⏱️ <i>Refinanciado el ${new Date().toLocaleString("es-CO")}</i>`

  return sendTelegramMessage(message)
}

/**
 * 💵 Notificación de Pago de Cuota Individual
 */
export async function notifyPaymentReceived(data: {
  loanId: string
  clientName: string
  installmentNumber: number
  totalInstallments: number
  amountPaid: number
  lateFee: number
  remainingLoanBalance: number
  isFullyPaid: boolean
  performedBy?: string
}) {
  let statusText = data.isFullyPaid 
    ? `🎉 <b>¡PRÉSTAMO TOTALMENTE PAGADO Y LIQUIDADO!</b>` 
    : `✅ <b>Cuota ${data.installmentNumber} de ${data.totalInstallments} Cancelada</b>`

  const message = `💵 <b>PAGO DE CUOTA RECIBIDO</b>\n\n` +
    `👤 <b>Cliente:</b> ${data.clientName}\n` +
    `💸 <b>Monto Recibido:</b> ${formatMoney(data.amountPaid)}\n` +
    (data.lateFee > 0 ? `⚠️ <b>Mora Cobrada:</b> ${formatMoney(data.lateFee)}\n` : "") +
    `📌 <b>Estado:</b> ${statusText}\n` +
    `📉 <b>Saldo Restante Estimado:</b> ${formatMoney(data.remainingLoanBalance)}\n` +
    (data.performedBy ? `👤 <b>Cobrado por:</b> ${data.performedBy}\n` : "") +
    `🆔 <b>Préstamo:</b> <code>${data.loanId}</code>\n\n` +
    `⏱️ <i>Registrado el ${new Date().toLocaleString("es-CO")}</i>`

  return sendTelegramMessage(message)
}

/**
 * 📦 Notificación de Cobro Masivo de Cuotas
 */
export async function notifyBatchPayments(data: {
  processedCount: number
  totalAmount: number
  clients: string[]
  performedBy?: string
}) {
  const clientList = data.clients.slice(0, 5).map(c => `• ${c}`).join("\n")
  const moreText = data.clients.length > 5 ? `\n• ... y ${data.clients.length - 5} más` : ""

  const message = `📦 <b>RECAUDO MASIVO PROCESADO</b>\n\n` +
    `📋 <b>Cuotas Cobradas:</b> ${data.processedCount} cuotas\n` +
    `💰 <b>Total Recaudado:</b> ${formatMoney(data.totalAmount)}\n` +
    (data.performedBy ? `👤 <b>Operado / Cobrado por:</b> ${data.performedBy}\n` : "") +
    `👥 <b>Clientes:\n</b>${clientList}${moreText}\n\n` +
    `⏱️ <i>Procesado el ${new Date().toLocaleString("es-CO")}</i>`

  return sendTelegramMessage(message)
}

/**
 * 🏦 Notificación de Abono Extraordinario a Capital
 */
export async function notifyPrincipalPayment(data: {
  loanId: string
  clientName: string
  amountPaid: number
  remainingPrincipal: number
  isFullyPaid: boolean
  performedBy?: string
}) {
  const message = `🏦 <b>ABONO DIRECTO A CAPITAL</b>\n\n` +
    `👤 <b>Cliente:</b> ${data.clientName}\n` +
    `💰 <b>Abono a Capital:</b> ${formatMoney(data.amountPaid)}\n` +
    `📉 <b>Capital Insoluto Restante:</b> ${formatMoney(data.remainingPrincipal)}\n` +
    (data.performedBy ? `👤 <b>Cobrado / Registrado por:</b> ${data.performedBy}\n` : "") +
    (data.isFullyPaid ? `🎉 <b>¡PRÉSTAMO LIQUIDADO AL 100%!</b>\n` : "") +
    `🆔 <b>Préstamo:</b> <code>${data.loanId}</code>\n\n` +
    `⏱️ <i>Registrado el ${new Date().toLocaleString("es-CO")}</i>`

  return sendTelegramMessage(message)
}

/**
 * ⚠️ Notificación de Préstamo en Mora / Castigado
 */
export async function notifyLoanDefaulted(data: {
  loanId: string
  clientName: string
  principalAmount: number
  performedBy?: string
}) {
  const message = `🚨 <b>ALERTA: PRÉSTAMO DECLARADO EN PÉRDIDA</b>\n\n` +
    `👤 <b>Cliente:</b> ${data.clientName}\n` +
    `💥 <b>Capital Original:</b> ${formatMoney(data.principalAmount)}\n` +
    (data.performedBy ? `⚠️ <b>Marcado por:</b> ${data.performedBy}\n` : "") +
    `🆔 <b>ID Préstamo:</b> <code>${data.loanId}</code>\n\n` +
    `⚠️ <i>Marcado como cartera en pérdida el ${new Date().toLocaleString("es-CO")}</i>`

  return sendTelegramMessage(message)
}

/**
 * ✨ Notificación de Préstamo Reactivado
 */
export async function notifyLoanRevived(data: {
  loanId: string
  clientName: string
  performedBy?: string
}) {
  const message = `✨ <b>PRÉSTAMO REACTIVADO</b>\n\n` +
    `👤 <b>Cliente:</b> ${data.clientName}\n` +
    (data.performedBy ? `👤 <b>Reactivado por:</b> ${data.performedBy}\n` : "") +
    `🆔 <b>ID Préstamo:</b> <code>${data.loanId}</code>\n\n` +
    `⏱️ <i>Reactivado el ${new Date().toLocaleString("es-CO")}</i>`

  return sendTelegramMessage(message)
}

/**
 * 📅 Notificación de Resumen Matutino Diario (Cobros de Hoy + Moras)
 */
export async function notifyDailySummary(data: {
  dueToday: Array<{ clientName: string, amount: number, installmentNumber: number }>
  overdue: Array<{ clientName: string, amount: number, daysOverdue: number }>
}) {
  let message = `☀️ <b>RESUMEN DIARIO DE COBROS Y MORAS</b>\n` +
    `📅 <b>Fecha:</b> ${new Date().toLocaleDateString("es-CO", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n`

  if (data.dueToday.length > 0) {
    const totalToday = data.dueToday.reduce((sum, item) => sum + item.amount, 0)
    message += `🟢 <b>Cobros para HOY (${data.dueToday.length} - ${formatMoney(totalToday)}):</b>\n`
    data.dueToday.forEach((item, idx) => {
      message += `${idx + 1}. <b>${item.clientName}</b>: ${formatMoney(item.amount)} (Cuota ${item.installmentNumber})\n`
    })
    message += `\n`
  } else {
    message += `🟢 <i>No hay vencimientos de cuotas programados para hoy.</i>\n\n`
  }

  if (data.overdue.length > 0) {
    const totalOverdue = data.overdue.reduce((sum, item) => sum + item.amount, 0)
    message += `🔴 <b>Cobros en MORA (${data.overdue.length} - ${formatMoney(totalOverdue)}):</b>\n`
    data.overdue.forEach((item, idx) => {
      message += `${idx + 1}. <b>${item.clientName}</b>: ${formatMoney(item.amount)} (Retraso: ${item.daysOverdue} días)\n`
    })
    message += `\n`
  } else {
    message += `✨ <i>¡Excelente! No hay cuotas vencidas pendientes.</i>\n\n`
  }

  message += `📊 <i>JyJ Préstamos - Sistema Automático</i>`

  return sendTelegramMessage(message)
}
