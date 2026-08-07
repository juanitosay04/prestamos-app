"use client"

import { useState } from "react"
import { Plus, X, Loader2, UserPlus } from "lucide-react"
import { createClient } from "@/app/actions/client"
import toast from "react-hot-toast"

export function NewClientButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const result = await createClient(formData)

    if (result.error) {
      setError(result.error)
      toast.error(result.error)
    } else {
      toast.success("Cliente registrado con éxito")
      setIsOpen(false)
    }
    setLoading(false)
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="h-10 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] border border-blue-400/30 inline-flex items-center gap-2 active:scale-95"
      >
        <Plus className="h-4 w-4" />
        <span>Nuevo Cliente</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0D1320] w-full max-w-md max-h-[90vh] rounded-3xl border border-white/[0.1] shadow-2xl overflow-hidden flex flex-col">
            
            <div className="flex justify-between items-center px-6 py-5 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Registrar Cliente</h2>
                  <p className="text-[11px] text-muted-foreground">Ingresa la información personal y de contacto.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1.5 text-muted-foreground hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto">
              {error && (
                <div className="bg-rose-500/10 text-rose-400 text-xs p-3.5 rounded-xl border border-rose-500/20 text-center font-medium">
                  {error}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Nombre *</label>
                  <input name="firstName" required className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Apellido *</label>
                  <input name="lastName" required className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Documento de Identidad (Cédula) *</label>
                <input name="idDocument" required className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition-colors" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Teléfono / WhatsApp *</label>
                <input name="phone" required type="tel" className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition-colors" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Correo Electrónico</label>
                <input name="email" type="email" className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors" />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Ciudad</label>
                  <input name="city" className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Barrio</label>
                  <input name="neighborhood" className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Dirección</label>
                  <input name="address" className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Opciones (Torre / Apto)</label>
                  <input name="addressOptions" className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
              </div>

              <div className="mt-3 flex justify-end gap-2.5 pt-4 border-t border-white/[0.06]">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="h-10 px-4 rounded-xl text-xs font-semibold text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="h-10 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center min-w-[130px] active:scale-95"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
