"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/session"

export interface TelegramSettingsData {
  botToken: string
  chatId: string
  geminiApiKey?: string
  enabled: boolean
  notifyNewLoan: boolean
  notifyPayment: boolean
  notifyRefinance: boolean
  notifyOverdue: boolean
}

export interface SecretaryCommissionSettingsData {
  commissionType: string // "PERCENTAGE_INTEREST" | "PERCENTAGE_PRINCIPAL" | "FIXED_AMOUNT"
  commissionValue: number
}

export interface CompanyCommissionSettingsData {
  commissionType: string // "PERCENTAGE_INTEREST" | "PERCENTAGE_PRINCIPAL" | "FIXED_AMOUNT"
  commissionValue: number
}

export async function getCompanyCommissionSettings(): Promise<CompanyCommissionSettingsData> {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            "DEFAULT_COMPANY_COMMISSION_TYPE",
            "DEFAULT_COMPANY_COMMISSION_VALUE"
          ]
        }
      }
    })

    const map = new Map(settings.map(s => [s.key, s.value]))

    return {
      commissionType: map.get("DEFAULT_COMPANY_COMMISSION_TYPE") || "PERCENTAGE_INTEREST",
      commissionValue: parseFloat(map.get("DEFAULT_COMPANY_COMMISSION_VALUE") || "0")
    }
  } catch (error) {
    console.error("Error fetching company commission settings:", error)
    return {
      commissionType: "PERCENTAGE_INTEREST",
      commissionValue: 0
    }
  }
}

export async function saveCompanyCommissionSettings(data: CompanyCommissionSettingsData) {
  try {
    const session = await getSession()
    if (!session || session.role !== "ADMIN") {
      return { success: false, error: "Solo los administradores pueden modificar las reglas de comisión" }
    }

    const updates = [
      { key: "DEFAULT_COMPANY_COMMISSION_TYPE", value: data.commissionType },
      { key: "DEFAULT_COMPANY_COMMISSION_VALUE", value: String(data.commissionValue) }
    ]

    for (const item of updates) {
      await prisma.setting.upsert({
        where: { key: item.key },
        create: item,
        update: { value: item.value }
      })
    }

    revalidatePath("/configuracion")
    revalidatePath("/prestamos")
    return { success: true }
  } catch (error: any) {
    console.error("Error saving company commission settings:", error)
    return { success: false, error: error.message || "Error al guardar configuración de comisión de empresa" }
  }
}

export async function getSecretaryCommissionSettings(): Promise<SecretaryCommissionSettingsData> {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            "DEFAULT_SECRETARY_COMMISSION_TYPE",
            "DEFAULT_SECRETARY_COMMISSION_VALUE"
          ]
        }
      }
    })

    const map = new Map(settings.map(s => [s.key, s.value]))

    return {
      commissionType: map.get("DEFAULT_SECRETARY_COMMISSION_TYPE") || "PERCENTAGE_INTEREST",
      commissionValue: parseFloat(map.get("DEFAULT_SECRETARY_COMMISSION_VALUE") || "0")
    }
  } catch (error) {
    console.error("Error fetching secretary commission settings:", error)
    return {
      commissionType: "PERCENTAGE_INTEREST",
      commissionValue: 0
    }
  }
}

export async function saveSecretaryCommissionSettings(data: SecretaryCommissionSettingsData) {
  try {
    const session = await getSession()
    if (!session || session.role !== "ADMIN") {
      return { success: false, error: "Solo los administradores pueden modificar las reglas de comisión" }
    }

    const updates = [
      { key: "DEFAULT_SECRETARY_COMMISSION_TYPE", value: data.commissionType },
      { key: "DEFAULT_SECRETARY_COMMISSION_VALUE", value: String(data.commissionValue) }
    ]

    for (const item of updates) {
      await prisma.setting.upsert({
        where: { key: item.key },
        create: item,
        update: { value: item.value }
      })
    }

    revalidatePath("/configuracion")
    revalidatePath("/prestamos")
    return { success: true }
  } catch (error: any) {
    console.error("Error saving secretary commission settings:", error)
    return { success: false, error: error.message || "Error al guardar configuración de comisión" }
  }
}

export async function getTelegramSettings(): Promise<TelegramSettingsData> {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            "TELEGRAM_BOT_TOKEN",
            "TELEGRAM_CHAT_ID",
            "GEMINI_API_KEY",
            "TELEGRAM_ENABLED",
            "TELEGRAM_NOTIFY_NEW_LOAN",
            "TELEGRAM_NOTIFY_PAYMENT",
            "TELEGRAM_NOTIFY_REFINANCE",
            "TELEGRAM_NOTIFY_OVERDUE"
          ]
        }
      }
    })

    const map = new Map(settings.map(s => [s.key, s.value]))

    return {
      botToken: map.get("TELEGRAM_BOT_TOKEN") || process.env.TELEGRAM_BOT_TOKEN || "",
      chatId: map.get("TELEGRAM_CHAT_ID") || process.env.TELEGRAM_CHAT_ID || "",
      geminiApiKey: map.get("GEMINI_API_KEY") || process.env.GEMINI_API_KEY || "",
      enabled: map.has("TELEGRAM_ENABLED") ? map.get("TELEGRAM_ENABLED") === "true" : true,
      notifyNewLoan: map.has("TELEGRAM_NOTIFY_NEW_LOAN") ? map.get("TELEGRAM_NOTIFY_NEW_LOAN") === "true" : true,
      notifyPayment: map.has("TELEGRAM_NOTIFY_PAYMENT") ? map.get("TELEGRAM_NOTIFY_PAYMENT") === "true" : true,
      notifyRefinance: map.has("TELEGRAM_NOTIFY_REFINANCE") ? map.get("TELEGRAM_NOTIFY_REFINANCE") === "true" : true,
      notifyOverdue: map.has("TELEGRAM_NOTIFY_OVERDUE") ? map.get("TELEGRAM_NOTIFY_OVERDUE") === "true" : true
    }
  } catch (error) {
    console.error("Error fetching telegram settings:", error)
    return {
      botToken: process.env.TELEGRAM_BOT_TOKEN || "",
      chatId: process.env.TELEGRAM_CHAT_ID || "",
      geminiApiKey: process.env.GEMINI_API_KEY || "",
      enabled: true,
      notifyNewLoan: true,
      notifyPayment: true,
      notifyRefinance: true,
      notifyOverdue: true
    }
  }
}

export async function saveTelegramSettings(data: TelegramSettingsData) {
  try {
    const session = await getSession()
    if (!session || session.role !== "ADMIN") {
      return { success: false, error: "Solo los administradores pueden modificar la configuración" }
    }

    const updates = [
      { key: "TELEGRAM_BOT_TOKEN", value: data.botToken.trim() },
      { key: "TELEGRAM_CHAT_ID", value: data.chatId.trim() },
      { key: "TELEGRAM_ENABLED", value: String(data.enabled) },
      { key: "TELEGRAM_NOTIFY_NEW_LOAN", value: String(data.notifyNewLoan) },
      { key: "TELEGRAM_NOTIFY_PAYMENT", value: String(data.notifyPayment) },
      { key: "TELEGRAM_NOTIFY_REFINANCE", value: String(data.notifyRefinance) },
      { key: "TELEGRAM_NOTIFY_OVERDUE", value: String(data.notifyOverdue) }
    ]

    if (data.geminiApiKey !== undefined && data.geminiApiKey.trim() !== "") {
      updates.push({ key: "GEMINI_API_KEY", value: data.geminiApiKey.trim() })
    }

    for (const item of updates) {
      await prisma.setting.upsert({
        where: { key: item.key },
        create: item,
        update: { value: item.value }
      })
    }

    revalidatePath("/configuracion")
    return { success: true }
  } catch (error: any) {
    console.error("Error saving telegram settings:", error)
    return { success: false, error: error.message || "Error al guardar configuración" }
  }
}

export async function testTelegramConnection(botToken?: string, chatId?: string) {
  try {
    const current = await getTelegramSettings()
    const token = (botToken || current.botToken).trim()
    const chat = (chatId || current.chatId).trim()

    if (!token) {
      return { success: false, error: "Debes ingresar el Token del Bot de Telegram" }
    }
    if (!chat) {
      return { success: false, error: "Debes ingresar el Chat ID del Grupo de Telegram" }
    }

    const testMessage =
      `🤖 <b>¡Hola equipo! Soy Rodolfo, su asistente de JyJ Préstamos</b>\n` +
      `────────────────────\n` +
      `✅ <b>Conexión verificada en tiempo real.</b>\n\n` +
      `💬 <b>¿Cómo consultarme por mensaje o por nota de voz?</b>\n` +
      `Solo inicia tu mensaje o tu audio diciendo mi nombre (<b>"Rodolfo..."</b>):\n\n` +
      `• <i>"Rodolfo, ¿cuánto debe la cliente Kelly?"</i>\n` +
      `• <i>"Rodolfo, ¿quiénes deben pagar hoy?"</i>\n` +
      `• <i>"Rodolfo, ¿quién está en mora?"</i>\n` +
      `• <i>"Rodolfo, ¿cuáles fueron los últimos préstamos que se pagaron?"</i>\n` +
      `• <i>"Rodolfo, pásame las llaves de los inversionistas"</i>\n\n` +
      `🎙️ <b>También escucho notas de voz:</b> envía un audio empezando con <i>"Rodolfo..."</i> y te responderé al instante.\n\n` +
      `📅 <i>Conectado el ${new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" })}</i>`

    const url = `https://api.telegram.org/bot${token}/sendMessage`
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chat,
        text: testMessage,
        parse_mode: "HTML"
      })
    })

    const data = await res.json()

    if (!res.ok || !data.ok) {
      return { 
        success: false, 
        error: data.description || "No se pudo entregar el mensaje. Verifica que el bot esté agregado al grupo como administrador." 
      }
    }

    return { success: true, message: "¡Mensaje de presentación de Rodolfo enviado al grupo!" }
  } catch (error: any) {
    return { success: false, error: error.message || "Error de red al conectar con Telegram" }
  }
}

export async function activateRodolfoWebhook(originUrl: string, botToken?: string, chatId?: string) {
  try {
    const current = await getTelegramSettings()
    const token = (botToken || current.botToken).trim()
    const chat = (chatId || current.chatId).trim()

    if (!token) {
      return { success: false, error: "Ingresa el Bot Token primero" }
    }

    const cleanOrigin = originUrl.replace(/\/$/, "")
    const webhookUrl = `${cleanOrigin}/api/telegram/webhook`

    // 1. Configurar Webhook en Telegram
    const whRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "edited_message", "my_chat_member"]
      })
    })
    const whData = await whRes.json()
    if (!whRes.ok || !whData.ok) {
      return { success: false, error: whData.description || "No se pudo registrar el Webhook en Telegram" }
    }

    // 2. Registrar menú de comandos rápidos en Telegram
    await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commands: [
          { command: "resumen", description: "📊 Resumen ejecutivo de cartera hoy" },
          { command: "hoy", description: "📅 ¿Quiénes deben pagar hoy?" },
          { command: "mora", description: "🚨 Clientes y cuotas en mora" },
          { command: "pagos", description: "💵 Últimos pagos y préstamos liquidados" },
          { command: "inversionistas", description: "🔑 Inversionistas y llaves de transferencia" },
          { command: "ayuda", description: "🤖 ¿Cómo hablar o enviar audios a Rodolfo?" }
        ]
      })
    }).catch(() => {})

    // 3. Verificar permisos de lectura en grupo
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`).then(r => r.json()).catch(() => null)
    const botId = meRes?.result?.id
    const canReadAll = Boolean(meRes?.result?.can_read_all_group_messages)
    let isGroupAdmin = false

    if (botId && chat) {
      const memberRes = await fetch(
        `https://api.telegram.org/bot${token}/getChatMember?chat_id=${encodeURIComponent(chat)}&user_id=${botId}`
      ).then(r => r.json()).catch(() => null)
      const status = memberRes?.result?.status
      isGroupAdmin = status === "administrator" || status === "creator"
    }

    return {
      success: true,
      webhookUrl,
      canListenAllMessages: canReadAll || isGroupAdmin,
      isGroupAdmin,
      canReadAll
    }
  } catch (error: any) {
    return { success: false, error: error.message || "Error al activar el Webhook de Rodolfo" }
  }
}

export async function detectTelegramChatId(botToken: string) {
  try {
    const token = botToken.trim()
    if (!token) {
      return { success: false, error: "Primero debes ingresar el Token del Bot" }
    }

    const url = `https://api.telegram.org/bot${token}/getUpdates`
    const res = await fetch(url, { cache: "no-store" })
    const data = await res.json()

    if (!res.ok || !data.ok) {
      return { success: false, error: data.description || "Token de bot inválido" }
    }

    const updates = data.result || []
    if (updates.length === 0) {
      return {
        success: false,
        error: "Aún no se detectan mensajes. Asegúrate de añadir el bot a tu grupo de Telegram y escribir un mensaje en el chat (por ejemplo: 'hola') antes de presionar este botón."
      }
    }

    // Buscar en orden inverso (los más recientes primero)
    for (let i = updates.length - 1; i >= 0; i--) {
      const update = updates[i]
      const msg = update.message || update.my_chat_member || update.channel_post
      if (msg && msg.chat) {
        const chat = msg.chat
        const title = chat.title || chat.username || chat.first_name || "Chat"
        return {
          success: true,
          chatId: String(chat.id),
          chatTitle: title,
          type: chat.type
        }
      }
    }

    return {
      success: false,
      error: "No se encontró ningún ID en los mensajes recientes. Escribe otro mensaje en el grupo y vuelve a intentar."
    }
  } catch (error: any) {
    return { success: false, error: error.message || "Error al conectar con Telegram" }
  }
}
