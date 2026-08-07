"use client"

import { useState } from "react"
import { Plus, X, Calculator, Trash2, Loader2, Sparkles, ShieldAlert } from "lucide-react"
import { createLoan } from "@/app/actions/loan"
import { CurrencyInput } from "@/components/ui/CurrencyInput"
import toast from "react-hot-toast"

type Client = { id: string, firstName: string, lastName: string, idDocument: string, isBlacklisted?: boolean }
type Investor = { id: string, name: string }

export function NewLoanButton({ clients, investors, userRole }: { clients: Client[], investors: Investor[], userRole?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Form State
  const [clientId, setClientId] = useState("")
  const [principalAmount, setPrincipalAmount] = useState("")
  const [interestType, setInterestType] = useState("MONTHLY")
  const [interestCalculation, setInterestCalculation] = useState("AMOUNT")
  const [interestValue, setInterestValue] = useState("")
  const [upfrontFee, setUpfrontFee] = useState("0")
  const [secretaryCommissionType, setSecretaryCommissionType] = useState("PERCENTAGE_INTEREST")
  const [secretaryCommission, setSecretaryCommission] = useState("0")
  const [numberOfInstallments, setNumberOfInstallments] = useState("1")
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0])

  // Referral State
  const [hasReferral, setHasReferral] = useState(false)
  const [referredByInvestorId, setReferredByInvestorId] = useState("")

  // Investors State
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
      upfrontFee: Math.round((parseFloat(upfrontFee) || 0) * 100),
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
        className="h-10 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] border border-blue-400/30 inline-flex items-center gap-2 active:scale-95"
      >
        <Plus className="h-4 w-4" />
        <span>Nuevo Préstamo</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0D1320] w-full max-w-2xl max-h-[90vh] rounded-3xl border border-white/[0.1] shadow-2xl overflow-hidden flex flex-col">
            
            <div className="flex justify-between items-center px-6 py-5 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Emisión de Préstamo</h2>
                  <p className="text-[11px] text-muted-foreground">Configura las condiciones financieras del nuevo crédito.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1.5 text-muted-foreground hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 overflow-y-auto">
              {error && (
                <div className="bg-rose-500/10 text-rose-400 text-xs p-3.5 rounded-xl border border-rose-500/20 text-center font-medium">
                  {error}
                </div>
              )}

              {isSelectedBlacklisted && (
                <div className="bg-rose-950/30 border border-rose-500/30 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2">
                  <div className="h-10 w-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <h3 className="text-rose-400 font-bold text-xs">Cliente en Lista Negra</h3>
                  <p className="text-[11px] text-rose-400/80">Este cliente tiene cartera castigada y el sistema tiene bloqueada la emisión de nuevos créditos.</p>
                </div>
              )}
              
              {/* Sección 1: Cliente y Monto */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Cliente Titular *</label>
                  <select 
                    required 
                    value={clientId} 
                    onChange={e => setClientId(e.target.value)}
                    className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="" disabled className="bg-[#0D1320] text-muted-foreground">Seleccione un cliente</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#0D1320] text-white" disabled={c.isBlacklisted}>
                        {c.firstName} {c.lastName} ({c.idDocument}) {c.isBlacklisted ? " - [LISTA NEGRA]" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Capital a Prestar ($) *</label>
                  <CurrencyInput 
                    required 
                    value={principalAmount}
                    onChange={(val) => { setPrincipalAmount(val); setPreview(null); }}
                    className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition-colors" 
                  />
                </div>
              </div>

              {/* Sección 2: Condiciones de Interés */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground">Frecuencia de Pago</label>
                  <select 
                    value={interestType} 
                    onChange={e => setInterestType(e.target.value)}
                    className="h-9 bg-black/40 border border-white/10 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="MONTHLY" className="bg-[#0D1320]">Mensual</option>
                    <option value="BIWEEKLY" className="bg-[#0D1320]">Quincenal</option>
                    <option value="WEEKLY" className="bg-[#0D1320]">Semanal</option>
                    <option value="DAILY" className="bg-[#0D1320]">Diario</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground">Cálculo de Ganancia</label>
                  <select 
                    value={interestCalculation} 
                    onChange={e => { setInterestCalculation(e.target.value); setPreview(null); }}
                    className="h-9 bg-black/40 border border-white/10 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="AMOUNT" className="bg-[#0D1320]">Monto Fijo Total ($)</option>
                    <option value="RATE" className="bg-[#0D1320]">Tasa Porcentual (%)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-emerald-400">
                    {interestCalculation === "AMOUNT" ? "Interés Total ($)" : "Tasa (%)"} *
                  </label>
                  {interestCalculation === "AMOUNT" ? (
                    <CurrencyInput 
                      required 
                      value={interestValue}
                      onChange={(val) => { setInterestValue(val); setPreview(null); }}
                      className="h-9 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-500 transition-colors" 
                    />
                  ) : (
                    <input 
                      required 
                      type="number" 
                      step="0.01"
                      value={interestValue}
                      onChange={e => { setInterestValue(e.target.value); setPreview(null); }}
                      className="h-9 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-500 transition-colors" 
                    />
                  )}
                </div>
              </div>

              {/* Cobros Iniciales */}
              <div className="flex flex-col gap-1.5 p-3.5 rounded-2xl border border-white/[0.04] bg-white/[0.02]">
                <label className="text-xs font-semibold text-muted-foreground">Cobro Único de Apertura / Seguro ($)</label>
                <CurrencyInput 
                  value={upfrontFee}
                  onChange={(val) => setUpfrontFee(val)}
                  className="h-9 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition-colors" 
                />
              </div>

              {/* Sección 3: Cuotas y Fechas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Número de Cuotas *</label>
                  <input 
                    required 
                    type="number" 
                    min="1"
                    value={numberOfInstallments}
                    onChange={e => { setNumberOfInstallments(e.target.value); setPreview(null); }}
                    className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition-colors" 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Fecha Primera Cuota *</label>
                  <input 
                    required 
                    type="date" 
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition-colors" 
                  />
                </div>
              </div>

              {/* Simulador */}
              <div className="flex flex-col gap-2 pt-1">
                <button 
                  type="button" 
                  onClick={handleCalculate}
                  className="h-10 w-full flex items-center justify-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white px-4 rounded-xl text-xs font-semibold transition-all active:scale-98"
                >
                  <Calculator className="h-3.5 w-3.5 text-blue-400" />
                  Simular Plan de Amortización
                </button>
                {preview && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex justify-between items-center text-xs animate-in fade-in duration-200">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Interés Estimado Total:</span>
                      <span className="text-white font-bold font-mono text-sm">${preview.totalInterest.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-blue-400 block text-[11px] font-semibold">Valor Cuota Fija:</span>
                      <span className="text-blue-400 text-lg font-extrabold font-mono">${preview.installmentAmount.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Sección 4: Inversionistas */}
              <div className="pt-4 border-t border-white/[0.06]">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="text-xs font-bold text-white">Inversionistas y Fondeo</h3>
                    <p className="text-[10px] text-muted-foreground">Distribución de capital entre socios.</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={addInvestor}
                    className="text-xs bg-white/[0.05] hover:bg-white/[0.1] text-white px-3 py-1.5 rounded-xl transition-colors border border-white/[0.08] font-semibold"
                  >
                    + Asignar Socio
                  </button>
                </div>
                
                {selectedInvestors.length === 0 ? (
                  <p className="text-xs text-muted-foreground/80 italic bg-white/[0.02] p-3 rounded-xl border border-white/[0.04]">
                    Fondeo 100% de la empresa (Sin inversionistas externos).
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {selectedInvestors.map((inv, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white/[0.02] p-2 rounded-xl border border-white/[0.04]">
                        <select 
                          value={inv.investorId}
                          onChange={e => updateInvestor(idx, "investorId", e.target.value)}
                          className="flex-1 h-9 bg-black/40 border border-white/10 rounded-lg px-3 text-white text-xs focus:outline-none focus:border-blue-500 transition-colors"
                        >
                          {investors.map(i => <option key={i.id} value={i.id} className="bg-[#0D1320]">{i.name}</option>)}
                        </select>
                        <div className="flex items-center gap-1 w-28">
                          <input 
                            type="number" 
                            step="0.01" 
                            value={inv.percentage}
                            onChange={e => updateInvestor(idx, "percentage", e.target.value)}
                            placeholder="%"
                            className="w-full h-9 bg-black/40 border border-white/10 rounded-lg px-3 text-white text-xs font-mono focus:outline-none focus:border-blue-500 transition-colors"
                          />
                          <span className="text-xs text-muted-foreground font-mono">%</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => removeInvestor(idx)} 
                          className="p-2 text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className={`text-xs font-bold text-right pt-1 font-mono ${currentTotalPercentage > 100 ? 'text-rose-400' : 'text-muted-foreground'}`}>
                      Fondeo Asignado: {currentTotalPercentage}% / 100%
                    </div>
                  </div>
                )}
              </div>

              {/* Acciones Finales */}
              <div className="mt-2 flex justify-end gap-2.5 pt-4 border-t border-white/[0.06]">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="h-10 px-4 rounded-xl text-xs font-semibold text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={loading || !preview || isSelectedBlacklisted}
                  className="h-10 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 active:scale-95"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Emitir Préstamo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
