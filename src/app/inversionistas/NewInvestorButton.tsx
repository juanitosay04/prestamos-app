"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
import { createInvestor } from "@/app/actions/investor"

export function NewInvestorButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const result = await createInvestor(formData)

    if (result.error) {
      setError(result.error)
    } else {
      setIsOpen(false)
    }
    setLoading(false)
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-emerald-500/20"
      >
        <Plus className="h-5 w-5" />
        Nuevo Inversionista
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md max-h-[90vh] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-white/5">
              <h2 className="text-xl font-bold text-white">Registrar Inversionista</h2>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto">
              {error && (
                <div className="bg-destructive/20 text-destructive text-sm p-3 rounded-lg border border-destructive/20">
                  {error}
                </div>
              )}
              
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground">Nombre Completo / Razón Social *</label>
                <input name="name" required className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground">Teléfono</label>
                <input name="phone" type="tel" className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground">Correo Electrónico</label>
                <input name="email" type="email" className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  🔑 Llave de Transferencia
                </label>
                <input
                  name="transferKey"
                  className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                  placeholder="Ej: 3001234567 (Nequi), Daviplata, cuenta bancaria..."
                />
                <p className="text-[11px] text-muted-foreground">Número de cuenta, Nequi, Daviplata u otro medio para envío de dinero.</p>
              </div>

              <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-white/5">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-lg font-medium text-muted-foreground hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? "Guardando..." : "Guardar Inversionista"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
