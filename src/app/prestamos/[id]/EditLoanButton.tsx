"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { Edit3, X, Calculator, Trash2, ShieldAlert } from "lucide-react"
import { updateLoan } from "@/app/actions/loan"
import { CurrencyInput } from "@/components/ui/CurrencyInput"
import { toast } from "sonner"

type Investor = { id: string, name: string }

export function EditLoanButton({ 
  loan,
  availableInvestors
}: { 
  loan: {
    id: string
    principalAmount: number
    interestRate: number
    interestAmount?: number | null
    interestType: string
    upfrontFee?: number | null
    secretaryCommission?: number | null
    secretaryCommissionType?: string | null
    startDate: Date | string
    numberOfInstallments: number
    investors?: { investorId: string, participationPercentage: number }[]
    referredByInvestorId?: string | null
  }
  availableInvestors: Investor[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [principalAmount, setPrincipalAmount] = useState((loan.principalAmount / 100).toString())
  const [interestType, setInterestType] = useState(loan.interestType || "MONTHLY")
  const [interestCalculation, setInterestCalculation] = useState(loan.interestAmount && loan.interestAmount > 0 ? "AMOUNT" : "RATE")
  const [interestValue, setInterestValue] = useState(
    loan.interestAmount && loan.interestAmount > 0 
      ? (loan.interestAmount / 100).toString() 
      : (loan.interestRate || 5).toString()
  )
  const [numberOfInstallments, setNumberOfInstallments] = useState(loan.numberOfInstallments.toString())
  const [startDate, setStartDate] = useState(
    new Date(loan.startDate).toISOString().split("T")[0]
  )
  const [upfrontFee, setUpfrontFee] = useState(((loan.upfrontFee || 0) / 100).toString())
  const [secretaryCommission, setSecretaryCommission] = useState(((loan.secretaryCommission || 0) / 100).toString())
  const [secretaryCommissionType, setSecretaryCommissionType] = useState(loan.secretaryCommissionType || "FIXED_PER_INSTALLMENT")
  const [referredByInvestorId, setReferredByInvestorId] = useState(loan.referredByInvestorId || "")

  const initialInvestors = loan.investors && loan.investors.length > 0
    ? loan.investors.map(i => ({ investorId: i.investorId, percentage: i.participationPercentage.toString() }))
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
      principalAmount: principal,
      interestRate,
      interestAmount: interestAmountVal,
      upfrontFee: Math.round((parseFloat(upfrontFee) || 0) * 100),
      secretaryCommission: Math.round((parseFloat(secretaryCommission) || 0) * 100),
      secretaryCommissionType,
      interestType,
      startDate,
      numberOfInstallments: parseInt(numberOfInstallments),
      investors: formattedInvestors,
      referredByInvestorId: referredByInvestorId || null
    }

    const result = await updateLoan(loan.id, data)

    if (result && 'error' in result && result.error) {
      setError(result.error)
      toast.error(result.error)
    } else {
      toast.success("Préstamo actualizado y tabla de amortización recalculada con éxito")
      setIsOpen(false)
      window.location.reload()
    }
    setLoading(false)
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 px-4 py-2 rounded-lg font-medium transition-colors w-full md:w-auto text-sm"
      >
        <Edit3 className="h-4 w-4" />
        Editar Préstamo
      </button>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left">
          <div className="bg-card w-full max-w-2xl max-h-[90vh] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-white/5 bg-amber-600/10">
              <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
                <Edit3 className="h-5 w-5" /> Modificar Parámetros del Préstamo
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

              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-center gap-2 text-xs text-amber-300">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>Esta acción regenerará completamente la tabla de cuotas de amortización. Solo disponible antes de asentar pagos.</span>
              </div>
              
              {/* Sección 1: Monto Principal */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground">Capital del Préstamo ($) *</label>
                <CurrencyInput 
                  required 
                  value={principalAmount}
                  onChange={(val) => { setPrincipalAmount(val); setPreview(null); }}
                  className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 transition-colors text-lg font-bold" 
                />
              </div>

              {/* Cobros Adicionales & Comisiones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Cobro Único Inicial $</label>
                  <CurrencyInput 
                    value={upfrontFee}
                    onChange={(val) => setUpfrontFee(val)}
                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 transition-colors" 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Comisión Secretaria $</label>
                  <CurrencyInput 
                    value={secretaryCommission}
                    onChange={(val) => setSecretaryCommission(val)}
                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 transition-colors" 
                  />
                </div>
              </div>

              {/* Sección 2: Condiciones de Interés */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border border-white/5 bg-white/5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Frecuencia</label>
                  <select 
                    value={interestType} 
                    onChange={e => setInterestType(e.target.value)}
                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 transition-colors"
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
                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 transition-colors"
                  >
                    <option value="AMOUNT" className="bg-background">Monto Fijo Total ($)</option>
                    <option value="RATE" className="bg-background">Porcentaje (%)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-amber-400">
                    {interestCalculation === "AMOUNT" ? "Monto Total Interés ($)" : "Tasa de Interés (%)"} *
                  </label>
                  {interestCalculation === "AMOUNT" ? (
                    <CurrencyInput 
                      required 
                      value={interestValue}
                      onChange={(val) => { setInterestValue(val); setPreview(null); }}
                      className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-amber-100 focus:outline-none focus:border-amber-500 transition-colors" 
                    />
                  ) : (
                    <input 
                      required 
                      type="number" 
                      step="0.01"
                      value={interestValue}
                      onChange={e => { setInterestValue(e.target.value); setPreview(null); }}
                      className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-amber-100 focus:outline-none focus:border-amber-500 transition-colors" 
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
                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 transition-colors" 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Fecha de Inicio *</label>
                  <input 
                    required 
                    type="date" 
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 transition-colors" 
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
                  <Calculator className="h-4 w-4" /> Recalcular Cuota Estimada
                </button>

                {preview && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                    <div>
                      <p className="text-xs text-muted-foreground">Valor Cuota Fija</p>
                      <p className="text-lg font-bold text-white">${preview.installmentAmount.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Intereses</p>
                      <p className="text-lg font-bold text-emerald-400">${preview.totalInterest.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Inversionistas */}
              <div className="border-t border-white/5 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-white block">Participación de Inversionistas</label>
                  {availableInvestors.length > 0 && currentTotalPercentage < 100 && (
                    <button 
                      type="button" 
                      onClick={addInvestor}
                      className="text-xs bg-white/5 hover:bg-white/10 text-white border border-white/10 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      + Añadir Inversionista
                    </button>
                  )}
                </div>

                {selectedInvestors.map((inv, idx) => (
                  <div key={idx} className="flex gap-2 items-center mb-2">
                    <select
                      value={inv.investorId}
                      onChange={e => updateInvestor(idx, "investorId", e.target.value)}
                      className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    >
                      {availableInvestors.map(ai => (
                        <option key={ai.id} value={ai.id} className="bg-background">{ai.name}</option>
                      ))}
                    </select>
                    <div className="w-24 flex items-center">
                      <input 
                        type="number" 
                        value={inv.percentage} 
                        onChange={e => updateInvestor(idx, "percentage", e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-2 text-sm text-white"
                        placeholder="%"
                      />
                      <span className="text-xs text-muted-foreground ml-1">%</span>
                    </div>
                    <button type="button" onClick={() => removeInvestor(idx)} className="p-2 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                
                <div className="flex justify-between items-center text-xs text-muted-foreground mt-2">
                  <span>Fondeo Propio JyJ: {Math.max(0, 100 - currentTotalPercentage)}%</span>
                  <span>Total Inversionistas: {currentTotalPercentage}%</span>
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
                  className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? "Guardando Cambios..." : "Guardar Modificaciones"}
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
