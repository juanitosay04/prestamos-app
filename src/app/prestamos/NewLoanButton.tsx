"use client"

import { useState } from "react"
import { Plus, X, Calculator, Trash2, Loader2 } from "lucide-react"
import { createLoan } from "@/app/actions/loan"
import { CurrencyInput } from "@/components/ui/CurrencyInput"
import toast from "react-hot-toast"

type Client = { id: string, firstName: string, lastName: string, idDocument: string, isBlacklisted?: boolean }
type Investor = { id: string, name: string }

export function NewLoanButton({ clients, investors }: { clients: Client[], investors: Investor[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Form State
  const [clientId, setClientId] = useState("")
  const [principalAmount, setPrincipalAmount] = useState("")
  const [interestType, setInterestType] = useState("MONTHLY")
  const [interestCalculation, setInterestCalculation] = useState("AMOUNT") // AMOUNT or RATE
  const [interestValue, setInterestValue] = useState("")
  const [secretaryCommissionType, setSecretaryCommissionType] = useState("PERCENTAGE_INTEREST")
  const [secretaryCommission, setSecretaryCommission] = useState("0")
  const [numberOfInstallments, setNumberOfInstallments] = useState("1")
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0])

  // Referral State
  const [hasReferral, setHasReferral] = useState(false)
  const [referredByInvestorId, setReferredByInvestorId] = useState("")

  // Investors State (Array of objects)
  const [selectedInvestors, setSelectedInvestors] = useState<{investorId: string, percentage: string}[]>([])
  
  const currentTotalPercentage = selectedInvestors.reduce((sum, inv) => sum + (parseFloat(inv.percentage) || 0), 0)

  // Preview State
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
      // Simple Interest by rate
      totalInterest = principal * (intVal / 100) * installments
    }

    const installmentAmount = (principal / installments) + (totalInterest / installments)
    setPreview({ installmentAmount, totalInterest })
  }

  const addInvestor = () => {
    if (investors.length > 0) {
      setSelectedInvestors([...selectedInvestors, { investorId: investors[0].id, percentage: "100" }])
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

    if (!clientId) {
      setError("Debe seleccionar un cliente")
      setLoading(false)
      return
    }

    if (currentTotalPercentage > 100) {
      setError(`El total asignado a inversionistas externos no puede superar el 100% (Actual: ${currentTotalPercentage}%)`)
      setLoading(false)
      return
    }

    const principal = Math.round(parseFloat(principalAmount) * 100) // to cents
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

    let secComm = parseFloat(secretaryCommission) || 0
    if (secretaryCommissionType === "FIXED_AMOUNT") {
      secComm = Math.round(secComm * 100)
    }

    const data = {
      clientId,
      principalAmount: principal,
      interestRate,
      interestAmount: interestAmountVal,
      secretaryCommission: secComm,
      secretaryCommissionType,
      interestType,
      startDate,
      numberOfInstallments: parseInt(numberOfInstallments),
      investors: formattedInvestors,
      referredByInvestorId: hasReferral ? referredByInvestorId : undefined
    }

    const result = await createLoan(data)

    if (result?.error) {
      setError(result.error)
      toast.error(result.error)
      setLoading(false)
    } else {
      toast.success("Préstamo emitido correctamente")
      setIsOpen(false)
      window.location.reload()
    }
  }

  const selectedClientData = clients.find(c => c.id === clientId)
  const isSelectedBlacklisted = selectedClientData?.isBlacklisted

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-primary/20"
      >
        <Plus className="h-5 w-5" />
        Crear Préstamo
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl max-h-[90vh] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-white/5">
              <h2 className="text-xl font-bold text-white">Nuevo Préstamo</h2>
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

              {isSelectedBlacklisted && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2">
                  <div className="h-12 w-12 rounded-full bg-destructive/20 text-destructive flex items-center justify-center">
                    <X className="h-6 w-6" />
                  </div>
                  <h3 className="text-destructive font-bold">Cliente en Lista Negra</h3>
                  <p className="text-xs text-destructive/80">Este cliente tiene préstamos marcados como pérdida y no se le pueden emitir nuevos préstamos.</p>
                </div>
              )}
              
              {/* Sección 1: Cliente y Monto */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 col-span-2 md:col-span-1">
                  <label className="text-sm font-medium text-muted-foreground">Cliente *</label>
                  <select 
                    required 
                    value={clientId} 
                    onChange={e => setClientId(e.target.value)}
                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value="" disabled className="bg-background text-muted-foreground">Seleccione un cliente</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id} className="bg-background text-white" disabled={c.isBlacklisted}>
                        {c.firstName} {c.lastName} ({c.idDocument}) {c.isBlacklisted ? " - (LISTA NEGRA)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 col-span-2 md:col-span-1">
                  <label className="text-sm font-medium text-muted-foreground">Capital Prestado ($) *</label>
                  <CurrencyInput 
                    required 
                    value={principalAmount}
                    onChange={(val) => { setPrincipalAmount(val); setPreview(null); }}
                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary transition-colors" 
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
                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary transition-colors"
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
                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value="AMOUNT" className="bg-background">Monto Fijo Total ($)</option>
                    <option value="RATE" className="bg-background">Porcentaje (%)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-emerald-400">
                    {interestCalculation === "AMOUNT" ? "Monto Total Interés ($)" : "Tasa de Interés (%)"} *
                  </label>
                  {interestCalculation === "AMOUNT" ? (
                    <CurrencyInput 
                      required 
                      value={interestValue}
                      onChange={(val) => { setInterestValue(val); setPreview(null); }}
                      className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 text-emerald-100 focus:outline-none focus:border-emerald-500 transition-colors" 
                    />
                  ) : (
                    <input 
                      required 
                      type="number" 
                      step="0.01"
                      value={interestValue}
                      onChange={e => { setInterestValue(e.target.value); setPreview(null); }}
                      className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 text-emerald-100 focus:outline-none focus:border-emerald-500 transition-colors" 
                    />
                  )}
                </div>
              </div>

              {/* Comisión Secretaria */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
                <div className="flex flex-col gap-1.5 justify-center">
                  <h3 className="text-sm font-bold text-blue-400">Comisión de Secretaria</h3>
                  <p className="text-xs text-muted-foreground">Esta comisión se generará como gasto al finalizar el préstamo.</p>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-blue-300">Tipo de Comisión</label>
                    <select 
                      value={secretaryCommissionType}
                      onChange={e => setSecretaryCommissionType(e.target.value)}
                      className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="PERCENTAGE_INTEREST" className="bg-background">% sobre los Intereses</option>
                      <option value="PERCENTAGE_PRINCIPAL" className="bg-background">% sobre el Capital</option>
                      <option value="FIXED_AMOUNT" className="bg-background">Monto Fijo en Dinero ($)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-blue-300">
                      {secretaryCommissionType === "FIXED_AMOUNT" ? "Valor ($)" : "Porcentaje (%)"}
                    </label>
                    {secretaryCommissionType === "FIXED_AMOUNT" ? (
                      <CurrencyInput 
                        required 
                        value={secretaryCommission}
                        onChange={(val) => setSecretaryCommission(val)}
                        className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2 text-blue-100 focus:outline-none focus:border-blue-500 transition-colors" 
                      />
                    ) : (
                      <input 
                        required 
                        type="number" 
                        step="0.1"
                        min="0"
                        max="100"
                        value={secretaryCommission}
                        onChange={e => setSecretaryCommission(e.target.value)}
                        className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2 text-blue-100 focus:outline-none focus:border-blue-500 transition-colors" 
                      />
                    )}
                  </div>
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
                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary transition-colors" 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Fecha de Inicio *</label>
                  <input 
                    required 
                    type="date" 
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary transition-colors" 
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
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mt-2 flex justify-between items-center text-sm">
                    <div>
                      <span className="text-muted-foreground block">Interés Total:</span>
                      <span className="text-white font-bold">${preview.totalInterest.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-primary block font-medium">Cuota Esperada:</span>
                      <span className="text-primary text-xl font-bold">${preview.installmentAmount.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
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
                  <p className="text-xs text-muted-foreground italic">El préstamo no tiene inversionistas externos asignados (Fondeo Propio).</p>
                ) : (
                  <div className="space-y-3">
                    {selectedInvestors.map((inv, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <select 
                          value={inv.investorId}
                          onChange={e => updateInvestor(idx, "investorId", e.target.value)}
                          className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary transition-colors"
                        >
                          {investors.map(i => <option key={i.id} value={i.id} className="bg-background">{i.name}</option>)}
                        </select>
                        <div className="flex items-center gap-1 w-32">
                          <input 
                            type="number" 
                            step="0.01" 
                            value={inv.percentage}
                            onChange={e => updateInvestor(idx, "percentage", e.target.value)}
                            placeholder="%"
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary transition-colors"
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                        <button type="button" onClick={() => removeInvestor(idx)} className="p-2 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <div className={`text-xs font-bold text-right pt-2 ${currentTotalPercentage > 100 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      Total Asignado a Inversionistas: {currentTotalPercentage}% / 100%
                      {currentTotalPercentage < 100 && (
                        <span className="block font-normal italic mt-0.5">El {100 - currentTotalPercentage}% restante será fondeado por JyJ.</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Sección 5: Referidos */}
              <div className="pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <input 
                    type="checkbox" 
                    id="hasReferral"
                    checked={hasReferral}
                    onChange={(e) => setHasReferral(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-black/50 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-background"
                  />
                  <label htmlFor="hasReferral" className="text-sm font-semibold text-emerald-400 cursor-pointer">
                    ¿El cliente viene referenciado por un inversor?
                  </label>
                </div>
                
                {hasReferral && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex flex-col gap-3">
                    <p className="text-xs text-emerald-400/80">
                      Automáticamente, se le asignará un 3% extra de comisión sobre los intereses al inversor seleccionado (descontado de la ganancia general).
                    </p>
                    <select 
                      required={hasReferral}
                      value={referredByInvestorId}
                      onChange={e => setReferredByInvestorId(e.target.value)}
                      className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value="" disabled className="bg-background text-muted-foreground">Seleccione el inversor que refirió</option>
                      {investors.map(i => <option key={i.id} value={i.id} className="bg-background">{i.name}</option>)}
                    </select>
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
                  disabled={loading || !preview || isSelectedBlacklisted}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  title={!preview ? "Debe calcular las cuotas primero" : isSelectedBlacklisted ? "Cliente en Lista Negra" : ""}
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Emitir Préstamo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
