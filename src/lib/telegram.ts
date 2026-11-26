import { getTelegramSettings } from "@/app/actions/settings"

/**
 * Función genérica para enviar mensajes HTML formateados a Telegram
 */
export async function sendTelegramMessage(htmlText: string): Promise<boolean> {
  try {
    const settings = await getTelegramSettings()
    
    if (!settings.enabled || !settings.botToken || !settings.chatId) {
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

const nowCol = () =>
  new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" })

const RODOLFO_FOOTER = `\n────────────────────\n🤖 <i>Rodolfo • JyJ Préstamos</i>`

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

  const message =
    `🚀 <b>NUEVO PRÉSTAMO DESEMBOLSADO</b>\n` +
    `────────────────────\n` +
    `👤 <b>Cliente:</b> ${data.clientName} (CC: <code>${data.idDocument}</code>)\n` +
    `💰 <b>Capital Prestado:</b> <code>${formatMoney(data.principalAmount)}</code>\n` +
    `📅 <b>Plan de Pago:</b> ${data.numberOfInstallments} cuotas (${periodicity})\n` +
    `💵 <b>Valor Cuota:</b> <code>${formatMoney(data.installmentAmount)}</code>\n` +
    `🤝 <b>Fondeo:</b> ${data.investorsSummary || "Capital Propio JyJ"}\n` +
    (data.performedBy ? `✍️ <b>Registrado por:</b> ${data.performedBy}\n` : "") +
    `🆔 <b>Ref:</b> <code>#${data.loanId.slice(-6).toUpperCase()}</code>\n` +
    `⏱️ <i>${nowCol()}</i>` +
    RODOLFO_FOOTER

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

  const message =
    `🔄 <b>PRÉSTAMO REFINANCIADO</b>\n` +
    `────────────────────\n` +
    `👤 <b>Cliente:</b> ${data.clientName}\n` +
    `📊 <b>Saldo Anterior:</b> <code>${formatMoney(data.oldOutstandingPrincipal)}</code>\n` +
    `💰 <b>Nuevo Capital Total:</b> <code>${formatMoney(data.newPrincipal)}</code>\n` +
    `📅 <b>Nuevo Plan:</b> ${data.numberOfInstallments} cuotas ${periodicity} de <code>${formatMoney(data.installmentAmount)}</code>\n` +
    (data.performedBy ? `✍️ <b>Refinanciado por:</b> ${data.performedBy}\n` : "") +
    `✨ <b>Nueva Ref:</b> <code>#${data.newLoanId.slice(-6).toUpperCase()}</code>\n` +
    `⏱️ <i>${nowCol()}</i>` +
    RODOLFO_FOOTER

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
  const statusText = data.isFullyPaid 
    ? `🎉 <b>¡PRÉSTAMO TOTALMENTE PAGADO Y LIQUIDADO!</b>` 
    : `✅ <b>Cuota ${data.installmentNumber} de ${data.totalInstallments} Pagada</b>`

  const message =
    `💵 <b>RECAUDO DE CUOTA</b>\n` +
    `────────────────────\n` +
    `👤 <b>Cliente:</b> ${data.clientName}\n` +
    `💸 <b>Monto Recibido:</b> <code>${formatMoney(data.amountPaid)}</code>\n` +
    (data.lateFee > 0 ? `⚠️ <b>Mora Incluida:</b> <code>${formatMoney(data.lateFee)}</code>\n` : "") +
    `📌 <b>Progreso:</b> ${statusText}\n` +
    `📉 <b>Saldo Restante:</b> <code>${formatMoney(data.remainingLoanBalance)}</code>\n` +
    (data.performedBy ? `👤 <b>Cobrado por:</b> ${data.performedBy}\n` : "") +
    `🆔 <b>Ref:</b> <code>#${data.loanId.slice(-6).toUpperCase()}</code>\n` +
    `⏱️ <i>${nowCol()}</i>` +
    RODOLFO_FOOTER

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
  const clientList = data.clients.slice(0, 6).map(c => `• ${c}`).join("\n")
  const moreText = data.clients.length > 6 ? `\n• ... y ${data.clients.length - 6} más` : ""

  const message =
    `📦 <b>RECAUDO MASIVO PROCESADO</b>\n` +
    `────────────────────\n` +
    `📋 <b>Cuotas Cobradas:</b> ${data.processedCount} cuotas\n` +
    `💰 <b>Total Recaudado:</b> <code>${formatMoney(data.totalAmount)}</code>\n` +
    (data.performedBy ? `👤 <b>Procesado por:</b> ${data.performedBy}\n` : "") +
    `👥 <b>Clientes:\n</b>${clientList}${moreText}\n` +
    `⏱️ <i>${nowCol()}</i>` +
    RODOLFO_FOOTER

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
  const message =
    `🏦 <b>ABONO DIRECTO A CAPITAL</b>\n` +
    `────────────────────\n` +
    `👤 <b>Cliente:</b> ${data.clientName}\n` +
    `💰 <b>Abono Recibido:</b> <code>${formatMoney(data.amountPaid)}</code>\n` +
    `📉 <b>Capital Pendiente:</b> <code>${formatMoney(data.remainingPrincipal)}</code>\n` +
    (data.performedBy ? `👤 <b>Registrado por:</b> ${data.performedBy}\n` : "") +
    (data.isFullyPaid ? `🎉 <b>¡PRÉSTAMO LIQUIDADO AL 100%!</b>\n` : "") +
    `🆔 <b>Ref:</b> <code>#${data.loanId.slice(-6).toUpperCase()}</code>\n` +
    `⏱️ <i>${nowCol()}</i>` +
    RODOLFO_FOOTER

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
  const message =
    `🚨 <b>ALERTA: PRÉSTAMO DECLARADO EN PÉRDIDA</b>\n` +
    `────────────────────\n` +
    `👤 <b>Cliente:</b> ${data.clientName}\n` +
    `💥 <b>Capital Original:</b> <code>${formatMoney(data.principalAmount)}</code>\n` +
    (data.performedBy ? `⚠️ <b>Marcado por:</b> ${data.performedBy}\n` : "") +
    `🆔 <b>Ref:</b> <code>#${data.loanId.slice(-6).toUpperCase()}</code>\n` +
    `⏱️ <i>${nowCol()}</i>` +
    RODOLFO_FOOTER

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
  const message =
    `✨ <b>PRÉSTAMO REACTIVADO</b>\n` +
    `────────────────────\n` +
    `👤 <b>Cliente:</b> ${data.clientName}\n` +
    (data.performedBy ? `👤 <b>Reactivado por:</b> ${data.performedBy}\n` : "") +
    `🆔 <b>Ref:</b> <code>#${data.loanId.slice(-6).toUpperCase()}</code>\n` +
    `⏱️ <i>${nowCol()}</i>` +
    RODOLFO_FOOTER

  return sendTelegramMessage(message)
}

/**
 * 📅 Notificación de Resumen Diario / Cierre del Día (Por pagar hoy + Próximos a vencer + Vencidos/En Mora)
 */
export async function notifyDailySummary(data: {
  dueToday: Array<{ clientName: string, amount: number, installmentNumber: number }>
  upcoming?: Array<{ clientName: string, amount: number, installmentNumber: number, daysUntil: number }>
  overdue: Array<{ clientName: string, amount: number, lateFee?: number, daysOverdue: number, installmentNumber?: number }>
  isClosingReport?: boolean
}) {
  const headerTitle = data.isClosingReport
    ? `🌙 <b>CIERRE DEL DÍA • REPORTE DE COBROS Y VENCIMIENTOS</b>`
    : `☀️ <b>BUENOS DÍAS EQUIPO • REPORTE DE COBROS Y VENCIMIENTOS</b>`

  let message =
    `${headerTitle}\n` +
    `📅 <b>Fecha:</b> ${new Date().toLocaleDateString("es-CO", { timeZone: "America/Bogota", weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n` +
    `────────────────────\n\n`

  // 1. Los que están por pagar en el día (HOY)
  if (data.dueToday.length > 0) {
    const totalToday = data.dueToday.reduce((sum, item) => sum + item.amount, 0)
    const todayHeader = data.isClosingReport
      ? `⏰ <b>Pendientes de HOY al cierre — Ya es hora de pago (${data.dueToday.length} • ${formatMoney(totalToday)}):</b>\n`
      : `🟢 <b>Por pagar en el día de HOY (${data.dueToday.length} • ${formatMoney(totalToday)}):</b>\n`
    message += todayHeader
    data.dueToday.forEach((item, idx) => {
      message += `${idx + 1}. <b>${item.clientName}</b>: <code>${formatMoney(item.amount)}</code> (Cuota #${item.installmentNumber})\n`
    })
    message += `\n`
  } else {
    message += `🟢 <i>No hay cuotas pendientes por pagar del día de hoy.</i>\n\n`
  }

  // 2. Los que van a vencer próximamente (próximos 3 días)
  const upcomingList = data.upcoming || []
  if (upcomingList.length > 0) {
    const totalUpcoming = upcomingList.reduce((sum, item) => sum + item.amount, 0)
    message += `🟡 <b>Próximos a vencer (${upcomingList.length} • ${formatMoney(totalUpcoming)}):</b>\n`
    upcomingList.forEach((item, idx) => {
      const whenLabel = item.daysUntil === 1 ? "vence mañana" : `vence en ${item.daysUntil} días`
      message += `${idx + 1}. <b>${item.clientName}</b>: <code>${formatMoney(item.amount)}</code> (Cuota #${item.installmentNumber} • <i>${whenLabel}</i>)\n`
    })
    message += `\n`
  } else {
    message += `🟡 <i>No hay cuotas próximas a vencer en los próximos 3 días.</i>\n\n`
  }

  // 3. Los que ya vencieron / están en mora
  if (data.overdue.length > 0) {
    const totalOverdue = data.overdue.reduce((sum, item) => sum + item.amount + (item.lateFee || 0), 0)
    message += `🔴 <b>Ya vencieron / En MORA (${data.overdue.length} • ${formatMoney(totalOverdue)}):</b>\n`
    data.overdue.forEach((item, idx) => {
      const moraText = item.lateFee && item.lateFee > 0 ? ` + mora <code>${formatMoney(item.lateFee)}</code> = <b>${formatMoney(item.amount + item.lateFee)}</b>` : ""
      const ctaText = item.installmentNumber ? `Cuota #${item.installmentNumber} • ` : ""
      message += `${idx + 1}. <b>${item.clientName}</b>: <code>${formatMoney(item.amount)}</code>${moraText} (<i>${ctaText}${item.daysOverdue} día(s) de mora</i>)\n`
    })
    message += `\n`
  } else {
    message += `✨ <i>¡Excelente! No hay clientes con cuotas vencidas hoy.</i>\n\n`
  }

  message += `💬 <i>Puedes escribirme o enviarme un audio diciendo "Rodolfo..." para consultar cualquier cliente.</i>` + RODOLFO_FOOTER

  return sendTelegramMessage(message)
}

/**
 * 👤 Notificación de Nuevo Cliente Creado
 */
export async function notifyClientCreated(data: {
  clientId: string
  clientName: string
  idDocument: string
  phone: string
  performedBy?: string
}) {
  const message =
    `👤 <b>NUEVO CLIENTE REGISTRADO</b>\n` +
    `────────────────────\n` +
    `👤 <b>Nombre:</b> ${data.clientName}\n` +
    `📄 <b>Cédula:</b> <code>${data.idDocument}</code>\n` +
    `📱 <b>Teléfono:</b> ${data.phone}\n` +
    (data.performedBy ? `✍️ <b>Registrado por:</b> ${data.performedBy}\n` : "") +
    `⏱️ <i>${nowCol()}</i>` +
    RODOLFO_FOOTER

  return sendTelegramMessage(message)
}

/**
 * 🗑️ Notificación de Cliente Eliminado
 */
export async function notifyClientDeleted(data: {
  clientId: string
  clientName: string
  idDocument: string
  performedBy?: string
}) {
  const message =
    `🗑️ <b>CLIENTE ELIMINADO</b>\n` +
    `────────────────────\n` +
    `👤 <b>Nombre:</b> ${data.clientName} (CC: <code>${data.idDocument}</code>)\n` +
    (data.performedBy ? `❌ <b>Eliminado por:</b> ${data.performedBy}\n` : "") +
    `⏱️ <i>${nowCol()}</i>` +
    RODOLFO_FOOTER

  return sendTelegramMessage(message)
}

/**
 * 👥 Notificación de Nuevo Inversionista Creado
 */
export async function notifyInvestorCreated(data: {
  investorId: string
  investorName: string
  phone?: string
  email?: string
  performedBy?: string
}) {
  const message =
    `👥 <b>NUEVO INVERSIONISTA REGISTRADO</b>\n` +
    `────────────────────\n` +
    `👤 <b>Inversionista:</b> ${data.investorName}\n` +
    (data.phone ? `📱 <b>Teléfono:</b> ${data.phone}\n` : "") +
    (data.email ? `📧 <b>Email:</b> ${data.email}\n` : "") +
    (data.performedBy ? `✍️ <b>Registrado por:</b> ${data.performedBy}\n` : "") +
    `⏱️ <i>${nowCol()}</i>` +
    RODOLFO_FOOTER

  return sendTelegramMessage(message)
}

/**
 * 🗑️ Notificación de Inversionista Eliminado
 */
export async function notifyInvestorDeleted(data: {
  investorId: string
  investorName: string
  performedBy?: string
}) {
  const message =
    `🗑️ <b>INVERSIONISTA ELIMINADO</b>\n` +
    `────────────────────\n` +
    `👤 <b>Inversionista:</b> ${data.investorName}\n` +
    (data.performedBy ? `❌ <b>Eliminado por:</b> ${data.performedBy}\n` : "") +
    `⏱️ <i>${nowCol()}</i>` +
    RODOLFO_FOOTER

  return sendTelegramMessage(message)
}

/**
 * 💸 Notificación de Gasto Registrado
 */
export async function notifyExpenseCreated(data: {
  expenseId: string
  description: string
  amount: number
  category: string
  performedBy?: string
}) {
  const categoryMap: Record<string, string> = {
    OFFICE: "Oficina / Papelería",
    SALARY: "Nómina / Salario",
    UTILITIES: "Servicios Públicos",
    OTHER: "Otros Gastos"
  }
  const category = categoryMap[data.category] || data.category

  const message =
    `💸 <b>NUEVO GASTO REGISTRADO</b>\n` +
    `────────────────────\n` +
    `📝 <b>Concepto:</b> ${data.description}\n` +
    `💰 <b>Monto:</b> <code>${formatMoney(data.amount)}</code>\n` +
    `📁 <b>Categoría:</b> ${category}\n` +
    (data.performedBy ? `✍️ <b>Registrado por:</b> ${data.performedBy}\n` : "") +
    `⏱️ <i>${nowCol()}</i>` +
    RODOLFO_FOOTER

  return sendTelegramMessage(message)
}

/**
 * 🗑️ Notificación de Gasto Eliminado
 */
export async function notifyExpenseDeleted(data: {
  expenseId: string
  description: string
  amount: number
  performedBy?: string
}) {
  const message =
    `🗑️ <b>GASTO ELIMINADO</b>\n` +
    `────────────────────\n` +
    `📝 <b>Concepto:</b> ${data.description}\n` +
    `💰 <b>Monto:</b> <code>${formatMoney(data.amount)}</code>\n` +
    (data.performedBy ? `❌ <b>Eliminado por:</b> ${data.performedBy}\n` : "") +
    `⏱️ <i>${nowCol()}</i>` +
    RODOLFO_FOOTER

  return sendTelegramMessage(message)
}

/**
 * ✏️ Notificación de Cliente Actualizado
 */
export async function notifyClientUpdated(data: {
  clientId: string
  clientName: string
  idDocument: string
  phone: string
  performedBy?: string
}) {
  const message =
    `✏️ <b>CLIENTE ACTUALIZADO</b>\n` +
    `────────────────────\n` +
    `👤 <b>Cliente:</b> ${data.clientName}\n` +
    `📄 <b>Cédula:</b> <code>${data.idDocument}</code>\n` +
    `📱 <b>Teléfono:</b> ${data.phone}\n` +
    (data.performedBy ? `✍️ <b>Modificado por:</b> ${data.performedBy}\n` : "") +
    `⏱️ <i>${nowCol()}</i>` +
    RODOLFO_FOOTER

  return sendTelegramMessage(message)
}

/**
 * 🚫 Notificación de Cambio en Lista Negra de Cliente
 */
export async function notifyClientBlacklisted(data: {
  clientName: string
  idDocument: string
  isBlacklisted: boolean
  performedBy?: string
}) {
  const title = data.isBlacklisted
    ? `🚫 <b>CLIENTE ENVIADO A LISTA NEGRA</b>`
    : `✅ <b>CLIENTE REMOVIDO DE LISTA NEGRA</b>`

  const message =
    `${title}\n` +
    `────────────────────\n` +
    `👤 <b>Cliente:</b> ${data.clientName} (CC: <code>${data.idDocument}</code>)\n` +
    (data.performedBy ? `👮‍♂️ <b>Acción realizada por:</b> ${data.performedBy}\n` : "") +
    `⏱️ <i>${nowCol()}</i>` +
    RODOLFO_FOOTER

  return sendTelegramMessage(message)
}

/**
 * ✏️ Notificación de Inversionista Actualizado
 */
export async function notifyInvestorUpdated(data: {
  investorName: string
  phone?: string
  transferKey?: string
  performedBy?: string
}) {
  const message =
    `✏️ <b>INVERSIONISTA ACTUALIZADO</b>\n` +
    `────────────────────\n` +
    `👤 <b>Inversionista:</b> ${data.investorName}\n` +
    (data.phone ? `📱 <b>Teléfono:</b> ${data.phone}\n` : "") +
    (data.transferKey ? `🔑 <b>Llave:</b> <code>${data.transferKey}</code>\n` : "") +
    (data.performedBy ? `✍️ <b>Modificado por:</b> ${data.performedBy}\n` : "") +
    `⏱️ <i>${nowCol()}</i>` +
    RODOLFO_FOOTER

  return sendTelegramMessage(message)
}

/**
 * ✏️ Notificación de Préstamo Editado
 */
export async function notifyLoanUpdated(data: {
  loanId: string
  clientName: string
  principalAmount: number
  numberOfInstallments: number
  installmentAmount: number
  performedBy?: string
}) {
  const message =
    `✏️ <b>PRÉSTAMO EDITADO</b>\n` +
    `────────────────────\n` +
    `👤 <b>Cliente:</b> ${data.clientName}\n` +
    `💰 <b>Capital:</b> <code>${formatMoney(data.principalAmount)}</code>\n` +
    `📅 <b>Cuotas:</b> ${data.numberOfInstallments} cuotas de <code>${formatMoney(data.installmentAmount)}</code>\n` +
    (data.performedBy ? `✍️ <b>Editado por:</b> ${data.performedBy}\n` : "") +
    `🆔 <b>Ref:</b> <code>#${data.loanId.slice(-6).toUpperCase()}</code>\n` +
    `⏱️ <i>${nowCol()}</i>` +
    RODOLFO_FOOTER

  return sendTelegramMessage(message)
}

/**
 * 📄 Notificación de Pagaré Subido o Eliminado
 */
export async function notifyPromissoryNoteEvent(data: {
  loanId: string
  clientName: string
  action: "UPLOADED" | "DELETED"
  fileName?: string
  performedBy?: string
}) {
  const title =
    data.action === "UPLOADED"
      ? `📄 <b>PAGARÉ FIRMADO SUBIDO AL SISTEMA</b>`
      : `🗑️ <b>PAGARÉ ELIMINADO DEL PRÉSTAMO</b>`

  const message =
    `${title}\n` +
    `────────────────────\n` +
    `👤 <b>Cliente:</b> ${data.clientName}\n` +
    (data.fileName ? `📎 <b>Archivo:</b> <code>${data.fileName}</code>\n` : "") +
    (data.performedBy ? `✍️ <b>Realizado por:</b> ${data.performedBy}\n` : "") +
    `🆔 <b>Ref:</b> <code>#${data.loanId.slice(-6).toUpperCase()}</code>\n` +
    `⏱️ <i>${nowCol()}</i>` +
    RODOLFO_FOOTER

  return sendTelegramMessage(message)
}

