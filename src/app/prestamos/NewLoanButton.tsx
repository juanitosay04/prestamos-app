"use client"

import { useState, useEffect } from "react"
import { Plus, X, Calculator, Trash2, Loader2, Sparkles, ShieldAlert, Building2, User, ChevronDown, ChevronUp } from "lucide-react"
import { createLoan } from "@/app/actions/loan"
import { CurrencyInput } from "@/components/ui/CurrencyInput"
import toast from "react-hot-toast"

type Client = { id: string, firstName: string, lastName: string, idDocument: string, isBlacklisted?: boolean }
type Investor = { id: string, name: string }
type CommissionSettingsProp = {
  commissionType: string
  commissionValue: number
}

export function NewLoanButton({ 
  clients, 
  investors, 
  userRole,
  defaultCompanyCommission,
  defaultSecretaryCommission
}: { 
  clients: Client[]
  investors: Investor[]
  userRole?: string
  defaultCompanyCommission?: CommissionSettingsProp
  defaultSecretaryCommission?: CommissionSettingsProp
}) {
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
  
  // Commissions
  const [showCommissions, setShowCommissions] = useState(false)
  const [companyCommissionType, setCompanyCommissionType] = useState(defaultCompanyCommission?.commissionType || "PERCENTAGE_INTEREST")
  const [companyCommission, setCompanyCommission] = useState(
    defaultCompanyCommission && defaultCompanyCommission.commissionValue > 0 ? String(defaultCompanyCommission.commissionValue) : "20"
  )
  const [secretaryCommissionType, setSecretaryCommissionType] = useState(defaultSecretaryCommission?.commissionType || "PERCENTAGE_INTEREST")
  const [secretaryCommission, setSecretaryCommission] = useState(
    defaultSecretaryCommission && defaultSecretaryCommission.commissionValue > 0 ? String(defaultSecretaryCommission.commissionValue) : "0"
  )

  const [numberOfInstallments, setNumberOfInstallments] = useState("1")
  
  // Fechas interactivas
  const [disbursementDate, setDisbursementDate] = useState(new Date().toISOString().split("T")[0])
  const [firstPaymentDate, setFirstPaymentDate] = useState("")
  const [biweeklyDay1, setBiweeklyDay1] = useState("15")
  const [biweeklyDay2, setBiweeklyDay2] = useState("30")

  // Funciones de fecha auxiliares
  const addMonths = (date: Date, months: number): Date => {
    const d = new Date(date)
    d.setMonth(d.getMonth() + months)
    return d
  }
  const addWeeks = (date: Date, weeks: number): Date => {
    const d = new Date(date)
    d.setDate(d.getDate() + (weeks * 7))
    return d
  }
  const addDays = (date: Date, days: number): Date => {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d
  }

  function getNextBiweeklyDate(fromDate: Date, day1: number, day2: number): Date {
    const temp = new Date(fromDate)
    for (let k = 1; k <= 45; k++) {
      temp.setDate(temp.getDate() + 1)
      const currentDay = temp.getDate()
      
      const lastDayOfMonth = new Date(temp.getFullYear(), temp.getMonth() + 1, 0).getDate()
      
      if (currentDay === day1) {
        return new Date(temp)
      }
      
      if (day2 >= 30) {
        if (currentDay === lastDayOfMonth && lastDayOfMonth < day2) {
          return new Date(temp)
        } else if (currentDay === day2) {
          return new Date(temp)
        }
      } else {
        if (currentDay === day2) {
          return new Date(temp)
        }
      }
    }
    return temp
  }

  // Autocompletar sugerencia de primera cuota según frecuencia
  useEffect(() => {
    if (!disbursementDate) return
    const parts = disbursementDate.split("-")
    const disDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0)
    
    if (interestType === "MONTHLY") {
      const nextMonth = addMonths(disDate, 1)
      setFirstPaymentDate(nextMonth.toISOString().split("T")[0])
    } else if (interestType === "WEEKLY") {
      const nextWeek = addWeeks(disDate, 1)
      setFirstPaymentDate(nextWeek.toISOString().split("T")[0])
    } else if (interestType === "DAILY") {
      const nextDay = addDays(disDate, 1)
      setFirstPaymentDate(nextDay.toISOString().split("T")[0])
    } else if (interestType === "BIWEEKLY") {
      const d1 = parseInt(biweeklyDay1) || 15
      const d2 = parseInt(biweeklyDay2) || 30
      const nextBiweekly = getNextBiweeklyDate(disDate, d1, d2)
      setFirstPaymentDate(nextBiweekly.toISOString().split("T")[0])
    }
  }, [disbursementDate, interestType, biweeklyDay1, biweeklyDay2])

  // Referral State
  const [hasReferral, setHasReferral] = useState(false)
  const [referredByInvestorId, setReferredByInvestorId] = useState("")

  // Investors State
  const [selectedInvestors, setSelectedInvestors] = useState<{investorId: string, amount: string}[]>([])
  
  const totalPrincipalNum = parseFloat(principalAmount) || 0
  const currentTotalInvestorAmount = selectedInvestors.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0)
  const currentTotalPercentage = totalPrincipalNum > 0 ? (currentTotalInvestorAmount / totalPrincipalNum) * 100 : 0
  const remainingOwnFunding = Math.max(0, totalPrincipalNum - currentTotalInvestorAmount)
  const remainingOwnPercentage = Math.max(0, 100 - currentTotalPercentage)

  // Preview State
  const [preview, setPreview] = useState<{
    installmentAmount: number
    totalInterest: number
    companyCommissionEstimated: number
    secretaryCommissionEstimated: number
    investorEarningsEstimated: number
  } | null>(null)

  // Cálculo en tiempo real reactivo al cambiar cualquier valor
  useEffect(() => {
    const principal = parseFloat(principalAmount) || 0
    const intVal = parseFloat(interestValue) || 0
    const installments = parseInt(numberOfInstallments) || 0

    if (principal <= 0 || intVal <= 0 || installments < 1) {
      setPreview(null)
      return
    }

    let installmentAmount = 0
    let totalInterest = 0

    if (interestCalculation === "AMOUNT") {
      totalInterest = intVal
      const pPart = principal / installments
      const iPart = totalInterest / installments
      installmentAmount = pPart + iPart
    } else if (installments === 1) {
      const iRate = intVal / 100
      totalInterest = principal * iRate
      installmentAmount = principal + totalInterest
    } else {
      const iRate = intVal / 100
      if (iRate > 0) {
        installmentAmount = principal * (iRate / (1 - Math.pow(1 + iRate, -installments)))
      } else {
        installmentAmount = principal / installments
      }
      
      let outstandingPrincipal = principal
      let calculatedTotalInterest = 0
      for (let i = 1; i <= installments; i++) {
        let interestPart = 0
        let principalPart = 0
        if (i === installments) {
          principalPart = outstandingPrincipal
          interestPart = installmentAmount - principalPart
        } else {
          interestPart = outstandingPrincipal * iRate
          principalPart = installmentAmount - interestPart
        }
        calculatedTotalInterest += interestPart
        outstandingPrincipal -= principalPart
      }
      totalInterest = calculatedTotalInterest
    }

    // Estimate Company Commission (JyJ)
    let compCommEst = 0
    const rawCompVal = parseFloat(companyCommission)
    const effectiveCompVal = !isNaN(rawCompVal) ? rawCompVal : (defaultCompanyCommission?.commissionValue ?? 20)
    const effectiveCompType = companyCommissionType || defaultCompanyCommission?.commissionType || "PERCENTAGE_INTEREST"

    if (effectiveCompType === "FIXED_AMOUNT") {
      compCommEst = effectiveCompVal
    } else if (effectiveCompType === "PERCENTAGE_PRINCIPAL") {
      compCommEst = principal * (effectiveCompVal / 100)
    } else {
      compCommEst = totalInterest * (effectiveCompVal / 100)
    }

    // Estimate Secretary Commission
    let secCommEst = 0
    const rawSecVal = parseFloat(secretaryCommission)
    const effectiveSecVal = !isNaN(rawSecVal) ? rawSecVal : (defaultSecretaryCommission?.commissionValue ?? 0)
    const effectiveSecType = secretaryCommissionType || defaultSecretaryCommission?.commissionType || "PERCENTAGE_INTEREST"

    if (effectiveSecType === "FIXED_AMOUNT") {
      secCommEst = effectiveSecVal
    } else if (effectiveSecType === "PERCENTAGE_PRINCIPAL") {
      secCommEst = principal * (effectiveSecVal / 100)
    } else {
      secCommEst = totalInterest * (effectiveSecVal / 100)
    }

    // Investor earnings estimation
    const investorSharePct = principal > 0 ? (currentTotalInvestorAmount / principal) : 0
    const netInterestPool = Math.max(0, totalInterest - compCommEst - secCommEst)
    const investorNetInterest = netInterestPool * investorSharePct

    setPreview({ 
      installmentAmount, 
      totalInterest,
      companyCommissionEstimated: compCommEst,
      secretaryCommissionEstimated: secCommEst,
      investorEarningsEstimated: investorNetInterest
    })
  }, [
    principalAmount,
    interestValue,
    numberOfInstallments,
    interestCalculation,
    companyCommission,
    companyCommissionType,
    secretaryCommission,
    secretaryCommissionType,
    selectedInvestors,
    defaultCompanyCommission,
    defaultSecretaryCommission,
    currentTotalInvestorAmount,
    totalPrincipalNum
  ])

  const addInvestor = () => {
    if (investors.length > 0) {
      const remaining = Math.max(0, totalPrincipalNum - currentTotalInvestorAmount)
      const suggestedAmount = remaining > 0 ? remaining.toString() : (totalPrincipalNum > 0 ? totalPrincipalNum.toString() : "")
      setSelectedInvestors([...selectedInvestors, { investorId: investors[0].id, amount: suggestedAmount }])
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

    if (totalPrincipalNum > 0 && currentTotalInvestorAmount > totalPrincipalNum) {
      setError(`El total aportado por inversionistas ($${currentTotalInvestorAmount.toLocaleString("es-CO")}) no puede superar el monto del préstamo ($${totalPrincipalNum.toLocaleString("es-CO")})`)
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

    let secComm = parseFloat(secretaryCommission) || 0
    if (secretaryCommissionType === "FIXED_AMOUNT") {
      secComm = Math.round(secComm * 100)
    }

    let compComm = parseFloat(companyCommission) || 0
    if (companyCommissionType === "FIXED_AMOUNT") {
      compComm = Math.round(compComm * 100)
    }

    const data = {
      clientId,
      principalAmount: principal,
      interestRate,
      interestAmount: interestAmountVal,
      secretaryCommission: secComm,
      secretaryCommissionType,
      companyCommission: compComm,
      companyCommissionType,
      upfrontFee: Math.round((parseFloat(upfrontFee) || 0) * 100),
      interestType,
      startDate: disbursementDate,
      numberOfInstallments: parseInt(numberOfInstallments),
      investors: formattedInvestors,
      referredByInvestorId: hasReferral ? referredByInvestorId : undefined,
      disbursementDate,
      firstPaymentDate,
      biweeklyDay1,
      biweeklyDay2
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
                  <p className="text-[11px] text-muted-foreground">Configura las condiciones financieras y comisiones del crédito.</p>
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
                        {c.firstName} {c.lastName} ({c.idDocument}) {c.isBlacklisted ? "⚠️ LISTA NEGRA" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Monto del Préstamo (Capital) *</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">$</span>
                    <CurrencyInput 
                      required 
                      value={principalAmount} 
                      onChange={(val) => setPrincipalAmount(val)}
                      placeholder="0"
                      className="h-10 bg-black/40 border border-white/10 rounded-xl pl-8 pr-3.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Frecuencia y Rendimiento */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    onChange={e => setInterestCalculation(e.target.value)}
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
                      onChange={(val) => setInterestValue(val)}
                      className="h-9 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-500 transition-colors" 
                    />
                  ) : (
                    <input 
                      required 
                      type="number" 
                      step="0.01"
                      value={interestValue}
                      onChange={e => setInterestValue(e.target.value)}
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
                    onChange={e => setNumberOfInstallments(e.target.value)}
                    className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition-colors" 
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Fecha de Desembolso *</label>
                  <input 
                    required 
                    type="date" 
                    value={disbursementDate}
                    onChange={e => setDisbursementDate(e.target.value)}
                    className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition-colors" 
                  />
                </div>
              </div>

              {/* Campos dinámicos de fechas según la frecuencia seleccionada */}
              {interestType === "BIWEEKLY" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 animate-in fade-in duration-200">
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-xs font-bold text-blue-400">Día de Pago Quincena 1 *</label>
                    <select
                      value={biweeklyDay1}
                      onChange={e => setBiweeklyDay1(e.target.value)}
                      className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <option key={day} value={day} className="bg-[#0D1320]">Día {day}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-xs font-bold text-blue-400">Día de Pago Quincena 2 *</label>
                    <select
                      value={biweeklyDay2}
                      onChange={e => setBiweeklyDay2(e.target.value)}
                      className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <option key={day} value={day} className="bg-[#0D1320]">Día {day}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 p-4 rounded-2xl border border-blue-500/15 bg-blue-500/5 animate-in fade-in duration-200 text-left">
                  <label className="text-xs font-bold text-blue-400">Fecha de Primera Cuota *</label>
                  <input 
                    required 
                    type="date" 
                    value={firstPaymentDate}
                    onChange={e => setFirstPaymentDate(e.target.value)}
                    className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition-colors" 
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Sugerido automáticamente: 1 {interestType === "MONTHLY" ? "mes" : interestType === "WEEKLY" ? "semana" : "día"} después del desembolso. Puedes ajustarlo libremente.
                  </span>
                </div>
              )}

              {/* Desplegable de Comisiones Personalizadas */}
              <div className="border border-white/[0.06] rounded-2xl overflow-hidden bg-white/[0.01]">
                <button
                  type="button"
                  onClick={() => setShowCommissions(!showCommissions)}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-white transition-colors bg-white/[0.02]"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-emerald-400" />
                    <span>Personalizar Comisiones (Empresa JyJ y Secretaría)</span>
                  </div>
                  {showCommissions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showCommissions && (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/[0.06] animate-in fade-in duration-150">
                    {/* Comisión JyJ */}
                    <div className="space-y-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5" /> Comisión Empresa (JyJ)
                        </div>
                        {defaultCompanyCommission && (
                          <span className="text-[10px] text-emerald-400/80 font-mono font-normal">
                            (Global: {defaultCompanyCommission.commissionValue}%)
                          </span>
                        )}
                      </div>
                      <select
                        value={companyCommissionType}
                        onChange={e => setCompanyCommissionType(e.target.value)}
                        className="w-full h-8 bg-black/40 border border-white/10 rounded-lg px-2.5 text-[11px] text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="PERCENTAGE_INTEREST" className="bg-[#0D1320]">% Sobre Interés Cobrado</option>
                        <option value="PERCENTAGE_PRINCIPAL" className="bg-[#0D1320]">% Sobre Capital Prestado</option>
                        <option value="FIXED_AMOUNT" className="bg-[#0D1320]">$ Monto Fijo</option>
                      </select>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={companyCommission}
                          onChange={e => setCompanyCommission(e.target.value)}
                          placeholder={defaultCompanyCommission ? `Defecto: ${defaultCompanyCommission.commissionValue}` : "0"}
                          className="w-full h-8 bg-black/40 border border-white/10 rounded-lg px-2.5 text-[11px] text-white font-mono focus:outline-none focus:border-emerald-500"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono">
                          {companyCommissionType === "FIXED_AMOUNT" ? "COP" : "%"}
                        </span>
                      </div>
                    </div>

                    {/* Comisión Secretaría */}
                    <div className="space-y-2 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                      <div className="flex items-center justify-between text-xs font-bold text-blue-400">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" /> Comisión Secretaría
                        </div>
                        {defaultSecretaryCommission && (
                          <span className="text-[10px] text-blue-400/80 font-mono font-normal">
                            (Global: {defaultSecretaryCommission.commissionValue}%)
                          </span>
                        )}
                      </div>
                      <select
                        value={secretaryCommissionType}
                        onChange={e => setSecretaryCommissionType(e.target.value)}
                        className="w-full h-8 bg-black/40 border border-white/10 rounded-lg px-2.5 text-[11px] text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="PERCENTAGE_INTEREST" className="bg-[#0D1320]">% Sobre Interés Cobrado</option>
                        <option value="PERCENTAGE_PRINCIPAL" className="bg-[#0D1320]">% Sobre Capital Prestado</option>
                        <option value="FIXED_AMOUNT" className="bg-[#0D1320]">$ Monto Fijo</option>
                      </select>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={secretaryCommission}
                          onChange={e => setSecretaryCommission(e.target.value)}
                          placeholder={defaultSecretaryCommission ? `Defecto: ${defaultSecretaryCommission.commissionValue}` : "0"}
                          className="w-full h-8 bg-black/40 border border-white/10 rounded-lg px-2.5 text-[11px] text-white font-mono focus:outline-none focus:border-blue-500"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono">
                          {secretaryCommissionType === "FIXED_AMOUNT" ? "COP" : "%"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Simulador */}
              <div className="flex flex-col gap-2 pt-1">
                {preview ? (
                  <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-2xl p-4 space-y-3 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center pb-2 border-b border-white/[0.06]">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Interés Total Estimado</span>
                        <span className="text-white font-bold font-mono text-base">${preview.totalInterest.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-blue-400 block text-[10px] uppercase font-bold tracking-wider">Valor Cuota Fija</span>
                        <span className="text-blue-400 text-lg font-extrabold font-mono">${preview.installmentAmount.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1 font-mono">
                      <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                        <span className="text-emerald-400 block text-[10px] font-semibold">
                          Comisión JyJ ({companyCommissionType === 'FIXED_AMOUNT' ? '$' : `${companyCommission || defaultCompanyCommission?.commissionValue || 20}%`}):
                        </span>
                        <span className="text-white font-bold">${preview.companyCommissionEstimated.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="bg-blue-500/10 p-2 rounded-xl border border-blue-500/20">
                        <span className="text-blue-400 block text-[10px] font-semibold">
                          Comisión Secretaría ({secretaryCommissionType === 'FIXED_AMOUNT' ? '$' : `${secretaryCommission || defaultSecretaryCommission?.commissionValue || 0}%`}):
                        </span>
                        <span className="text-white font-bold">${preview.secretaryCommissionEstimated.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
                      </div>
                      {selectedInvestors.length > 0 && (
                        <div className="bg-purple-500/10 p-2 rounded-xl border border-purple-500/20 col-span-2 sm:col-span-1">
                          <span className="text-purple-400 block text-[10px] font-semibold">Rend. Inversionistas:</span>
                          <span className="text-white font-bold">${preview.investorEarningsEstimated.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
                        </div>
                      )}
                    </div>

                    {/* Calendario Estimado de Vencimientos */}
                    <div className="border-t border-white/[0.06] pt-3 text-left">
                      <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider mb-2">
                        Calendario Estimado de Cuotas
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-[10px] max-h-24 overflow-y-auto pr-1">
                        {(() => {
                          const datesList: Date[] = []
                          const installments = parseInt(numberOfInstallments) || 0
                          if (installments >= 1 && disbursementDate) {
                            const parts = disbursementDate.split("-")
                            const disDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0)

                            if (interestType === "MONTHLY" && firstPaymentDate) {
                              const fParts = firstPaymentDate.split("-")
                              const firstPay = new Date(parseInt(fParts[0]), parseInt(fParts[1]) - 1, parseInt(fParts[2]), 12, 0, 0)
                              for (let i = 0; i < installments; i++) {
                                datesList.push(addMonths(firstPay, i))
                              }
                            } else if (interestType === "BIWEEKLY" && biweeklyDay1 && biweeklyDay2) {
                              const day1 = parseInt(biweeklyDay1)
                              const day2 = parseInt(biweeklyDay2)
                              let lastDate = disDate
                              for (let i = 0; i < installments; i++) {
                                const nextDate = getNextBiweeklyDate(lastDate, day1, day2)
                                datesList.push(nextDate)
                                lastDate = nextDate
                              }
                            } else {
                              const fParts = firstPaymentDate ? firstPaymentDate.split("-") : null
                              let currentDate = fParts ? new Date(parseInt(fParts[0]), parseInt(fParts[1]) - 1, parseInt(fParts[2]), 12, 0, 0) : disDate
                              const hasFirstPay = !!firstPaymentDate
                              for (let i = 0; i < installments; i++) {
                                if (i === 0 && hasFirstPay) {
                                  datesList.push(new Date(currentDate))
                                } else {
                                  if (interestType === "WEEKLY") {
                                    currentDate = addWeeks(currentDate, 1)
                                  } else if (interestType === "BIWEEKLY") {
                                    currentDate = addWeeks(currentDate, 2)
                                  } else if (interestType === "DAILY") {
                                    currentDate = addDays(currentDate, 1)
                                  }
                                  datesList.push(new Date(currentDate))
                                }
                              }
                            }
                          }
                          return datesList.map((d, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white/[0.03] p-1.5 rounded border border-white/[0.04] font-mono">
                              <span className="text-muted-foreground">Cuota #{idx + 1}:</span>
                              <span className="text-white font-semibold">
                                {d.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            </div>
                          ))
                        })()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-white/10 rounded-2xl p-4 text-center text-xs text-muted-foreground bg-white/[0.01]">
                    Completa el capital, interés y cuotas para ver la liquidación en tiempo real.
                  </div>
                )}
              </div>

              {/* Sección 4: Inversionistas */}
              <div className="pt-4 border-t border-white/[0.06]">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="text-xs font-bold text-white">Inversionistas y Fondeo Externo</h3>
                    <p className="text-[10px] text-muted-foreground">Define el valor en dinero aportado por cada socio.</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={addInvestor}
                    className="text-xs bg-white/[0.05] hover:bg-white/[0.1] text-white px-3 py-1.5 rounded-xl transition-colors border border-white/[0.08] font-semibold flex items-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5 text-blue-400" />
                    Asignar Socio
                  </button>
                </div>
                
                {selectedInvestors.length === 0 ? (
                  <p className="text-xs text-muted-foreground/80 italic bg-white/[0.02] p-3 rounded-xl border border-white/[0.04]">
                    Fondeo 100% de la empresa (Sin inversionistas externos).
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {selectedInvestors.map((inv, idx) => {
                      const invAmountNum = parseFloat(inv.amount) || 0
                      const invPct = totalPrincipalNum > 0 ? (invAmountNum / totalPrincipalNum) * 100 : 0
                      
                      return (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04]">
                          <select 
                            value={inv.investorId}
                            onChange={e => updateInvestor(idx, "investorId", e.target.value)}
                            className="flex-1 h-9 bg-black/40 border border-white/10 rounded-lg px-3 text-white text-xs focus:outline-none focus:border-blue-500 transition-colors"
                          >
                            {investors.map(i => <option key={i.id} value={i.id} className="bg-[#0D1320]">{i.name}</option>)}
                          </select>
                          
                          <div className="flex items-center gap-2">
                            <div className="relative w-full sm:w-36">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">$</span>
                              <CurrencyInput 
                                value={inv.amount}
                                onChange={val => updateInvestor(idx, "amount", val)}
                                placeholder="Valor aporte"
                                className="w-full h-9 bg-black/40 border border-white/10 rounded-lg pl-6 pr-2 text-white text-xs font-mono focus:outline-none focus:border-blue-500 transition-colors"
                              />
                            </div>

                            <div className="px-2 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-mono font-bold whitespace-nowrap min-w-[54px] text-center" title="Participación en este préstamo">
                              {invPct.toFixed(1)}%
                            </div>

                            <button 
                              type="button" 
                              onClick={() => removeInvestor(idx)} 
                              className="p-2 text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors flex-shrink-0"
                              title="Quitar socio"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}

                    {/* Resumen de Fondeo */}
                    <div className="bg-black/30 p-2.5 rounded-xl border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs font-mono">
                      <div className="text-muted-foreground text-[11px]">
                        Fondeo Propio: <strong className="text-white">${remainingOwnFunding.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</strong> ({remainingOwnPercentage.toFixed(1)}%)
                      </div>
                      <div className={`text-[11px] font-bold ${currentTotalInvestorAmount > totalPrincipalNum ? 'text-rose-400' : 'text-emerald-400'}`}>
                        Aporte Inversionistas: ${currentTotalInvestorAmount.toLocaleString("es-CO", { maximumFractionDigits: 0 })} ({currentTotalPercentage.toFixed(1)}%)
                      </div>
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
