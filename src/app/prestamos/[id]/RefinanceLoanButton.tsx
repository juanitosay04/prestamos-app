"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { RefreshCw, X, Calculator, Trash2, ArrowRight, Info } from "lucide-react"
import { refinanceLoan } from "@/app/actions/loan"
import { CurrencyInput } from "@/components/ui/CurrencyInput"

type Investor = { id: string, name: string }

export function RefinanceLoanButton({ 
  oldLoanId, 
  clientId, 
  availableInvestors,
  currentInvestors,
  currentPrincipal,
  totalExpected,
  outstandingPrincipal,
  outstandingLateFee = 0
}: { 
  oldLoanId: string
  clientId: string
  availableInvestors: Investor[]
  currentInvestors?: { investorId: string, participationPercentage: number }[]
  currentPrincipal: number
  totalExpected: number
  outstandingPrincipal?: number
  outstandingLateFee?: number
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const effectivePendingCapital = outstandingPrincipal !== undefined ? outstandingPrincipal : currentPrincipal
  const pendingPesos = Math.round((effectivePendingCapital > 0 ? effectivePendingCapital : currentPrincipal) / 100)
  const initialPrincipalValue = pendingPesos.toString()

  // Form State pre-filled with outstanding balance
  const [principalAmount, setPrincipalAmount] = useState(initialPrincipalValue)
  const [interestType, setInterestType] = useState("MONTHLY")
  const [interestCalculation, setInterestCalculation] = useState("RATE")
  const [interestValue, setInterestValue] = useState("5")
  const [numberOfInstallments, setNumberOfInstallments] = useState("12")
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0])
  const [upfrontFee, setUpfrontFee] = useState("0")
  
  const initialInvestors = currentInvestors && currentInvestors.length > 0
    ? currentInvestors.map(i => {
        const amountPesos = Math.round(pendingPesos * (i.participationPercentage / 100)).toString()
        return { investorId: i.investorId, amount: amountPesos }
      })
    : []
    
  const [selectedInvestors, setSelectedInvestors] = useState<{investorId: string, amount: string}[]>(initialInvestors)

  const totalPrincipalNum = parseFloat(principalAmount) || 0
  const currentTotalInvestorAmount = selectedInvestors.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0)
  const currentTotalPercentage = totalPrincipalNum > 0 ? (currentTotalInvestorAmount / totalPrincipalNum) * 100 : 0
  const remainingOwnFunding = Math.max(0, totalPrincipalNum - currentTotalInvestorAmount)
  const remainingOwnPercentage = Math.max(0, 100 - currentTotalPercentage)

  const [preview, setPreview] = useState<{installmentAmount: number, totalInterest: number} | null>(null)

  const handleCalculate = () => {
    const principal = parseFloat(principalAmount)
    const intVal = parseFloat(interestValue)
    const installments = parseInt(numberOfInstallments)

    if (isNaN(principal) || isNaN(intVal) || isNaN(installments) || installments < 1) return

    let totalInterest = 0
    if (interestCalculation === "AMOUNT") {
      totalInterest = intVal
    } else {
      totalInterest = principal * (intVal / 100) * installments
    }

    const installmentAmount = (principal / installments) + (totalInterest / installments)
    setPreview({ installmentAmount, totalInterest })
  }

  const addInvestor = () => {
    if (availableInvestors.length > 0) {
      const remaining = Math.max(0, totalPrincipalNum - currentTotalInvestorAmount)
      const suggested = remaining > 0 ? remaining.toString() : (totalPrincipalNum > 0 ? totalPrincipalNum.toString() : "")
      setSelectedInvestors([...selectedInvestors, { investorId: availableInvestors[0].id, amount: suggested }])
    }
  }

  const removeInvestor = (index: number) => {
    const newArr = [...selectedInvestors]
    newArr.splice(index, 1)
    setSelectedInvestors(newArr)
  }

  const updateInvestor = (index: number, field: string, value: string) => {
    const newArr = [...selectedInvestors]
    newArr[index] = { ...newArr[index], [field]: value }
    setSelectedInvestors(newArr)
  }

  const useExactPendingCapital = () => {
    const exactPesos = Math.round(effectivePendingCapital / 100)
    setPrincipalAmount(exactPesos.toString())
    if (currentInvestors && currentInvestors.length > 0) {
      setSelectedInvestors(
        currentInvestors.map(i => ({
          investorId: i.investorId,
          amount: Math.round(exactPesos * (i.participationPercentage / 100)).toString()
        }))
      )
    }
    setPreview(null)
  }

  const autoDistributeOriginalPercentages = () => {
    if (currentInvestors && currentInvestors.length > 0 && totalPrincipalNum > 0) {
      setSelectedInvestors(
        currentInvestors.map(i => ({
          investorId: i.investorId,
          amount: Math.round(totalPrincipalNum * (i.participationPercentage / 100)).toString()
        }))
      )
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (totalPrincipalNum > 0 && currentTotalInvestorAmount > totalPrincipalNum) {
      setError(`El total asignado a inversionistas ($${currentTotalInvestorAmount.toLocaleString("es-CO")}) no puede superar el monto del préstamo ($${totalPrincipalNum.toLocaleString("es-CO")})`)
      setLoading(false)
      return
    }

    const principal = Math.round(parseFloat(principalAmount) * 100)
    const intVal = parseFloat(interestValue)
    
    let interestRate = 0
    let interestAmountVal = 0

    if (interestCalculation === "AMOUNT") {
      interestAmountVal = Math.round(intVal * 100)
    } else {
      interestRate = intVal
    }

    const formattedInvestors = selectedInvestors.map(inv => {
      const invAmountInPesos = parseFloat(inv.amount) || 0
      const invAmountInCents = Math.round(invAmountInPesos * 100)
      const p = principal > 0 ? (invAmountInCents / principal) * 100 : 0
      return {
        investorId: inv.investorId,
        participationPercentage: parseFloat(p.toFixed(2)),
        investedAmount: invAmountInCents
      }
    })

    const data = {
      clientId,
      principalAmount: principal,
      interestRate,
      interestAmount: interestAmountVal,
      upfrontFee: Math.round((parseFloat(upfrontFee) || 0) * 100),
      interestType,
      startDate,
      numberOfInstallments: parseInt(numberOfInstallments),
      investors: formattedInvestors,
      refinancedFromId: oldLoanId
    }

    const result = await refinanceLoan(oldLoanId, data)

    if (result && 'error' in result && result.error) {
      setError(result.error)
    } else {
      setIsOpen(false)
      window.location.reload()
    }
    setLoading(false)
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20 w-full md:w-auto"
      >
        <RefreshCw className="h-4 w-4" />
        Refinanciar Préstamo
      </button>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left">
          <div className="bg-card w-full max-w-2xl max-h-[90vh] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-white/5 bg-blue-600/10">
              <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2">
                <RefreshCw className="h-5 w-5" /> Refinanciar Préstamo
              </h2>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6 overflow-y-auto">
              {error && (
                <div className="bg-destructive/20 text-destructive text-sm p-3 rounded-lg border border-destructive/20">
                  {error}
                </div>
              )}

              {/* Saldo insoluto y balance pendiente */}
              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="h-4 w-4" /> Estado de la Deuda Actual
                  </span>
                  <button 
                    type="button" 
                    onClick={useExactPendingCapital}
                    className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded font-medium transition-colors"
                  >
                    Usar Capital Insoluto
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Capital Pendiente:</span>
                    <span className="font-bold text-white text-sm">${(effectivePendingCapital / 100).toLocaleString('es-CO')}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Capital Original:</span>
                    <span className="font-bold text-white text-sm">${(currentPrincipal / 100).toLocaleString('es-CO')}</span>
                  </div>
                  {outstandingLateFee > 0 && (
                    <div>
                      <span className="text-destructive block">Mora Acumulada:</span>
                      <span className="font-bold text-destructive text-sm">${(outstandingLateFee / 100).toLocaleString('es-CO')}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Sección 1: Monto */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground">Nuevo Capital a Financiar ($) *</label>
                <CurrencyInput 
                  required 
                  value={principalAmount}
                  onChange={(val) => { setPrincipalAmount(val); setPreview(null); }}
                  className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors text-lg font-bold" 
                />
              </div>

              {/* Cobros Adicionales */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground">Cobro Único Inicial (Seguro, 4x1000, etc) $</label>
                <CurrencyInput 
                  value={upfrontFee}
                  onChange={(val) => setUpfrontFee(val)}
                  className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                />
              </div>

              {/* Sección 2: Condiciones de Interés */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border border-white/5 bg-white/5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Frecuencia</label>
                  <select 
                    value={interestType} 
                    onChange={e => setInterestType(e.target.value)}
                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="MONTHLY" className="bg-background">Mensual</option>
                    <option value="BIWEEKLY" className="bg-background">Quincenal</option>
                    <option value="WEEKLY" className="bg-background">Semanal</option>
                    <option value="DAILY" className="bg-background">Diario</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Tipo de Interés</label>
                  <select 
                    value={interestCalculation} 
                    onChange={e => { setInterestCalculation(e.target.value); setPreview(null); }}
                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="AMOUNT" className="bg-background">Monto Fijo Total ($)</option>
                    <option value="RATE" className="bg-background">Porcentaje (%)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-blue-400">
                    {interestCalculation === "AMOUNT" ? "Monto Total Interés ($)" : "Tasa de Interés (%)"} *
                  </label>
                  {interestCalculation === "AMOUNT" ? (
                    <CurrencyInput 
                      required 
                      value={interestValue}
                      onChange={(val) => { setInterestValue(val); setPreview(null); }}
                      className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2 text-blue-100 focus:outline-none focus:border-blue-500 transition-colors" 
                    />
                  ) : (
                    <input 
                      required 
                      type="number" 
                      step="0.01"
                      value={interestValue}
                      onChange={e => { setInterestValue(e.target.value); setPreview(null); }}
                      className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2 text-blue-100 focus:outline-none focus:border-blue-500 transition-colors" 
                    />
                  )}
                </div>
              </div>

              {/* Sección 3: Cuotas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Número de Cuotas *</label>
                  <input 
                    required 
                    type="number" 
                    min="1"
                    value={numberOfInstallments}
                    onChange={e => { setNumberOfInstallments(e.target.value); setPreview(null); }}
                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Fecha de Inicio *</label>
                  <input 
                    required 
                    type="date" 
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                  />
                </div>
              </div>

              {/* Simulador */}
              <div className="border border-white/5 bg-white/5 p-4 rounded-xl flex flex-col gap-3">
                <button 
                  type="button" 
                  onClick={handleCalculate}
                  className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white p-2 rounded-lg text-sm font-medium transition-colors border border-white/10"
                >
                  <Calculator className="h-4 w-4" /> Simular Cuota Estimada
                </button>

                {preview && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                    <div>
                      <p className="text-xs text-muted-foreground">Valor Cuota Fija Estimada</p>
                      <p className="text-lg font-bold text-white">${preview.installmentAmount.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Intereses</p>
                      <p className="text-lg font-bold text-emerald-400">${preview.totalInterest.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Inversionistas / Fondeo Heredado */}
              <div className="border-t border-white/5 pt-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                  <div>
                    <label className="text-sm font-medium text-white block">Aportes de Inversionistas</label>
                    <span className="text-[11px] text-muted-foreground">Define el valor aportado por cada socio para fondear el capital refinanciado.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentInvestors && currentInvestors.length > 0 && (
                      <button 
                        type="button" 
                        onClick={autoDistributeOriginalPercentages}
                        className="text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 font-medium"
                        title="Reajustar montos según los porcentajes originales del préstamo"
                      >
                        <RefreshCw className="h-3 w-3" /> Reajustar % Originales
                      </button>
                    )}
                    {availableInvestors.length > 0 && (
                      <button 
                        type="button" 
                        onClick={addInvestor}
                        className="text-xs bg-white/5 hover:bg-white/10 text-white border border-white/10 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        + Añadir Inversionista
                      </button>
                    )}
                  </div>
                </div>

                {selectedInvestors.map((inv, idx) => {
                  const invAmountNum = parseFloat(inv.amount) || 0
                  const invPct = totalPrincipalNum > 0 ? (invAmountNum / totalPrincipalNum) * 100 : 0
                  const origInv = currentInvestors?.find(ci => ci.investorId === inv.investorId)

                  return (
                    <div key={idx} className="flex gap-2 items-center mb-2 bg-white/[0.02] p-2 rounded-xl border border-white/[0.04]">
                      <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <select
                          value={inv.investorId}
                          onChange={e => updateInvestor(idx, "investorId", e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                        >
                          {availableInvestors.map(ai => (
                            <option key={ai.id} value={ai.id} className="bg-background">{ai.name}</option>
                          ))}
                        </select>
                        {origInv && (
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap px-1.5 py-0.5 rounded bg-white/5 border border-white/5 font-mono">
                            Orig: {origInv.participationPercentage}%
                          </span>
                        )}
                      </div>

                      <div className="relative w-32">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">$</span>
                        <CurrencyInput 
                          value={inv.amount}
                          onChange={val => updateInvestor(idx, "amount", val)}
                          placeholder="Monto aporte"
                          className="w-full bg-black/40 border border-white/10 rounded-lg pl-5 pr-2 py-2 text-xs text-white font-mono"
                        />
                      </div>

                      <div className="px-2 py-1.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-mono font-bold whitespace-nowrap min-w-[50px] text-center">
                        {invPct.toFixed(1)}%
                      </div>

                      <button type="button" onClick={() => removeInvestor(idx)} className="p-2 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })}
                
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/[0.06] flex justify-between items-center text-xs font-mono mt-2">
                  <span className="text-muted-foreground text-[11px]">
                    Fondeo Propio: <strong className="text-white">${remainingOwnFunding.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</strong> ({remainingOwnPercentage.toFixed(1)}%)
                  </span>
                  <span className={`text-[11px] font-bold ${currentTotalInvestorAmount > totalPrincipalNum ? 'text-rose-400' : 'text-emerald-400'}`}>
                    Aporte Socios: ${currentTotalInvestorAmount.toLocaleString("es-CO", { maximumFractionDigits: 0 })} ({currentTotalPercentage.toFixed(1)}%)
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
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
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? "Procesando..." : "Confirmar Refinanciación"}
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
