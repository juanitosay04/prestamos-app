"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { RefreshCw, X, Calculator, Trash2 } from "lucide-react"
import { refinanceLoan } from "@/app/actions/loan"
import { CurrencyInput } from "@/components/ui/CurrencyInput"

type Investor = { id: string, name: string }

export function RefinanceLoanButton({ 
  oldLoanId, 
  clientId, 
  availableInvestors,
  currentInvestors,
  currentPrincipal,
  totalExpected
}: { 
  oldLoanId: string
  clientId: string
  availableInvestors: Investor[]
  currentInvestors?: { investorId: string, participationPercentage: number }[]
  currentPrincipal: number
  totalExpected: number
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Form State pre-filled with reasonable defaults
  const [principalAmount, setPrincipalAmount] = useState((currentPrincipal / 100).toFixed(2))
  const [interestType, setInterestType] = useState("MONTHLY")
  const [interestCalculation, setInterestCalculation] = useState("RATE")
  const [interestValue, setInterestValue] = useState("5")
  const [numberOfInstallments, setNumberOfInstallments] = useState("12")
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0])
  const [upfrontFee, setUpfrontFee] = useState("0")
  
  const initialInvestors = currentInvestors 
    ? currentInvestors.map(i => ({ investorId: i.investorId, percentage: i.participationPercentage.toString() }))
    : []
    
  const [selectedInvestors, setSelectedInvestors] = useState<{investorId: string, percentage: string}[]>(initialInvestors)

  const currentTotalPercentage = selectedInvestors.reduce((sum, inv) => sum + (parseFloat(inv.percentage) || 0), 0)
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
      setSelectedInvestors([...selectedInvestors, { investorId: availableInvestors[0].id, percentage: "100" }])
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (currentTotalPercentage > 100) {
      setError(`El total asignado a inversionistas externos no puede superar el 100% (Actual: ${currentTotalPercentage}%)`)
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
      const p = parseFloat(inv.percentage)
      return {
        investorId: inv.investorId,
        participationPercentage: p,
        investedAmount: Math.round(principal * (p / 100))
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
      window.location.reload() // Reload page to show new status and redirect naturally
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

              <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-sm">
                <p className="text-muted-foreground mb-1">Al refinanciar, este préstamo pasará a estado <strong>REFINANCED</strong> y se creará uno nuevo con las siguientes condiciones.</p>
                <p className="text-muted-foreground">Te sugerimos usar como capital el saldo pendiente o el capital original.</p>
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
              <div className="flex flex-col gap-2">
                <button 
                  type="button" 
                  onClick={handleCalculate}
                  className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Calculator className="h-4 w-4" />
                  Calcular Cuotas (Simulador)
                </button>
                {preview && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-2 flex justify-between items-center text-sm">
                    <div>
                      <span className="text-muted-foreground block">Interés Total:</span>
                      <span className="text-white font-bold">${preview.totalInterest.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-blue-400 block font-medium">Cuota Esperada:</span>
                      <span className="text-blue-400 text-xl font-bold">${preview.installmentAmount.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Sección 4: Inversionistas */}
              <div className="pt-4 border-t border-white/5">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-white">Inversionistas Asignados</h3>
                  <button 
                    type="button" 
                    onClick={addInvestor}
                    className="text-xs bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-full transition-colors border border-white/10"
                  >
                    + Añadir Inversionista
                  </button>
                </div>
                
                {selectedInvestors.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Fondeo Propio de JyJ.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedInvestors.map((inv, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <select 
                          value={inv.investorId}
                          onChange={e => updateInvestor(idx, "investorId", e.target.value)}
                          className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                        >
                          {availableInvestors.map(i => <option key={i.id} value={i.id} className="bg-background">{i.name}</option>)}
                        </select>
                        <div className="flex items-center gap-1 w-32">
                          <input 
                            type="number" 
                            step="0.01" 
                            value={inv.percentage}
                            onChange={e => updateInvestor(idx, "percentage", e.target.value)}
                            placeholder="%"
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                        <button type="button" onClick={() => removeInvestor(idx)} className="p-2 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <div className={`text-xs font-bold text-right pt-2 ${currentTotalPercentage > 100 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      Total Asignado: {currentTotalPercentage}% / 100%
                    </div>
                  </div>
                )}
              </div>

              {/* Acciones Finales */}
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
                  disabled={loading || !preview}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  title={!preview ? "Debe calcular las cuotas primero" : ""}
                >
                  {loading ? "Refinanciando..." : "Confirmar Refinanciación"}
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
