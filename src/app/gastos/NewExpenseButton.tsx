"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Plus, X } from "lucide-react"
import { createExpense } from "@/app/actions/expense"
import { CurrencyInput } from "@/components/ui/CurrencyInput"

export function NewExpenseButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [amount, setAmount] = useState("")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    formData.set("amount", amount) // Overwrite amount with the unformatted value from state
    
    const result = await createExpense(formData)

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
        className="flex items-center gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-destructive/20"
      >
        <Plus className="h-5 w-5" />
        Registrar Gasto
      </button>

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md max-h-[90vh] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-white/5">
              <h2 className="text-xl font-bold text-white">Nuevo Gasto Administrativo</h2>
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
                <label className="text-sm font-medium text-muted-foreground">Descripción *</label>
                <input name="description" required className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-destructive transition-colors" placeholder="Ej: Pago de internet" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground">Monto ($) *</label>
                <CurrencyInput 
                  name="amount" 
                  required 
                  value={amount}
                  onChange={(val) => setAmount(val)}
                  className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-destructive transition-colors" 
                  placeholder="0" 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground">Categoría</label>
                <select name="category" className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-destructive transition-colors">
                  <option className="bg-background" value="OFFICE">Papelería / Oficina</option>
                  <option className="bg-background" value="SALARY">Salarios / Honorarios</option>
                  <option className="bg-background" value="UTILITIES">Servicios Públicos</option>
                  <option className="bg-background" value="OTHER">Otro</option>
                </select>
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
                  className="bg-destructive hover:bg-destructive/90 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? "Guardando..." : "Registrar Gasto"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
