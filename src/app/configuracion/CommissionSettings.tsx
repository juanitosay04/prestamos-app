"use client"

import { useState } from "react"
import { Building2, User, Save, Loader2, Info, CheckCircle2, ShieldCheck } from "lucide-react"
import { 
  SecretaryCommissionSettingsData, 
  CompanyCommissionSettingsData,
  saveSecretaryCommissionSettings,
  saveCompanyCommissionSettings 
} from "@/app/actions/settings"
import toast from "react-hot-toast"

export function CommissionSettings({ 
  secretarySettings,
  companySettings 
}: { 
  secretarySettings: SecretaryCommissionSettingsData
  companySettings: CompanyCommissionSettingsData 
}) {
  // Company Commission State (JyJ)
  const [companyType, setCompanyType] = useState(companySettings.commissionType || "PERCENTAGE_INTEREST")
  const [companyValue, setCompanyValue] = useState(String(companySettings.commissionValue || 0))
  const [savingCompany, setSavingCompany] = useState(false)

  // Secretary Commission State
  const [secretaryType, setSecretaryType] = useState(secretarySettings.commissionType || "PERCENTAGE_INTEREST")
  const [secretaryValue, setSecretaryValue] = useState(String(secretarySettings.commissionValue || 0))
  const [savingSecretary, setSavingSecretary] = useState(false)

  async function handleSaveCompany(e: React.FormEvent) {
    e.preventDefault()
    setSavingCompany(true)

    const numVal = parseFloat(companyValue)
    if (isNaN(numVal) || numVal < 0) {
      toast.error("Ingresa un valor numérico válido mayor o igual a 0")
      setSavingCompany(false)
      return
    }

    const res = await saveCompanyCommissionSettings({
      commissionType: companyType,
      commissionValue: numVal
    })

    if (res.success) {
      toast.success("Comisión por defecto de JyJ guardada exitosamente")
    } else {
      toast.error(res.error || "Error al guardar configuración")
    }

    setSavingCompany(false)
  }

  async function handleSaveSecretary(e: React.FormEvent) {
    e.preventDefault()
    setSavingSecretary(true)

    const numVal = parseFloat(secretaryValue)
    if (isNaN(numVal) || numVal < 0) {
      toast.error("Ingresa un valor numérico válido mayor o igual a 0")
      setSavingSecretary(false)
      return
    }

    const res = await saveSecretaryCommissionSettings({
      commissionType: secretaryType,
      commissionValue: numVal
    })

    if (res.success) {
      toast.success("Comisión por defecto de Secretaría guardada exitosamente")
    } else {
      toast.error(res.error || "Error al guardar configuración")
    }

    setSavingSecretary(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* 1. Tarjeta: Comisión de la Empresa (JyJ) */}
      <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-2xl text-emerald-400 border border-emerald-500/20">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Comisión de la Empresa (JyJ)</h3>
              <p className="text-xs text-muted-foreground">
                Cobro por administración de cartera y gestión sobre los intereses.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="h-3.5 w-3.5" /> Ingreso JyJ
          </span>
        </div>

        <form onSubmit={handleSaveCompany} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Modalidad de Cobro JyJ *
              </label>
              <select
                value={companyType}
                onChange={e => setCompanyType(e.target.value)}
                className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="PERCENTAGE_INTEREST" className="bg-[#0D1320] text-white">
                  % Sobre Interés Cobrado (Recomendado)
                </option>
                <option value="PERCENTAGE_PRINCIPAL" className="bg-[#0D1320] text-white">
                  % Sobre Capital Prestado
                </option>
                <option value="FIXED_AMOUNT" className="bg-[#0D1320] text-white">
                  $ Monto Fijo por Préstamo
                </option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                {companyType === "FIXED_AMOUNT" ? "Monto Fijo en Pesos ($) *" : "Porcentaje Asignado (%) *"}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={companyValue}
                  onChange={e => setCompanyValue(e.target.value)}
                  placeholder={companyType === "FIXED_AMOUNT" ? "Ej: 50000" : "Ej: 20"}
                  className="h-10 w-full bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono font-bold">
                  {companyType === "FIXED_AMOUNT" ? "COP" : "%"}
                </span>
              </div>
            </div>

          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-start gap-2.5 text-xs text-muted-foreground">
            <Info className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-semibold text-white block mb-0.5">¿Cómo aplica la comisión de JyJ?</span>
              Se aplica sobre el rendimiento de cada crédito. Si el préstamo está financiado por inversionistas externos, esta tasa permite separar la retención administrativa de la empresa del rendimiento neto del socio.
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={savingCompany}
              className="h-9 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 inline-flex items-center gap-2 active:scale-95"
            >
              {savingCompany ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>Guardar Regla JyJ</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Tarjeta: Comisión de Secretaría */}
      <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-2xl text-blue-400 border border-blue-500/20">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Comisión para Secretaría</h3>
              <p className="text-xs text-muted-foreground">
                Regla automatizada para créditos creados por el rol Secretaría.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <CheckCircle2 className="h-3.5 w-3.5" /> Nómina Auto
          </span>
        </div>

        <form onSubmit={handleSaveSecretary} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Modalidad de Liquidación *
              </label>
              <select
                value={secretaryType}
                onChange={e => setSecretaryType(e.target.value)}
                className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="PERCENTAGE_INTEREST" className="bg-[#0D1320] text-white">
                  % Sobre Interés Cobrado (Recomendado)
                </option>
                <option value="PERCENTAGE_PRINCIPAL" className="bg-[#0D1320] text-white">
                  % Sobre Capital Prestado
                </option>
                <option value="FIXED_AMOUNT" className="bg-[#0D1320] text-white">
                  $ Monto Fijo por Crédito
                </option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                {secretaryType === "FIXED_AMOUNT" ? "Monto Fijo en Pesos ($) *" : "Porcentaje Asignado (%) *"}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={secretaryValue}
                  onChange={e => setSecretaryValue(e.target.value)}
                  placeholder={secretaryType === "FIXED_AMOUNT" ? "Ej: 50000" : "Ej: 10"}
                  className="h-10 w-full bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono font-bold">
                  {secretaryType === "FIXED_AMOUNT" ? "COP" : "%"}
                </span>
              </div>
            </div>

          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-start gap-2.5 text-xs text-muted-foreground">
            <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-semibold text-white block mb-0.5">¿Cómo se liquida a la colaboradora?</span>
              Al liquidarse el préstamo en su totalidad, el sistema crea un registro de gasto en nómina (<strong className="text-white font-mono">SALARY</strong>) a favor de la secretaria de forma automática.
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={savingSecretary}
              className="h-9 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 inline-flex items-center gap-2 active:scale-95"
            >
              {savingSecretary ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>Guardar Regla Secretaría</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  )
}
