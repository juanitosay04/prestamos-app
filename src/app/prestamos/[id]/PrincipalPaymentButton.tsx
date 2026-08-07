"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { ArrowDownToLine, Loader2, X, AlertCircle, TrendingDown, Clock, Sparkles, CheckCircle2, ShieldCheck, Users, Wallet } from "lucide-react"
import { registerPrincipalPayment } from "@/app/actions/loan"
import { CurrencyInput } from "@/components/ui/CurrencyInput"

type Props = {
  loanId: string
  outstandingPrincipal: number
  interestRate?: number
  interestType?: string
  installmentAmount?: number
  pendingInstallmentsCount?: number
  totalInstallments?: number
  remainingInterestCurrentPlan?: number
  investors?: {
    investor: { name: string }
    participationPercentage: number
    investedAmount: number
  }[]
}

export function PrincipalPaymentButton({ 
  loanId, 
  outstandingPrincipal,
  interestRate = 0,
  interestType = "MONTHLY",
  installmentAmount = 0,
  pendingInstallmentsCount = 0,
  totalInstallments = 0,
  remainingInterestCurrentPlan = 0,
  investors = []
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  const [amountStr, setAmountStr] = useState("")
  const [adjustmentType, setAdjustmentType] = useState<"REDUCE_AMOUNT" | "REDUCE_TERM">("REDUCE_TERM")

  const outstandingPesos = Math.round(outstandingPrincipal / 100)
  const abonoPesos = parseFloat(amountStr) || 0
  const newPrincipalPesos = Math.max(0, outstandingPesos - abonoPesos)
  const iRate = interestRate / 100
  const isFrench = interestRate > 0 && pendingInstallmentsCount > 1
  const currentQuotaPesos = Math.round(installmentAmount / 100)
  const remainingInterestPesos = Math.round(remainingInterestCurrentPlan / 100)

  // -------------------------------------------------------------
  // SIMULACIONES FINANCIERAS EN TIEMPO REAL
  // -------------------------------------------------------------
  let simReduceAmount = null
  let simReduceTerm = null
  let isFullPayoff = false

  if (abonoPesos > 0 && abonoPesos <= outstandingPesos) {
    if (newPrincipalPesos === 0) {
      isFullPayoff = true
      simReduceAmount = {
        newQuota: 0,
        remainingTerms: 0,
        savedTerms: pendingInstallmentsCount,
        totalInterestToPay: 0,
        interestSaved: remainingInterestPesos,
      }
      simReduceTerm = {
        newQuota: 0,
        remainingTerms: 0,
        savedTerms: pendingInstallmentsCount,
        totalInterestToPay: 0,
        interestSaved: remainingInterestPesos,
      }
    } else {
      // 1. SIMULACIÓN: REDUCIR CUOTA (Mismo plazo, menor cuota)
      let newQuotaA = 0
      let interestToPayA = 0

      if (isFrench) {
        newQuotaA = Math.round(newPrincipalPesos * (iRate / (1 - Math.pow(1 + iRate, -pendingInstallmentsCount))))
        interestToPayA = (newQuotaA * pendingInstallmentsCount) - newPrincipalPesos
      } else {
        interestToPayA = Math.round(newPrincipalPesos * iRate * pendingInstallmentsCount)
        newQuotaA = Math.round((newPrincipalPesos + interestToPayA) / pendingInstallmentsCount)
      }
      const savedInterestA = Math.max(0, remainingInterestPesos - interestToPayA)

      simReduceAmount = {
        newQuota: newQuotaA,
        quotaDifference: Math.max(0, currentQuotaPesos - newQuotaA),
        remainingTerms: pendingInstallmentsCount,
        totalInterestToPay: interestToPayA,
        interestSaved: savedInterestA,
      }

      // 2. SIMULACIÓN: REDUCIR PLAZO (Misma cuota, menos cuotas)
      let tempPrincipal = newPrincipalPesos
      let newTermsCount = 0
      let interestToPayB = 0

      if (isFrench) {
        while (tempPrincipal > 0 && newTermsCount < pendingInstallmentsCount + 12) {
          newTermsCount++
          const intPart = Math.round(tempPrincipal * iRate)
          let prinPart = currentQuotaPesos - intPart
          if (prinPart > tempPrincipal || prinPart <= 0) {
            prinPart = tempPrincipal
          }
          interestToPayB += intPart
          tempPrincipal -= prinPart
        }
      } else {
        const fixedPrinPart = Math.round(outstandingPesos / (pendingInstallmentsCount || 1))
        newTermsCount = Math.ceil(newPrincipalPesos / (fixedPrinPart || 1))
        interestToPayB = Math.round(newPrincipalPesos * iRate * newTermsCount)
      }

      const savedTerms = Math.max(0, pendingInstallmentsCount - newTermsCount)
      const savedInterestB = Math.max(0, remainingInterestPesos - interestToPayB)

      simReduceTerm = {
        newQuota: currentQuotaPesos,
        remainingTerms: newTermsCount,
        savedTerms,
        totalInterestToPay: interestToPayB,
        interestSaved: savedInterestB,
      }
    }
  }

  const interestAdvantage = (simReduceTerm && simReduceAmount) 
    ? Math.max(0, simReduceTerm.interestSaved - simReduceAmount.interestSaved) 
    : 0

  const handleOpen = () => {
    setAmountStr("")
    setAdjustmentType("REDUCE_TERM")
    setError("")
    setIsOpen(true)
  }

  const setPresetPercentage = (pct: number) => {
    const calculated = Math.round(outstandingPesos * (pct / 100))
    setAmountStr(calculated.toString())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const amountInCents = Math.round(parseFloat(amountStr) * 100)
    if (isNaN(amountInCents) || amountInCents <= 0) {
      setError("Por favor ingresa un monto válido.")
      setLoading(false)
      return
    }

    if (amountInCents > outstandingPrincipal) {
      setError(`El abono ($${(amountInCents / 100).toLocaleString('es-CO')}) no puede superar el capital pendiente ($${outstandingPesos.toLocaleString('es-CO')}).`)
      setLoading(false)
      return
    }

    const res = await registerPrincipalPayment(loanId, amountInCents, adjustmentType)
    if (res && 'error' in res && res.error) {
      setError(res.error)
      setLoading(false)
    } else {
      setIsOpen(false)
      setAmountStr("")
      setLoading(false)
      window.location.reload()
    }
  }

  return (
    <>
      <button 
        onClick={handleOpen}
        className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-emerald-600/20 text-sm"
      >
        <ArrowDownToLine className="h-4 w-4" />
        Abono a Capital
      </button>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 text-left">
          <div className="bg-card w-full max-w-2xl max-h-[92vh] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-white/5 bg-emerald-500/10">
              <div>
                <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
                  <ArrowDownToLine className="h-5 w-5" />
                  Abono Extraordinario a Capital
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Simulación de impacto financiero y liquidación exacta para inversionistas
                </p>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-muted-foreground hover:text-white transition-colors p-2 bg-white/5 hover:bg-white/10 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 overflow-y-auto">
              {error && (
                <div className="p-3 bg-destructive/20 text-destructive text-sm rounded-xl border border-destructive/20 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                </div>
              )}

              {/* Tarjeta Resumen del Préstamo Actual */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" /> Estado Actual de la Deuda
                  </span>
                  <span className="text-xs font-mono text-emerald-400/90 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full">
                    {pendingInstallmentsCount} cuotas restantes
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Capital Pendiente:</span>
                    <span className="font-bold text-white text-base font-mono">${outstandingPesos.toLocaleString('es-CO')}</span>
                  </div>
                  {currentQuotaPesos > 0 && (
                    <div>
                      <span className="text-muted-foreground block">Cuota Fija Actual:</span>
                      <span className="font-bold text-white text-base font-mono">${currentQuotaPesos.toLocaleString('es-CO')}</span>
                    </div>
                  )}
                  {remainingInterestPesos > 0 && (
                    <div>
                      <span className="text-muted-foreground block">Intereses por Recaudar:</span>
                      <span className="font-bold text-emerald-300 text-base font-mono">${remainingInterestPesos.toLocaleString('es-CO')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Input: Monto a Abonar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-white">Monto a Abonar al Capital ($) *</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPresetPercentage(25)}
                      className="text-[11px] bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white px-2 py-1 rounded border border-white/10 font-mono transition-colors"
                    >
                      25%
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetPercentage(50)}
                      className="text-[11px] bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white px-2 py-1 rounded border border-white/10 font-mono transition-colors"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetPercentage(100)}
                      className="text-[11px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-2 py-1 rounded border border-emerald-500/30 font-mono font-bold transition-colors"
                    >
                      100% (Total)
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">$</span>
                  <CurrencyInput 
                    value={amountStr}
                    onChange={(val) => setAmountStr(val)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white focus:outline-none focus:border-emerald-500 text-lg font-bold font-mono transition-colors"
                    placeholder="Ej. 500.000"
                    required
                  />
                </div>

                {abonoPesos > 0 && (
                  <div className="flex justify-between items-center text-xs text-muted-foreground px-1 font-mono">
                    <span>Nuevo saldo tras abono: <strong className="text-white">${newPrincipalPesos.toLocaleString('es-CO')}</strong></span>
                    {isFullPayoff && <span className="text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Liquidación Total</span>}
                  </div>
                )}
              </div>

              {/* REPARTICIÓN EXACTA DE CAPITAL ENTRE INVERSIONISTAS */}
              {abonoPesos > 0 && investors && investors.length > 0 && (
                <div className="bg-white/5 border border-emerald-500/30 rounded-2xl p-4 space-y-3 shadow-inner">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-400">
                        <Wallet className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Repartición de este Capital a Inversionistas</h4>
                        <p className="text-[11px] text-muted-foreground">Distribución 100% pura a capital según participación</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Total: ${abonoPesos.toLocaleString('es-CO')}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {investors.map((inv, idx) => {
                      const sharePesos = Math.round(abonoPesos * (inv.participationPercentage / 100))
                      return (
                        <div 
                          key={idx} 
                          className="flex justify-between items-center p-3 rounded-xl bg-black/40 border border-white/5 hover:border-emerald-500/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
                              {inv.investor.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{inv.investor.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                Aporte: {inv.participationPercentage}% del préstamo
                              </p>
                            </div>
                          </div>
                          <div className="text-right font-mono">
                            <span className="text-base font-extrabold text-emerald-400 block">
                              ${sharePesos.toLocaleString('es-CO')}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                              A devolver a su cuenta
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* SELECCIÓN Y COMPARATIVA EN VIVO */}
              {abonoPesos > 0 && simReduceTerm && simReduceAmount && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-emerald-400" />
                      Elige el Modelo de Reajuste:
                    </label>
                  </div>

                  {isFullPayoff ? (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1.5">
                      <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                      <p className="font-bold text-white text-base">¡El préstamo quedará completamente cancelado!</p>
                      <p className="text-xs text-emerald-300">
                        El cliente ahorra ${simReduceTerm.interestSaved.toLocaleString('es-CO')} en intereses futuros que ya no tendrá que pagar.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      
                      {/* OPCIÓN 1: REDUCIR PLAZO (RECOMENDADO) */}
                      <div 
                        onClick={() => setAdjustmentType('REDUCE_TERM')}
                        className={`relative p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                          adjustmentType === 'REDUCE_TERM' 
                            ? 'bg-blue-500/15 border-blue-500/60 ring-2 ring-blue-500/40 shadow-lg shadow-blue-500/10' 
                            : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="space-y-2.5">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Opción A • Recomendada
                            </span>
                            <input 
                              type="radio" 
                              name="adjustment" 
                              checked={adjustmentType === 'REDUCE_TERM'} 
                              onChange={() => setAdjustmentType('REDUCE_TERM')} 
                              className="text-blue-500 mt-1" 
                            />
                          </div>

                          <div>
                            <h3 className="font-bold text-white text-sm">Reducir Plazo (Terminar Antes)</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">Mantener la misma cuota mensual y recortar meses.</p>
                          </div>

                          <div className="space-y-1.5 pt-2 border-t border-white/5 font-mono text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Cuota mensual:</span>
                              <span className="font-bold text-white">${simReduceTerm.newQuota.toLocaleString('es-CO')}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Plazo restante:</span>
                              <span className="font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                {simReduceTerm.remainingTerms} cuotas {simReduceTerm.savedTerms > 0 && `(¡-${simReduceTerm.savedTerms} cuotas!)`}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Ahorro en intereses:</span>
                              <span className="font-bold text-emerald-400">+${simReduceTerm.interestSaved.toLocaleString('es-CO')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-white/5 text-[11px] text-blue-300 font-medium">
                          ⚡ Mayor ahorro total de intereses para el cliente.
                        </div>
                      </div>

                      {/* OPCIÓN 2: REDUCIR CUOTA */}
                      <div 
                        onClick={() => setAdjustmentType('REDUCE_AMOUNT')}
                        className={`relative p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                          adjustmentType === 'REDUCE_AMOUNT' 
                            ? 'bg-emerald-500/15 border-emerald-500/60 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/10' 
                            : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="space-y-2.5">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <TrendingDown className="h-3 w-3" /> Opción B • Alivio Mensual
                            </span>
                            <input 
                              type="radio" 
                              name="adjustment" 
                              checked={adjustmentType === 'REDUCE_AMOUNT'} 
                              onChange={() => setAdjustmentType('REDUCE_AMOUNT')} 
                              className="text-emerald-500 mt-1" 
                            />
                          </div>

                          <div>
                            <h3 className="font-bold text-white text-sm">Reducir Cuota (Alivio Mensual)</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">Mantener las mismas cuotas pero pagar menos cada mes.</p>
                          </div>

                          <div className="space-y-1.5 pt-2 border-t border-white/5 font-mono text-xs">
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Nueva cuota mensual:</span>
                              <span className="font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                ${simReduceAmount.newQuota.toLocaleString('es-CO')}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Plazo restante:</span>
                              <span className="font-bold text-white">{simReduceAmount.remainingTerms} cuotas (mismo plazo)</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Ahorro en intereses:</span>
                              <span className="font-bold text-emerald-400">+${simReduceAmount.interestSaved.toLocaleString('es-CO')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-white/5 text-[11px] text-emerald-300 font-medium">
                          {simReduceAmount.quotaDifference > 0 
                            ? `📉 Paga $${simReduceAmount.quotaDifference.toLocaleString('es-CO')} menos cada mes.` 
                            : `📉 Reduce el monto mensual de cada cuota.`}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* INSIGHT FINANCIERO COMPARATIVO */}
                  {!isFullPayoff && interestAdvantage > 0 && (
                    <div className="p-3 bg-blue-950/40 border border-blue-500/20 rounded-xl text-xs text-blue-200 flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Consejo Financiero JyJ:</strong> Al elegir <strong>Reducir Plazo</strong>, el cliente ahorra <strong>${interestAdvantage.toLocaleString('es-CO')} adicionales</strong> en intereses vs reducir cuota, porque liquida el capital expuesto mucho más rápido.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Botones de Acción */}
              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-white/5 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={loading || !amountStr || abonoPesos <= 0}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2 text-sm shadow-lg shadow-emerald-600/20"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />}
                  {loading 
                    ? "Procesando..." 
                    : isFullPayoff 
                    ? "Confirmar Liquidación Total" 
                    : adjustmentType === 'REDUCE_TERM' 
                    ? `Confirmar Abono y Reducir Plazo (${simReduceTerm?.remainingTerms || ''} cuotas)` 
                    : `Confirmar Abono y Reducir Cuota ($${simReduceAmount?.newQuota ? simReduceAmount.newQuota.toLocaleString('es-CO') : ''})`
                  }
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
