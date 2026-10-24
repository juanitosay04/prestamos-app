"use client"

import { useState } from "react"
import { Send, CheckCircle2, Loader2, Bot, HelpCircle, Search, Sparkles, Mic, ShieldAlert, Zap } from "lucide-react"
import {
  saveTelegramSettings,
  testTelegramConnection,
  detectTelegramChatId,
  activateRodolfoWebhook,
  TelegramSettingsData
} from "@/app/actions/settings"
import toast from "react-hot-toast"

export function TelegramSettings({ initialSettings }: { initialSettings: TelegramSettingsData }) {
  const [form, setForm] = useState<TelegramSettingsData>(initialSettings)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [activatingWebhook, setActivatingWebhook] = useState(false)
  const [webhookStatus, setWebhookStatus] = useState<{
    active: boolean
    canListenAllMessages: boolean
    webhookUrl?: string
  } | null>(null)
  const [showHelp, setShowHelp] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await saveTelegramSettings(form)
    setSaving(false)

    if (res.success) {
      toast.success("Configuración de Telegram y Rodolfo guardada correctamente")
    } else {
      toast.error(res.error || "Error al guardar configuración")
    }
  }

  const handleTest = async () => {
    if (!form.botToken || !form.chatId) {
      toast.error("Ingresa el Token y el Chat ID antes de probar")
      return
    }

    setTesting(true)
    const res = await testTelegramConnection(form.botToken, form.chatId)
    setTesting(false)

    if (res.success) {
      toast.success(res.message || "¡Mensaje de prueba enviado con éxito!")
    } else {
      toast.error(res.error || "No se pudo entregar el mensaje de prueba")
    }
  }

  const handleActivateRodolfo = async () => {
    if (!form.botToken || !form.chatId) {
      toast.error("Ingresa el Bot Token y el Chat ID primero")
      return
    }

    setActivatingWebhook(true)
    const origin = window.location.origin
    const res = await activateRodolfoWebhook(origin, form.botToken, form.chatId)
    setActivatingWebhook(false)

    if (res.success) {
      setWebhookStatus({
        active: true,
        canListenAllMessages: Boolean(res.canListenAllMessages),
        webhookUrl: res.webhookUrl
      })
      toast.success("¡Rodolfo activado para responder textos y audios en tiempo real!")
    } else {
      toast.error(res.error || "Error al activar el Webhook de Rodolfo")
    }
  }

  const handleAutoDetect = async () => {
    if (!form.botToken) {
      toast.error("Primero pega el Bot Token para poder detectar el grupo")
      return
    }

    setDetecting(true)
    const res = await detectTelegramChatId(form.botToken)
    setDetecting(false)

    if (res.success && res.chatId) {
      setForm(prev => ({ ...prev, chatId: res.chatId! }))
      toast.success(`¡Grupo detectado!: "${res.chatTitle}" (ID: ${res.chatId})`)
    } else {
      toast.error(res.error || "No se pudo detectar el grupo. Asegúrate de escribir un mensaje en el grupo primero.")
    }
  }

  return (
    <div className="glass-panel rounded-2xl p-6 border border-white/5 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/10">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Rodolfo • Asistente Inteligente de Telegram (Voz y Texto)
            </h2>
            <p className="text-xs text-muted-foreground">
              Envía alertas automáticas y responde preguntas por texto o nota de voz sobre clientes, moras y pagos.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1.5 self-start sm:self-auto bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
          {showHelp ? "Ocultar Guía" : "¿Cómo usar a Rodolfo?"}
        </button>
      </div>

      {/* Banner informativo sobre cómo hablarle a Rodolfo */}
      <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-emerald-500/10 border border-blue-500/20 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
          <Mic className="h-4 w-4 text-emerald-400" />
          <span>¿Cómo preguntarle cosas a Rodolfo en el grupo de Telegram?</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Para que Rodolfo responda sin confundirse con otras charlas, inicia tu <strong className="text-white">mensaje de texto</strong> o tu <strong className="text-white">nota de voz (audio)</strong> diciendo <code className="bg-black/40 px-1.5 py-0.5 rounded text-emerald-300 font-mono">Rodolfo</code> o <code className="bg-black/40 px-1.5 py-0.5 rounded text-emerald-300 font-mono">rodolfo</code>:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1">
          <div className="bg-black/25 rounded-lg px-3 py-2 border border-white/5">
            💬 <i>"Rodolfo ¿cuánto debe la cliente Kelly?"</i>
          </div>
          <div className="bg-black/25 rounded-lg px-3 py-2 border border-white/5">
            🎙️ <i>Audio: "Rodolfo, dime quiénes están en mora hoy"</i>
          </div>
          <div className="bg-black/25 rounded-lg px-3 py-2 border border-white/5">
            💬 <i>"Rodolfo ¿cuántos deben pagar hoy?"</i>
          </div>
          <div className="bg-black/25 rounded-lg px-3 py-2 border border-white/5">
            💬 <i>"Rodolfo ¿cuáles fueron los últimos préstamos que se pagaron?"</i>
          </div>
        </div>
        <p className="text-[11px] text-amber-300/90 pt-1 flex items-center gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0" />
          <span>
            <strong>Importante en Telegram:</strong> Haz que <strong>Rodolfo_Bot sea Administrador del grupo</strong> en Telegram para que pueda escuchar los audios y leer los mensajes que empiecen con "Rodolfo".
          </span>
        </p>
      </div>

      {webhookStatus && (
        <div className={`rounded-xl p-4 border text-xs space-y-1.5 ${webhookStatus.canListenAllMessages ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200" : "bg-amber-500/10 border-amber-500/30 text-amber-200"}`}>
          <p className="font-bold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Webhook de Rodolfo conectado a: <code className="font-mono bg-black/30 px-1.5 py-0.5 rounded">{webhookStatus.webhookUrl}</code>
          </p>
          {!webhookStatus.canListenAllMessages ? (
            <p className="text-amber-300">
              ⚠️ <strong>Atención:</strong> Rodolfo aún figura como miembro normal en el grupo de Telegram. Entra al grupo en Telegram → Info del grupo → Editar → Administradores → <strong>Agregar a Rodolfo_Bot como Administrador</strong> para que Telegram le permita escuchar las notas de voz y mensajes sin barra <code>/</code>.
            </p>
          ) : (
            <p className="text-emerald-300">
              ✅ Rodolfo tiene permisos completos en el grupo para escuchar notas de voz y mensajes de texto en tiempo real.
            </p>
          )}
        </div>
      )}

      {showHelp && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5 text-xs text-blue-200/90 space-y-4 animate-in fade-in duration-200">
          <div>
            <h4 className="font-bold text-sm text-blue-300 flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4" /> Paso 1: Crear tu Bot en Telegram
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-1">
              <li>Abre Telegram y busca a <strong className="text-white">@BotFather</strong>.</li>
              <li>Escribe el comando <code className="bg-black/40 px-1.5 py-0.5 rounded text-blue-300 font-mono">/newbot</code>.</li>
              <li>@BotFather te dará un <strong>Token HTTP API</strong>. Pégalo en el campo <i>Bot Token</i>.</li>
            </ol>
          </div>

          <div className="border-t border-white/5 pt-3">
            <h4 className="font-bold text-sm text-blue-300 flex items-center gap-2 mb-1">
              <Search className="h-4 w-4" /> Paso 2: Darle permisos a Rodolfo en el Grupo
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
              <li>Agrega a tu Bot al grupo de colaboradores.</li>
              <li><strong>Promuévelo a Administrador del grupo</strong> (esto permite que escuche notas de voz y mensajes que inicien con "Rodolfo").</li>
              <li>Haz clic en el botón <strong className="text-emerald-400">"Activar Rodolfo Interactivo"</strong> aquí abajo.</li>
            </ol>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>Bot Token de Telegram (API)</span>
            </label>
            <input
              type="password"
              placeholder="ej: 8259025311:AAFYjoc..."
              value={form.botToken}
              onChange={(e) => setForm({ ...form, botToken: e.target.value })}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground">
                Chat ID del Grupo
              </label>
              <button
                type="button"
                onClick={handleAutoDetect}
                disabled={detecting || !form.botToken}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/20 transition-colors disabled:opacity-40"
              >
                {detecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                Auto-detectar
              </button>
            </div>
            <input
              type="text"
              placeholder="ej: -5432390975"
              value={form.chatId}
              onChange={(e) => setForm({ ...form, chatId: e.target.value })}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>API Key IA (Voz y Texto Gemini)</span>
            </label>
            <input
              type="password"
              placeholder="API Key de IA para Rodolfo"
              value={form.geminiApiKey || ""}
              onChange={(e) => setForm({ ...form, geminiApiKey: e.target.value })}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono transition-colors"
            />
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Eventos Automáticos a Notificar
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                className="w-4 h-4 rounded text-blue-500 focus:ring-0 focus:ring-offset-0 bg-black/30 border-white/20"
              />
              <div>
                <span className="text-sm font-medium text-white block">Servicio de Telegram y Rodolfo Activo</span>
                <span className="text-xs text-muted-foreground">Habilita alertas y respuestas de Rodolfo</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
              <input
                type="checkbox"
                checked={form.notifyNewLoan}
                onChange={(e) => setForm({ ...form, notifyNewLoan: e.target.checked })}
                className="w-4 h-4 rounded text-blue-500 focus:ring-0 focus:ring-offset-0 bg-black/30 border-white/20"
              />
              <div>
                <span className="text-sm font-medium text-white block">Nuevos Préstamos</span>
                <span className="text-xs text-muted-foreground">Alerta al desembolsar un nuevo crédito</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
              <input
                type="checkbox"
                checked={form.notifyPayment}
                onChange={(e) => setForm({ ...form, notifyPayment: e.target.checked })}
                className="w-4 h-4 rounded text-blue-500 focus:ring-0 focus:ring-offset-0 bg-black/30 border-white/20"
              />
              <div>
                <span className="text-sm font-medium text-white block">Pagos y Abonos</span>
                <span className="text-xs text-muted-foreground">Notifica cobros de cuotas y abonos a capital</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
              <input
                type="checkbox"
                checked={form.notifyRefinance}
                onChange={(e) => setForm({ ...form, notifyRefinance: e.target.checked })}
                className="w-4 h-4 rounded text-blue-500 focus:ring-0 focus:ring-offset-0 bg-black/30 border-white/20"
              />
              <div>
                <span className="text-sm font-medium text-white block">Refinanciaciones</span>
                <span className="text-xs text-muted-foreground">Alerta cuando se reestructure una deuda</span>
              </div>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-white/5">
          <button
            type="button"
            onClick={handleActivateRodolfo}
            disabled={activatingWebhook || !form.botToken || !form.chatId}
            className="px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {activatingWebhook ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 text-emerald-400" />}
            Activar Rodolfo Interactivo (Voz y Texto)
          </button>

          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !form.botToken || !form.chatId}
            className="px-4 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar Saludo de Rodolfo
          </button>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Guardar Configuración
          </button>
        </div>
      </form>
    </div>
  )
}
