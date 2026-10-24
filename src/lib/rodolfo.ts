import { prisma } from "@/lib/prisma"
import { getTelegramSettings } from "@/app/actions/settings"

const fmt = (cents: number) =>
  `$${Math.round(cents / 100).toLocaleString("es-CO", { maximumFractionDigits: 0 })}`

const fmtDate = (d: Date | string | null | undefined) => {
  if (!d) return "N/A"
  return new Date(d).toLocaleDateString("es-CO", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const periodicityMap: Record<string, string> = {
  DAILY: "Diario",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
  CUSTOM: "Personalizado",
}

const statusMap: Record<string, string> = {
  ACTIVE: "Activo",
  OVERDUE: "En Mora",
  PAID: "Pagado / Liquidado",
  DEFAULTED: "En Pérdida / Castigado",
  REFINANCED: "Refinanciado",
}

/**
 * Construye una radiografía completa y en tiempo real de la base de datos
 * para que Rodolfo pueda responder cualquier pregunta con precisión exacta.
 */
export async function buildRodolfoDatabaseContext(): Promise<string> {
  const now = new Date()
  const bogotaNowStr = now.toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  // Fecha de hoy en Colombia (YYYY-MM-DD)
  const bogotaDateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now) // "YYYY-MM-DD"

  const [clients, loans, investors, recentPayments, recentExpenses] = await Promise.all([
    prisma.client.findMany({
      where: { deletedAt: null },
      orderBy: { firstName: "asc" },
    }),
    prisma.loan.findMany({
      where: { deletedAt: null },
      include: {
        client: true,
        installments: { orderBy: { installmentNumber: "asc" } },
        investors: { include: { investor: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.investor.findMany({
      where: { deletedAt: null },
      include: {
        investments: {
          include: {
            loan: {
              include: {
                client: true,
                installments: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.payment.findMany({
      where: { deletedAt: null },
      include: {
        loan: { include: { client: true } },
        installment: true,
      },
      orderBy: { paymentDate: "desc" },
      take: 25,
    }),
    prisma.expense.findMany({
      where: { deletedAt: null },
      orderBy: { date: "desc" },
      take: 15,
    }),
  ])

  // Clasificación de préstamos y cuotas
  const activeLoans = loans.filter((l) => l.status === "ACTIVE" || l.status === "OVERDUE")
  const paidLoans = loans.filter((l) => l.status === "PAID")
  const defaultedLoans = loans.filter((l) => l.status === "DEFAULTED")

  const dueTodayList: string[] = []
  const upcomingNext7DaysList: string[] = []
  const overdueInstallmentsList: string[] = []

  let totalActivePrincipal = 0
  let totalPendingBalanceAllLoans = 0
  let totalOverdueAmount = 0

  const loansDetailedSummary = loans.map((loan) => {
    const clientFullName = `${loan.client.firstName} ${loan.client.lastName}`.trim()
    const paidInst = loan.installments.filter((i) => i.status === "PAID")
    const pendingInst = loan.installments.filter((i) => i.status !== "PAID")

    let pendingCapital = 0
    let pendingInterest = 0
    let pendingLateFees = 0
    let totalRemainingToPay = 0

    for (const inst of pendingInst) {
      const alreadyPaid = inst.amountPaid || 0
      const pendingOnInst = Math.max(0, inst.expectedAmount - alreadyPaid)
      const interestPending = Math.max(0, inst.interestPart - Math.min(alreadyPaid, inst.interestPart))
      const capitalPending = Math.max(0, pendingOnInst - interestPending)
      const lateFee = inst.lateFee || 0

      pendingCapital += capitalPending
      pendingInterest += interestPending
      pendingLateFees += lateFee
      totalRemainingToPay += pendingOnInst + lateFee

      // Comparar fecha de vencimiento con fecha actual en Colombia
      const instDueStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Bogota",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(inst.dueDate))

      if (loan.status === "ACTIVE" || loan.status === "OVERDUE") {
        if (instDueStr === bogotaDateParts) {
          dueTodayList.push(
            `- ${clientFullName} (Tel: ${loan.client.phone}): Cuota #${inst.installmentNumber}/${loan.numberOfInstallments} vence HOY (${fmtDate(inst.dueDate)}) por ${fmt(pendingOnInst + lateFee)}`
          )
        } else if (instDueStr < bogotaDateParts) {
          const diffMs = now.getTime() - new Date(inst.dueDate).getTime()
          const daysLate = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
          totalOverdueAmount += pendingOnInst + lateFee
          overdueInstallmentsList.push(
            `- ${clientFullName} (CC: ${loan.client.idDocument}, Tel: ${loan.client.phone}): Cuota #${inst.installmentNumber}/${loan.numberOfInstallments} venció el ${fmtDate(inst.dueDate)} (${daysLate} días de mora) | Falta de la cuota: ${fmt(pendingOnInst)} | Mora: ${fmt(lateFee)} | Total exigible cuota: ${fmt(pendingOnInst + lateFee)}`
          )
        } else {
          const diffMs = new Date(inst.dueDate).getTime() - now.getTime()
          const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
          if (daysUntil >= 1 && daysUntil <= 7) {
            upcomingNext7DaysList.push(
              `- ${clientFullName}: Cuota #${inst.installmentNumber}/${loan.numberOfInstallments} vence el ${fmtDate(inst.dueDate)} (en ${daysUntil} días) por ${fmt(pendingOnInst)}`
            )
          }
        }
      }
    }

    if (loan.status === "ACTIVE" || loan.status === "OVERDUE") {
      totalActivePrincipal += loan.principalAmount
      totalPendingBalanceAllLoans += totalRemainingToPay
    }

    const nextInst = pendingInst[0]
    const investorsStr =
      loan.investors.length > 0
        ? loan.investors.map((inv) => `${inv.investor.name} (${inv.participationPercentage}%)`).join(", ")
        : "100% Capital Propio JyJ"

    const pendingQuotasDetail = pendingInst
      .map((i) => {
        const rem = Math.max(0, i.expectedAmount - (i.amountPaid || 0)) + (i.lateFee || 0)
        return `#${i.installmentNumber} (${fmtDate(i.dueDate)}: debe ${fmt(rem)}${i.status === "PARTIAL" ? ` [Abonó ${fmt(i.amountPaid)}]` : ""}${i.lateFee > 0 ? ` [Mora ${fmt(i.lateFee)}]` : ""})`
      })
      .join("; ")

    return (
      `• Préstamo [${loan.id.slice(-6).toUpperCase()}] | Cliente: ${clientFullName} (CC: ${loan.client.idDocument}, Tel: ${loan.client.phone})\n` +
      `  Estado: ${statusMap[loan.status] || loan.status} | Prestado: ${fmt(loan.principalAmount)} | Modalidad: ${periodicityMap[loan.interestType] || loan.interestType} (${loan.numberOfInstallments} cuotas de ${fmt(loan.installmentAmount)})\n` +
      `  Inicio: ${fmtDate(loan.startDate)} | Fin: ${fmtDate(loan.endDate)} | Fondeo: ${investorsStr}\n` +
      `  Progreso: ${paidInst.length}/${loan.numberOfInstallments} cuotas pagadas | ${pendingInst.length} cuotas pendientes\n` +
      `  DEUDA TOTAL ACTUAL DEL PRÉSTAMO: ${fmt(totalRemainingToPay)} (Capital pendiente: ${fmt(pendingCapital)} | Interés pendiente: ${fmt(pendingInterest)} | Mora acumulada: ${fmt(pendingLateFees)})\n` +
      (nextInst
        ? `  Próxima cuota a pagar: Cuota #${nextInst.installmentNumber} el ${fmtDate(nextInst.dueDate)} por ${fmt(Math.max(0, nextInst.expectedAmount - (nextInst.amountPaid || 0)) + (nextInst.lateFee || 0))}\n` +
          `  Detalle cuotas pendientes: ${pendingQuotasDetail}`
        : `  Todas las cuotas fueron pagadas (Última cuota pagada el ${fmtDate(loan.updatedAt)})`)
    )
  })

  // Últimos préstamos completamente pagados
  const recentlyPaidLoansList = paidLoans.slice(0, 10).map((l) => {
    const clientName = `${l.client.firstName} ${l.client.lastName}`.trim()
    return `- ${clientName}: Capital prestado ${fmt(l.principalAmount)} (${l.numberOfInstallments} cuotas de ${fmt(l.installmentAmount)}) | Liquidado el ${fmtDate(l.updatedAt)}`
  })

  // Últimos pagos individuales recibidos
  const recentPaymentsList = recentPayments.map((p) => {
    const clientName = `${p.loan.client.firstName} ${p.loan.client.lastName}`.trim()
    const quotaText = p.installment ? `Cuota #${p.installment.installmentNumber}` : "Abono a Capital"
    return `- ${fmtDate(p.paymentDate)}: ${clientName} pagó ${fmt(p.amountPaid)} (${quotaText}${p.isPartial ? " - Pago Parcial" : ""}${p.lateFeeApplied > 0 ? `, incl. mora ${fmt(p.lateFeeApplied)}` : ""})`
  })

  // Resumen de inversionistas
  const investorsSummaryList = investors.map((inv) => {
    const activeInvs = inv.investments.filter(
      (i) => i.loan.status === "ACTIVE" || i.loan.status === "OVERDUE"
    )
    const activeCap = activeInvs.reduce((s, i) => s + i.investedAmount, 0)
    const clientsList = activeInvs
      .map((i) => `${i.loan.client.firstName} ${i.loan.client.lastName} (${i.participationPercentage}%)`)
      .join(", ")
    return `- ${inv.name} | Tel: ${inv.phone || "N/A"} | Llave transferencia: ${inv.transferKey || "No registrada"} | Capital activo: ${fmt(activeCap)} en ${activeInvs.length} préstamo(s) [${clientsList || "Ninguno activo"}]`
  })

  // Resumen de clientes sin préstamo activo o lista general
  const clientsQuickList = clients.map((c) => {
    return `- ${c.firstName} ${c.lastName} | CC: ${c.idDocument} | Tel: ${c.phone} | Ciudad/Barrio: ${c.city || ""} ${c.neighborhood || ""} | Dir: ${c.address || "N/A"}${c.isBlacklisted ? " [⚠️ EN LISTA NEGRA]" : ""}`
  })

  return `
=== RADIOGRAFÍA EN TIEMPO REAL DE JYJ PRÉSTAMOS ===
Fecha y hora actual (Colombia): ${bogotaNowStr}

1. RESUMEN EJECUTIVO DE CARTERA:
- Préstamos Activos / En Curso: ${activeLoans.length}
- Préstamos Pagados / Liquidados: ${paidLoans.length}
- Préstamos en Pérdida / Castigados: ${defaultedLoans.length}
- Capital Original en Préstamos Activos: ${fmt(totalActivePrincipal)}
- Saldo Total Pendiente por Cobrar (Capital + Intereses + Moras): ${fmt(totalPendingBalanceAllLoans)}
- Total en Mora Vencida Exigible Hoy: ${fmt(totalOverdueAmount)} (${overdueInstallmentsList.length} cuotas vencidas)

2. COBROS QUE VENCEN HOY (${dueTodayList.length}):
${dueTodayList.length > 0 ? dueTodayList.join("\n") : "No hay cuotas que venzan exactamente hoy."}

3. CLIENTES Y CUOTAS EN MORA / VENCIDAS (${overdueInstallmentsList.length}):
${overdueInstallmentsList.length > 0 ? overdueInstallmentsList.join("\n") : "No hay ningún cliente ni cuota en mora actualmente."}

4. PRÓXIMOS VENCIMIENTOS (PRÓXIMOS 7 DÍAS):
${upcomingNext7DaysList.length > 0 ? upcomingNext7DaysList.join("\n") : "No hay vencimientos en los próximos 7 días."}

5. DETALLE COMPLETO DE TODOS LOS PRÉSTAMOS Y DEUDAS POR CLIENTE (${loans.length}):
${loansDetailedSummary.join("\n\n")}

6. ÚLTIMOS PRÉSTAMOS TOTALMENTE PAGADOS / LIQUIDADOS:
${recentlyPaidLoansList.length > 0 ? recentlyPaidLoansList.join("\n") : "Ninguno registrado."}

7. ÚLTIMOS 25 PAGOS Y ABONOS RECIBIDOS:
${recentPaymentsList.length > 0 ? recentPaymentsList.join("\n") : "No hay pagos recientes."}

8. INVERSIONISTAS Y SUS LLAVES DE TRANSFERENCIA (${investors.length}):
${investorsSummaryList.join("\n")}

9. DIRECTORIO DE CLIENTES (${clients.length}):
${clientsQuickList.join("\n")}

10. ÚLTIMOS GASTOS REGISTRADOS:
${recentExpenses.map((e) => `- ${fmtDate(e.date)}: ${e.description} por ${fmt(e.amount)} (${e.category})`).join("\n") || "Sin gastos recientes."}
`.trim()
}

export async function getGeminiApiKey(): Promise<string> {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY
  const setting = await prisma.setting.findUnique({
    where: { key: "GEMINI_API_KEY" },
  })
  return setting?.value || ""
}

const RODOLFO_SYSTEM_PROMPT = `
Eres **Rodolfo**, el asistente financiero inteligente y mano derecha del equipo de **JyJ Préstamos** en su grupo privado de Telegram.

REGLAS DE PERSONALIDAD Y FORMATO:
1. Hablas en español colombiano profesional, cercano, ejecutivo y muy claro.
2. SIEMPRE te basas EXCLUSIVAMENTE en los datos reales de la "RADIOGRAFÍA EN TIEMPO REAL DE JYJ PRÉSTAMOS" que se te entrega. Nunca inventes cifras ni clientes.
3. Si preguntan por un cliente por su primer nombre, apellido o apodo cercano (ej. "Kelly", "la cliente Kelly", "Juan"), búscalo en la lista de clientes/préstamos sin importar tildes o mayúsculas y entrega toda su información exacta:
   - Cuánto debe en total hoy (suma de cuotas/saldos pendientes + mora).
   - Cuántas cuotas lleva pagadas y cuántas le faltan.
   - Cuánto vale cada cuota y cuándo vence su próxima cuota (o si tiene cuotas en mora).
4. Formatea tus respuestas usando **HTML válido para Telegram**:
   - Usa \`<b>texto</b>\` para negritas, \`<i>texto</i>\` para cursivas, y \`<code>texto</code>\` para montos clave, documentos o llaves.
   - NO uses Markdown (\`**\`, \`###\`, ni bloques \`\`\`), porque Telegram en modo HTML no los procesa bien. Usa solo etiquetas \`<b>\`, \`<i>\`, \`<code>\` y saltos de línea con viñetas (•, 🔹, 💰, 👤, 📅, ⚠️, ✅).
5. Sé directo, ordenado y fácil de leer desde el celular.
`.trim()

/**
 * Verifica si un texto de entrada está dirigido a Rodolfo (empieza por "rodolfo" o comando).
 */
export function isTextAddressedToRodolfo(text: string): {
  addressed: boolean
  cleanedQuery: string
} {
  const trimmed = text.trim()
  if (!trimmed) return { addressed: false, cleanedQuery: "" }

  // Soportar comandos de Telegram como /resumen, /mora, /hoy, /rodolfo, /ayuda, /start
  if (/^\/(rodolfo|resumen|mora|hoy|pagos|inversionistas|clientes|ayuda|start)(@\w+)?\b/i.test(trimmed)) {
    const cmdMatch = trimmed.match(/^\/(\w+)(?:@\w+)?\s*(.*)$/i)
    const cmd = cmdMatch?.[1]?.toLowerCase() || ""
    const rest = cmdMatch?.[2]?.trim() || ""

    if (cmd === "mora") return { addressed: true, cleanedQuery: rest || "¿Quiénes están en mora hoy y cuánto deben?" }
    if (cmd === "hoy") return { addressed: true, cleanedQuery: rest || "¿Quiénes deben pagar hoy y cuáles son los próximos vencimientos?" }
    if (cmd === "resumen") return { addressed: true, cleanedQuery: rest || "Dame un resumen ejecutivo completo de la cartera hoy, cobros de hoy y moras." }
    if (cmd === "pagos") return { addressed: true, cleanedQuery: rest || "¿Cuáles fueron los últimos pagos recibidos y los últimos préstamos que se pagaron?" }
    if (cmd === "inversionistas") return { addressed: true, cleanedQuery: rest || "Dame el resumen de los inversionistas, su capital activo y sus llaves de transferencia." }
    if (cmd === "ayuda" || cmd === "start") {
      return {
        addressed: true,
        cleanedQuery:
          rest ||
          "Preséntate brevemente como Rodolfo y explica con ejemplos cómo pueden preguntarte por texto o por nota de voz empezando con 'Rodolfo'.",
      }
    }
    return { addressed: true, cleanedQuery: rest || "Hola Rodolfo, dame un resumen del estado actual." }
  }

  // Verificar si empieza con "rodolfo" (ignorando signos iniciales como ¡ ¿ " ' @ o saludos cortos opcionales si empieza por rodolfo)
  // El usuario pidió: que al inicio del mensaje vaya su nombre ("Rodolfo" o "rodolfo")
  const regex = /^[¡!¿?"']*(@?rodolfo(?:_jyj_bot)?)\b[,:;.!?\-\s]*(.*)$/i
  const match = trimmed.match(regex)
  if (match) {
    const query = match[2]?.trim() || "Hola Rodolfo, ¿cómo está la cartera hoy?"
    return { addressed: true, cleanedQuery: query }
  }

  return { addressed: false, cleanedQuery: "" }
}

/**
 * Procesa una consulta de texto para Rodolfo usando Gemini 2.5 Flash.
 */
export async function generateRodolfoTextReply(userQuestion: string, senderName?: string): Promise<string> {
  const apiKey = await getGeminiApiKey()
  if (!apiKey) {
    return "⚠️ <b>Configuración pendiente:</b> No se encontró la API Key de IA para Rodolfo en la configuración."
  }

  const dbContext = await buildRodolfoDatabaseContext()

  const prompt = `${RODOLFO_SYSTEM_PROMPT}

${dbContext}

---
CONSULTA REALIZADA POR ${senderName ? `"${senderName}"` : "UN MIEMBRO DEL EQUIPO"} EN EL GRUPO DE TELEGRAM:
"${userQuestion}"

Responde como Rodolfo en formato HTML para Telegram (usando solo <b>, <i>, <code>):`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
      },
    }),
  })

  const data = await res.json()
  if (!res.ok || !data?.candidates?.[0]?.content?.parts?.[0]?.text) {
    console.error("Gemini error in Rodolfo text:", data)
    return "⚠️ Disculpa, tuve un inconveniente momentáneo consultando el motor de IA. Intenta de nuevo en unos segundos."
  }

  return sanitizeTelegramHtml(data.candidates[0].content.parts[0].text)
}

/**
 * Procesa una nota de voz / audio de Telegram:
 * 1. Verifica si al inicio del audio llaman a "Rodolfo".
 * 2. Si NO llaman a Rodolfo al inicio, devuelve { addressed: false }.
 * 3. Si SÍ llaman a Rodolfo, transcribe la pregunta y genera la respuesta con datos reales de la BD.
 */
export async function generateRodolfoVoiceReply(
  audioBase64: string,
  mimeType: string,
  senderName?: string
): Promise<{ addressed: boolean; transcription?: string; replyHtml?: string }> {
  const apiKey = await getGeminiApiKey()
  if (!apiKey) {
    return {
      addressed: true,
      replyHtml: "⚠️ <b>Configuración pendiente:</b> No se encontró la API Key de IA para Rodolfo.",
    }
  }

  // Paso 1 rápido: transcribir el audio y verificar si empieza con "Rodolfo"
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
  const transcribePrompt = `Escucha este mensaje de voz en español.
Devuelve ÚNICAMENTE un objeto JSON válido (sin bloques markdown) con esta estructura exacta:
{
  "transcription": "transcripción exacta de lo que dice el audio",
  "startsWithRodolfo": true o false
}
Regla para "startsWithRodolfo":
- Debe ser true si la persona empieza el audio diciendo "Rodolfo" (o "Hola Rodolfo", "Oye Rodolfo", "Buenas Rodolfo", o alguna pronunciación similar a Rodolfo al principio del audio).
- Si no menciona a Rodolfo al principio del audio, debe ser false.`

  const transRes = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: audioBase64 } },
            { text: transcribePrompt },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    }),
  })

  const transData = await transRes.json()
  const rawJsonText = transData?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!transRes.ok || !rawJsonText) {
    console.error("Error transcribing voice note with Gemini:", transData)
    return { addressed: false }
  }

  let parsed: { transcription?: string; startsWithRodolfo?: boolean } = {}
  try {
    parsed = JSON.parse(rawJsonText)
  } catch {
    const cleaned = rawJsonText.replace(/```json|```/g, "").trim()
    parsed = JSON.parse(cleaned)
  }

  const transcription = (parsed.transcription || "").trim()
  const startsWithRodolfo =
    Boolean(parsed.startsWithRodolfo) ||
    /^[¡!¿?"']*(hola\s+|oye\s+|buenas\s+|bueno\s+|ey\s+)?rodolfo\b/i.test(transcription)

  if (!startsWithRodolfo) {
    return { addressed: false, transcription }
  }

  // Paso 2: Como sí fue dirigido a Rodolfo, consultamos la BD y generamos la respuesta completa
  const answerHtml = await generateRodolfoTextReply(transcription, senderName)
  const fullReply =
    `🎙️ <i>"${escapeHtml(transcription)}"</i>\n` +
    `────────────────────\n` +
    `${answerHtml}`

  return {
    addressed: true,
    transcription,
    replyHtml: fullReply,
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

/**
 * Limpia cualquier etiqueta o markdown residual que no sea compatible con HTML de Telegram
 */
function sanitizeTelegramHtml(text: string): string {
  let out = text.trim()
  // Remover posibles bloques ```html ... ```
  out = out.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "")
  // Convertir **texto** en <b>texto</b> por si el modelo usó markdown
  out = out.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
  // Reemplazar <br> o <br/> por salto de línea
  out = out.replace(/<br\s*\/?>/gi, "\n")
  // Eliminar etiquetas <p> o <ul>/<li> no soportadas en Telegram HTML
  out = out.replace(/<\/?p>/gi, "\n")
  out = out.replace(/<li>/gi, "• ").replace(/<\/li>/gi, "\n")
  out = out.replace(/<\/?(?:ul|ol|div|h[1-6])>/gi, "")
  return out.trim()
}

/**
 * Descarga un archivo de audio de Telegram y lo devuelve en Base64
 */
export async function downloadTelegramFileAsBase64(botToken: string, fileId: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`)
    const fileData = await fileRes.json()
    if (!fileRes.ok || !fileData.ok || !fileData.result?.file_path) {
      console.error("Telegram getFile error:", fileData)
      return null
    }

    const filePath: string = fileData.result.file_path
    const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`
    const audioRes = await fetch(downloadUrl)
    if (!audioRes.ok) return null

    const arrayBuffer = await audioRes.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")

    let mimeType = "audio/ogg"
    if (filePath.endsWith(".mp3")) mimeType = "audio/mp3"
    else if (filePath.endsWith(".m4a") || filePath.endsWith(".mp4")) mimeType = "audio/mp4"
    else if (filePath.endsWith(".wav")) mimeType = "audio/wav"

    return { base64, mimeType }
  } catch (err) {
    console.error("Error downloading Telegram voice file:", err)
    return null
  }
}

/**
 * Envía estado "escribiendo..." al chat de Telegram
 */
export async function sendTelegramChatAction(botToken: string, chatId: string | number, action: "typing" | "record_voice" = "typing") {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action }),
    })
  } catch {
    // ignore
  }
}

/**
 * Envía una respuesta de Rodolfo citando el mensaje original
 */
export async function sendRodolfoReply(
  botToken: string,
  chatId: string | number,
  htmlText: string,
  replyToMessageId?: number
) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: htmlText,
      parse_mode: "HTML",
      ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
    }),
  })

  if (!res.ok) {
    // Fallback sin HTML si hubo algún tag mal cerrado
    const plainText = htmlText.replace(/<[^>]+>/g, "")
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: plainText,
        ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
      }),
    })
  }
}
