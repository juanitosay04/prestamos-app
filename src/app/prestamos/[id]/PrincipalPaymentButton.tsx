"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { ArrowDownToLine, Loader2, X, AlertCircle } from "lucide-react"
import { registerPrincipalPayment } from "@/app/actions/loan"
import { CurrencyInput } from "@/components/ui/CurrencyInput"

type Props = {
  loanId: string
  outstandingPrincipal: number
}

export function PrincipalPaymentButton({ loanId, outstandingPrincipal }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  const [amountStr, setAmountStr] = useState("")
  const [adjustmentType, setAdjustmentType] = useState<"REDUCE_AMOUNT" | "REDUCE_TERM">("REDUCE_AMOUNT")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const amountInCents = Math.round(parseFloat(amountStr) * 100)
    if (isNaN(amountInCents) || amountInCents <= 0) {
      setError("Monto inválido")
      setLoading(false)
      return
    }

    if (amountInCents > outstandingPrincipal) {
      setError("El abono no puede superar el capital pendiente.")
      setLoading(false)
      return
    }

    const res = await registerPrincipalPayment(loanId, amountInCents, adjustmentType)
    if (res && 'error' in res) {
      setError(res.error)
      setLoading(false)
    } else {
      setIsOpen(false)
      setAmountStr("")
      setLoading(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-emerald-500/20"
      >
        <ArrowDownToLine className="h-4 w-4" />
        Abono a Capital
      </button>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-card/95 w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-white/5 bg-white/5">
              <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
                <ArrowDownToLine className="h-5 w-5" />
                Abono Extraordinario
              </h2>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-white transition-colors p-2 bg-white/5 hover:bg-white/10 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
              {error && (
                <div className="p-3 bg-destructive/20 text-destructive text-sm rounded-xl border border-destructive/20 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> {error}
                </div>
              )}

              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex justify-between items-center">
                <span className="text-sm font-medium text-emerald-400/80">Capital Pendiente Actual:</span>
                <span className="text-lg font-bold text-emerald-400">${(outstandingPrincipal / 100).toLocaleString('es-CO')}</span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Monto a Abonar al Capital ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <CurrencyInput 
                    value={amountStr}
                    onChange={(val) => setAmountStr(val)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="Ej. 500.000"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-white">¿Cómo deseas ajustar el préstamo?</label>
                
                <label className={`block p-4 rounded-xl border cursor-pointer transition-all ${adjustmentType === 'REDUCE_AMOUNT' ? 'bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="adjustment" checked={adjustmentType === 'REDUCE_AMOUNT'} onChange={() => setAdjustmentType('REDUCE_AMOUNT')} className="text-emerald-500" />
                    <div>
                      <p className="font-bold text-white text-sm">Reducir el valor de la cuota</p>
                      <p className="text-xs text-muted-foreground mt-1">El préstamo termina en la misma fecha, pero pagarás menos cada mes/semana.</p>
                    </div>
                  </div>
                </label>

                <label className={`block p-4 rounded-xl border cursor-pointer transition-all ${adjustmentType === 'REDUCE_TERM' ? 'bg-blue-500/10 border-blue-500/50 ring-1 ring-blue-500' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="adjustment" checked={adjustmentType === 'REDUCE_TERM'} onChange={() => setAdjustmentType('REDUCE_TERM')} className="text-blue-500" />
                    <div>
                      <p className="font-bold text-white text-sm">Reducir el plazo (Terminar antes)</p>
                      <p className="text-xs text-muted-foreground mt-1">La cuota sigue costando lo mismo, pero terminarás de pagar el préstamo mucho antes.</p>
                    </div>
                  </div>
                </label>
              </div>

              <button 
                type="submit" 
                disabled={loading || !amountStr}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-xl font-bold transition-colors disabled:opacity-50 flex justify-center items-center gap-2 mt-2"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowDownToLine className="h-5 w-5" />}
                {loading ? "Procesando Abono..." : "Confirmar Abono a Capital"}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
