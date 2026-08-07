"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/session"

export interface TelegramSettingsData {
  botToken: string
  chatId: string
  enabled: boolean
  notifyNewLoan: boolean
  notifyPayment: boolean
  notifyRefinance: boolean
  notifyOverdue: boolean
}

export async function getTelegramSettings(): Promise<TelegramSettingsData> {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            "TELEGRAM_BOT_TOKEN",
            "TELEGRAM_CHAT_ID",
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

    const testMessage = `🤖 <b>Prueba de Conexión Exitosa</b>\n\n` +
      `✅ El sistema <b>JyJ Préstamos</b> se ha conectado correctamente a este grupo de colaboradores.\n\n` +
      `📅 <b>Fecha y Hora:</b> ${new Date().toLocaleString('es-CO')}\n` +
      `🔔 A partir de ahora recibirás alertas automáticas de préstamos, pagos, vencimientos y refinanciaciones.`

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

    return { success: true, message: "¡Mensaje de prueba enviado exitosamente al grupo!" }
  } catch (error: any) {
    return { success: false, error: error.message || "Error de red al conectar con Telegram" }
  }
}
