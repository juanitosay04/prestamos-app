"use client"

import { useState } from "react"
import { login } from "@/app/actions/auth"
import { Loader2, ShieldCheck, Lock, Mail } from "lucide-react"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const result = await login(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#07090E] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[150px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        
        {/* Logo & Brand Header */}
        <div className="text-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-[1.5px] mx-auto mb-5 shadow-2xl shadow-blue-500/20">
            <div className="h-full w-full bg-[#0A0D14] rounded-[14px] flex items-center justify-center">
              <ShieldCheck className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            JyJ Préstamos
          </h1>
          <p className="text-xs text-muted-foreground mt-1.5 font-medium">
            Plataforma Corporativa de Gestión Financiera
          </p>
        </div>

        {/* Login Glass Panel */}
        <div className="glass-panel rounded-3xl p-8 shadow-2xl border border-white/[0.08]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="bg-rose-500/10 text-rose-400 text-xs p-3.5 rounded-xl border border-rose-500/20 text-center font-medium animate-in fade-in duration-200">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground ml-1">
                Correo Corporativo
              </label>
              <div className="relative">
                <input 
                  name="email" 
                  type="email" 
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono placeholder:text-muted-foreground/50"
                  placeholder="usuario@jyjprestamos.com"
                />
                <Mail className="h-4 w-4 text-muted-foreground/60 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground ml-1">
                Contraseña
              </label>
              <div className="relative">
                <input 
                  name="password" 
                  type="password" 
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono placeholder:text-muted-foreground/50"
                  placeholder="••••••••••••"
                />
                <Lock className="h-4 w-4 text-muted-foreground/60 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="mt-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 rounded-xl font-bold text-xs transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                "Acceder al Sistema"
              )}
            </button>
          </form>
        </div>
        
        <p className="text-center text-[11px] text-muted-foreground/70 mt-8 font-mono">
          JyJ Préstamos &copy; {new Date().getFullYear()} • Entorno Seguro
        </p>
      </div>
    </div>
  )
}
