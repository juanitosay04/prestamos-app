"use client"

import { useState } from "react"
import { Key, ShieldCheck, RefreshCw, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react"
import { createInvestorPortalAccess, resetInvestorPortalPassword } from "@/app/actions/investorPortal"

type PortalUser = { id: string; email: string; name: string; createdAt: Date } | null

export function InvestorPortalAccessCard({
  investorId,
  investorName,
  portalUser,
}: {
  investorId: string
  investorName: string
  portalUser: PortalUser
}) {
  const [mode, setMode] = useState<"view" | "create" | "reset">("view")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleCreate = async () => {
    setLoading(true); setError(""); setSuccess("")
    const res = await createInvestorPortalAccess(investorId, email, password, investorName)
    setLoading(false)
    if (res.error) { setError(res.error) }
    else { setSuccess("¡Acceso creado correctamente!"); setMode("view"); setEmail(""); setPassword("") }
  }

  const handleReset = async () => {
    setLoading(true); setError(""); setSuccess("")
    const res = await resetInvestorPortalPassword(investorId, password)
    setLoading(false)
    if (res.error) { setError(res.error) }
    else { setSuccess("Contraseña actualizada."); setMode("view"); setPassword("") }
  }

  return (
    <div className="bg-[#0D1424] border border-amber-500/20 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-amber-500/15 rounded-lg">
          <Key className="h-4 w-4 text-amber-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Acceso al Portal de Inversionistas</h3>
          <p className="text-[11px] text-muted-foreground">Gestiona las credenciales de acceso privado</p>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-4">
          <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          <p className="text-xs text-emerald-300">{success}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Estado actual */}
      {mode === "view" && (
        <div className="space-y-3">
          {portalUser ? (
            <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <div>
                  <p className="text-xs font-bold text-emerald-300">Acceso activo</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{portalUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => { setMode("reset"); setSuccess("") }}
                className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 border border-amber-500/20 hover:bg-amber-500/10 rounded-lg px-2.5 py-1.5 transition-all"
              >
                <RefreshCw className="h-3 w-3" /> Cambiar contraseña
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-slate-800/40 border border-white/[0.06] rounded-xl p-3">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-xs font-semibold text-slate-400">Sin acceso al portal</p>
                  <p className="text-[10px] text-muted-foreground">Este inversionista no puede ingresar aún</p>
                </div>
              </div>
              <button
                onClick={() => { setMode("create"); setSuccess("") }}
                className="text-[11px] bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg px-3 py-1.5 transition-all"
              >
                Crear acceso
              </button>
            </div>
          )}
        </div>
      )}

      {/* Formulario crear */}
      {mode === "create" && (
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-muted-foreground">Email de acceso</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
              placeholder="correo@ejemplo.com"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-muted-foreground">Contraseña inicial</label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500 transition-colors pr-10"
                placeholder="Mínimo 6 caracteres"
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setMode("view")} className="flex-1 py-2 rounded-lg border border-white/10 text-xs font-semibold text-muted-foreground hover:bg-white/5 transition-all">
              Cancelar
            </button>
            <button onClick={handleCreate} disabled={loading || !email || !password} className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Crear acceso
            </button>
          </div>
        </div>
      )}

      {/* Formulario resetear */}
      {mode === "reset" && (
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-muted-foreground">Nueva contraseña</label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500 transition-colors pr-10"
                placeholder="Mínimo 6 caracteres"
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setMode("view")} className="flex-1 py-2 rounded-lg border border-white/10 text-xs font-semibold text-muted-foreground hover:bg-white/5 transition-all">
              Cancelar
            </button>
            <button onClick={handleReset} disabled={loading || !password} className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Actualizar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
