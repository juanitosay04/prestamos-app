import { NextRequest, NextResponse } from "next/server"
import { getTelegramSettings } from "@/app/actions/settings"
import { prisma } from "@/lib/prisma"
import {
  isTextAddressedToRodolfo,
  generateRodolfoTextReply,
  generateRodolfoVoiceReply,
  downloadTelegramFileAsBase64,
  sendTelegramChatAction,
  sendRodolfoReply,
} from "@/lib/rodolfo"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const update = await req.json()
    const msg = update?.message || update?.edited_message
    if (!msg || !msg.chat) {
      return NextResponse.json({ ok: true })
    }

    // Ignorar mensajes enviados por otros bots
    if (msg.from?.is_bot) {
      return NextResponse.json({ ok: true })
    }

    const settings = await getTelegramSettings()
    if (!settings.enabled || !settings.botToken) {
      return NextResponse.json({ ok: true })
    }

    // Si el grupo de Telegram migró a Supergrupo (pasa cuando se asignan permisos de admin), actualizar automáticamente el Chat ID
    if (msg.migrate_to_chat_id) {
      await prisma.setting.upsert({
        where: { key: "TELEGRAM_CHAT_ID" },
        create: { key: "TELEGRAM_CHAT_ID", value: String(msg.migrate_to_chat_id) },
        update: { value: String(msg.migrate_to_chat_id) },
      })
      return NextResponse.json({ ok: true })
    }

    const incomingChatId = String(msg.chat.id)
    const configuredChatId = String(settings.chatId || "").trim()

    // Seguridad: responder únicamente en el grupo autorizado de JyJ Préstamos
    if (configuredChatId && incomingChatId !== configuredChatId) {
      return NextResponse.json({ ok: true })
    }

    const senderName =
      [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ") ||
      msg.from?.username ||
      "Colaborador"

    // ─── CASO 1: Nota de voz o archivo de audio ──────────────────────────────
    const voiceOrAudio = msg.voice || msg.audio
    if (voiceOrAudio && voiceOrAudio.file_id) {
      await sendTelegramChatAction(settings.botToken, incomingChatId, "typing")

      const downloaded = await downloadTelegramFileAsBase64(settings.botToken, voiceOrAudio.file_id)
      if (!downloaded) {
        await sendRodolfoReply(
          settings.botToken,
          incomingChatId,
          "⚠️ No pude descargar el audio de Telegram. Intenta enviarlo nuevamente.",
          msg.message_id
        )
        return NextResponse.json({ ok: true })
      }

      const voiceResult = await generateRodolfoVoiceReply(
        downloaded.base64,
        downloaded.mimeType,
        senderName
      )

      if (voiceResult.addressed && voiceResult.replyHtml) {
        await sendRodolfoReply(
          settings.botToken,
          incomingChatId,
          voiceResult.replyHtml,
          msg.message_id
        )
      }

      return NextResponse.json({ ok: true })
    }

    // ─── CASO 2: Mensaje de texto ────────────────────────────────────────────
    const rawText: string = msg.text || msg.caption || ""
    if (!rawText) {
      return NextResponse.json({ ok: true })
    }

    const { addressed, cleanedQuery } = isTextAddressedToRodolfo(rawText)
    if (!addressed) {
      return NextResponse.json({ ok: true })
    }

    await sendTelegramChatAction(settings.botToken, incomingChatId, "typing")

    const replyHtml = await generateRodolfoTextReply(cleanedQuery, senderName)
    await sendRodolfoReply(settings.botToken, incomingChatId, replyHtml, msg.message_id)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error in Telegram webhook (/api/telegram/webhook):", error)
    // Siempre responder 200 OK a Telegram para evitar reintentos en bucle
    return NextResponse.json({ ok: true })
  }
}

export async function GET() {
  return NextResponse.json({
    status: "online",
    bot: "Rodolfo - Asistente Inteligente JyJ Préstamos",
  })
}
