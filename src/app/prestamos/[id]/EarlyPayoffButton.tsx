"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Loader2, X, Zap, CheckCircle, AlertTriangle, TrendingDown, DollarSign, Calendar, Info } from "lucide-react"
import { calculateEarlyPayoff, confirmEarlyPayoff } from "@/app/actions/payment"
import toast from "react-hot-toast"

type PayoffData = {
  loanId: string
  clientName: string
  remainingPrincipal: number
  proratedInterest: number
  accumulatedLateFees: number
  totalEarlyPayoff: number
  totalIfFullTerm: number
  savings: number
  pendingCount: number
  paidCount: number
  elapsedDays: number
  periodDays: number
  calculatedAt: string
}

export function EarlyPayoffButton({ loanId }: { loanId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState<"loading" | "preview" | "confirm" | "success">("loading")
  const [payoffData, setPayoffData] = useState<PayoffData | null>(null)
  const [error, setError] = useState("")
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fmt = (cents: number) =>
    "$" + (cents / 100).toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const openModal = async () => {
    setIsOpen(true)
    setStep("loading")
    setError("")
    setPayoffData(null)

    const res = await calculateEarlyPayoff(loanId)
    if (res.error) {
      setError(res.error)
      setStep("preview")
    } else if (res.data) {
      setPayoffData(res.data as PayoffData)
      setStep("preview")
    }
  }

  const handleConfirm = async () => {
    if (!payoffData) return
    setProcessing(true)
    const res = await confirmEarlyPayoff(loanId, payoffData.totalEarlyPayoff)
    setProcessing(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      setStep("success")
      setTimeout(() => {
        setIsOpen(false)
        window.location.reload()
      }, 2500)
    }
  }

  const close = () => {
    if (processing) return
    setIsOpen(false)
    setTimeout(() => {
      setStep("loading")
      setPayoffData(null)
      setError("")
    }, 300)
  }

  return (
    <>
      <button
        onClick={openModal}
        className="flex items-center gap-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 hover:border-amber-500/50 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
        title="Calcular y registrar pago total anticipado del préstamo"
      >
        <Zap className="h-3.5 w-3.5" />
        Pago Total Anticipado
      </button>

      {isOpen && mounted && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={(e) => { if (e.target === e.currentTarget) close() }}
        >
          <div className="bg-[#0A0F1D] w-full max-w-lg rounded-2xl border border-white/15 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 fade-in duration-200">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 bg-[#0D1424] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500/20 rounded-lg">
                  <Zap className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Pago Total Anticipado</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Liquidación del préstamo antes de su vencimiento</p>
                </div>
              </div>
              <button onClick={close} disabled={processing} className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 rounded-lg transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6">
              
              {/* Loading */}
              {step === "loading" && (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Loader2 className="h-8 w-8 text-amber-400 animate-spin" />
                  <p className="text-sm text-muted-foreground">Calculando monto de liquidación anticipada...</p>
                </div>
              )}

              {/* Preview / Error */}
              {step === "preview" && (
                <div className="space-y-4">
                  {error ? (
                    <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                      <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-300">{error}</p>
                    </div>
                  ) : payoffData && (
                    <>
                      {/* Aviso */}
                      <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                        <Info className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-200 leading-relaxed">
                          Si el cliente paga <strong>hoy</strong>, solo se le cobra el interés proporcional a los días transcurridos del período actual. Los intereses futuros se condonan.
                        </p>
                      </div>

                      {/* Desglose del cálculo */}
                      <div className="bg-slate-900/60 border border-white/[0.06] rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Desglose del monto a pagar</h4>
                        </div>
                        <div className="p-4 space-y-3">
                          
                          {/* Capital */}
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-3.5 w-3.5 text-blue-400" />
                              <span className="text-sm text-slate-300">Capital pendiente</span>
                            </div>
                            <span className="font-mono font-bold text-blue-400 text-sm">{fmt(payoffData.remainingPrincipal)}</span>
                          </div>

                          {/* Interés prorrateado */}
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <TrendingDown className="h-3.5 w-3.5 text-emerald-400" />
                              <div>
                                <span className="text-sm text-slate-300">Interés a hoy</span>
                                <span className="text-[10px] text-muted-foreground ml-1.5">
                                  ({payoffData.elapsedDays} de {payoffData.periodDays} días del período)
                                </span>
                              </div>
                            </div>
                            <span className="font-mono font-bold text-emerald-400 text-sm">{fmt(payoffData.proratedInterest)}</span>
                          </div>

                          {/* Mora si aplica */}
                          {payoffData.accumulatedLateFees > 0 && (
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
                                <span className="text-sm text-slate-300">Mora acumulada</span>
                              </div>
                              <span className="font-mono font-bold text-orange-400 text-sm">{fmt(payoffData.accumulatedLateFees)}</span>
                            </div>
                          )}

                          {/* Total */}
                          <div className="border-t border-white/[0.08] pt-3 flex justify-between items-center">
                            <span className="text-sm font-bold text-white">Total a Pagar Hoy</span>
                            <span className="font-mono font-extrabold text-amber-400 text-lg">{fmt(payoffData.totalEarlyPayoff)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Comparación vs pagar todo */}
                      {payoffData.savings > 0 && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex justify-between items-center">
                          <div>
                            <p className="text-xs font-semibold text-emerald-300">💰 Ahorro del cliente vs. pagar todas las cuotas</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Si continuara: {fmt(payoffData.totalIfFullTerm)}</p>
                          </div>
                          <span className="font-mono font-extrabold text-emerald-400 text-base">{fmt(payoffData.savings)}</span>
                        </div>
                      )}

                      {/* Info cuotas */}
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{payoffData.paidCount} cuota(s) pagadas • {payoffData.pendingCount} cuota(s) pendiente(s) se liquidarán</span>
                      </div>

                      {/* Botón confirmar */}
                      <button
                        onClick={() => setStep("confirm")}
                        className="w-full mt-2 bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-xl text-sm transition-all active:scale-95"
                      >
                        Confirmar Pago de {fmt(payoffData.totalEarlyPayoff)}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Confirmación final */}
              {step === "confirm" && payoffData && (
                <div className="space-y-5">
                  <div className="flex flex-col items-center text-center gap-3 py-4">
                    <div className="h-14 w-14 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                      <AlertTriangle className="h-7 w-7 text-amber-400" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-base">¿Confirmar liquidación total?</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Se registrará un pago de <span className="text-amber-400 font-bold">{fmt(payoffData.totalEarlyPayoff)}</span> y el préstamo quedará <span className="text-emerald-400 font-bold">cerrado</span>.
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">Esta acción no se puede deshacer.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep("preview")}
                      disabled={processing}
                      className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-muted-foreground hover:bg-white/5 transition-all disabled:opacity-50"
                    >
                      Volver
                    </button>
                    <button
                      onClick={handleConfirm}
                      disabled={processing}
                      className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {processing ? <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</> : "✓ Sí, liquidar préstamo"}
                    </button>
                  </div>
                </div>
              )}

              {/* Éxito */}
              {step === "success" && (
                <div className="flex flex-col items-center text-center gap-4 py-8">
                  <div className="h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center animate-in zoom-in duration-300">
                    <CheckCircle className="h-9 w-9 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-extrabold text-white text-lg">¡Préstamo Liquidado!</p>
                    <p className="text-sm text-muted-foreground mt-1">El préstamo ha sido cerrado exitosamente. Redirigiendo...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
