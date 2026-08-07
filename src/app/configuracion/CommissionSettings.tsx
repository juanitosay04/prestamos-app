"use client"

import { useState } from "react"
import { Percent, DollarSign, Save, Loader2, Info, CheckCircle2 } from "lucide-react"
import { SecretaryCommissionSettingsData, saveSecretaryCommissionSettings } from "@/app/actions/settings"
import toast from "react-hot-toast"

export function CommissionSettings({ initialSettings }: { initialSettings: SecretaryCommissionSettingsData }) {
  const [commissionType, setCommissionType] = useState(initialSettings.commissionType || "PERCENTAGE_INTEREST")
  const [commissionValue, setCommissionValue] = useState(String(initialSettings.commissionValue || 0))
  const [saving, setSaving] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const numVal = parseFloat(commissionValue)
    if (isNaN(numVal) || numVal < 0) {
      toast.error("Ingresa un valor numérico válido mayor o igual a 0")
      setSaving(false)
      return
    }

    const res = await saveSecretaryCommissionSettings({
      commissionType,
      commissionValue: numVal
    })

    if (res.success) {
      toast.success("Regla de comisión por defecto guardada exitosamente")
    } else {
      toast.error(res.error || "Error al guardar configuración")
    }

    setSaving(false)
  }

  return (
    <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 rounded-2xl text-blue-400 border border-blue-500/20">
            <Percent className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Comisión por Defecto para Secretaría</h3>
            <p className="text-xs text-muted-foreground">
              Regla automatizada aplicada a los préstamos creados por el rol Secretaría.
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <CheckCircle2 className="h-3.5 w-3.5" /> Auto-Asignación
        </span>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Tipo de Comisión */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Modalidad de Cálculo de Comisión *
            </label>
            <select
              value={commissionType}
              onChange={e => setCommissionType(e.target.value)}
              className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="PERCENTAGE_INTEREST" className="bg-[#0D1320] text-white">
                % Porcentaje sobre el Interés Cobrado (Recomendado)
              </option>
              <option value="PERCENTAGE_PRINCIPAL" className="bg-[#0D1320] text-white">
                % Porcentaje sobre el Capital Prestado
              </option>
              <option value="FIXED_AMOUNT" className="bg-[#0D1320] text-white">
                $ Monto Fijo por Crédito
              </option>
            </select>
          </div>

          {/* Valor */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              {commissionType === "FIXED_AMOUNT" ? "Monto Fijo en Pesos ($) *" : "Porcentaje Asignado (%) *"}
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={commissionValue}
                onChange={e => setCommissionValue(e.target.value)}
                placeholder={commissionType === "FIXED_AMOUNT" ? "Ej: 50000" : "Ej: 10"}
                className="h-10 w-full bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono font-bold">
                {commissionType === "FIXED_AMOUNT" ? "COP" : "%"}
              </span>
            </div>
          </div>

        </div>

        {/* Explicación Operativa */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-start gap-3 text-xs text-muted-foreground">
          <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white block mb-0.5">¿Cómo se liquida esta comisión?</span>
            Cuando la secretaría crea un crédito, este porcentaje se asignará silenciosamente sin que ella tenga que digitarlo ni alterarlo. Al liquidarse y pagarse el préstamo en su totalidad, el sistema generará automáticamente un gasto de nómina (<strong className="text-white font-mono">SALARY</strong>) por este concepto a favor de la colaboradora.
          </div>
        </div>

        {/* Botón de Guardar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="h-10 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 inline-flex items-center gap-2 active:scale-95"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Guardar Regla de Comisión</span>
          </button>
        </div>

      </form>
    </div>
  )
}
