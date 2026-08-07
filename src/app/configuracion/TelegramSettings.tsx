"use client"

import { useState } from "react"
import { Send, CheckCircle2, AlertCircle, Loader2, Bot, Shield, Info, HelpCircle } from "lucide-react"
import { saveTelegramSettings, testTelegramConnection, TelegramSettingsData } from "@/app/actions/settings"
import toast from "react-hot-toast"

export function TelegramSettings({ initialSettings }: { initialSettings: TelegramSettingsData }) {
  const [form, setForm] = useState<TelegramSettingsData>(initialSettings)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await saveTelegramSettings(form)
    setSaving(false)

    if (res.success) {
      toast.success("Configuración de Telegram guardada correctamente")
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

  return (
    <div className="glass-panel rounded-2xl p-6 border border-white/5 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Notificaciones de Telegram para el Equipo
            </h2>
            <p className="text-xs text-muted-foreground">
              Envía alertas automáticas en tiempo real al grupo de colaboradores.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1.5 self-start sm:self-auto bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
          {showHelp ? "Ocultar Guía" : "¿Cómo configurar el Bot?"}
        </button>
      </div>

      {showHelp && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-xs text-blue-200/90 space-y-2 animate-in fade-in duration-200">
          <h4 className="font-bold text-blue-300 flex items-center gap-1.5">
            <Info className="h-4 w-4" /> Pasos para obtener el Bot Token y Chat ID:
          </h4>
          <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground ml-1">
            <li>Abre Telegram y busca <strong className="text-white">@BotFather</strong>. Envía el comando <code className="bg-black/30 px-1 py-0.5 rounded text-blue-300">/newbot</code> y sigue los pasos para crearlo.</li>
            <li>Copia el <strong>Token HTTP API</strong> que te entrega (ej: <code className="bg-black/30 px-1 py-0.5 rounded text-blue-300">7123456789:AAH...</code>) y pégalo en el campo <i>Bot Token</i>.</li>
            <li>Crea un grupo de Telegram con tus colaboradores y <strong>agrega a tu Bot</strong> al grupo dándole permisos de Administrador o permisos para enviar mensajes.</li>
            <li>Para obtener el <strong>Chat ID</strong> del grupo, agrega al bot <strong className="text-white">@userinfobot</strong> o <strong className="text-white">@getidsbot</strong> al grupo, copia el ID numérico (usualmente empieza con signo menos, ej: <code className="bg-black/30 px-1 py-0.5 rounded text-blue-300">-1001234567890</code>) y pégalo en <i>Chat ID</i>.</li>
            <li>Presiona <strong>"Probar Conexión"</strong> para comprobar que el mensaje llegue al grupo.</li>
          </ol>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Bot Token de Telegram (API)
            </label>
            <input
              type="password"
              placeholder="ej: 7123456789:AAH_XxXxXxXxXxXxXxXxXxXxXx"
              value={form.botToken}
              onChange={(e) => setForm({ ...form, botToken: e.target.value })}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Chat ID del Grupo (o Canal)
            </label>
            <input
              type="text"
              placeholder="ej: -1001928374650"
              value={form.chatId}
              onChange={(e) => setForm({ ...form, chatId: e.target.value })}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono transition-colors"
            />
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Eventos a Notificar
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
                <span className="text-sm font-medium text-white block">Servicio de Telegram Activo</span>
                <span className="text-xs text-muted-foreground">Habilita o deshabilita todos los envíos</span>
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
            onClick={handleTest}
            disabled={testing || !form.botToken || !form.chatId}
            className="px-4 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Probar Conexión
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
