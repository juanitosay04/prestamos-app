"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Calculator, X, TrendingUp, Building2, User, PieChart } from "lucide-react"

type BreakdownProps = {
  installmentNumber: number
  expectedAmount: number
  principalPart: number
  interestPart: number
  lateFee: number
  secretaryCommissionType: string
  secretaryCommission: number
  companyCommissionType: string
  companyCommission: number
  principalAmount: number
  numberOfInstallments: number
  investors: {
    investor: { name: string }
    participationPercentage: number
    investedAmount: number
  }[]
  referredByInvestor?: { name: string } | null
}

export function InstallmentBreakdown({ 
  installmentNumber, 
  expectedAmount, 
  principalPart, 
  interestPart, 
  lateFee,
  secretaryCommissionType,
  secretaryCommission,
  companyCommissionType,
  companyCommission,
  principalAmount,
  numberOfInstallments,
  investors,
  referredByInvestor
}: BreakdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Cálculos del Desglose de Interés
  const totalInterest = interestPart + lateFee
  
  // 1. Extraer la comisión de la secretaria
  let secretaryCommissionAmount = 0
  if (secretaryCommissionType === "FIXED_AMOUNT") {
    secretaryCommissionAmount = Math.round(secretaryCommission / numberOfInstallments)
  } else if (secretaryCommissionType === "PERCENTAGE_PRINCIPAL") {
    const totalCommission = principalAmount * (secretaryCommission / 100)
    secretaryCommissionAmount = Math.round(totalCommission / numberOfInstallments)
  } else {
    secretaryCommissionAmount = Math.round(totalInterest * (secretaryCommission / 100))
  }
  
  // 2. Calcular comisión JyJ desde la config real del préstamo (no hardcoded)
  let jyjCommissionAmount = 0
  if (companyCommissionType === "FIXED_AMOUNT") {
    jyjCommissionAmount = Math.round(companyCommission / numberOfInstallments)
  } else if (companyCommissionType === "PERCENTAGE_PRINCIPAL") {
    jyjCommissionAmount = Math.round((principalAmount * (companyCommission / 100)) / numberOfInstallments)
  } else {
    // PERCENTAGE_INTEREST (más común)
    jyjCommissionAmount = Math.round(totalInterest * (companyCommission / 100))
  }

  // 3. Extraer la comisión de referido si existe (3% sobre la rentabilidad)
  const referralCommissionAmount = referredByInvestor ? Math.round(totalInterest * 0.03) : 0

  // 4. Lo que queda del interés a repartir entre inversionistas (o JyJ como fondeador)
  const remainingInterest = Math.max(0, totalInterest - secretaryCommissionAmount - jyjCommissionAmount - referralCommissionAmount)

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-lg transition-colors flex items-center gap-2"
        title="Ver Desglose Matemático"
      >
        <Calculator className="h-4 w-4" />
      </button>

      {isOpen && mounted && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-card/95 w-full max-w-2xl max-h-[90vh] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-white/5 bg-white/5">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  <PieChart className="h-6 w-6 text-blue-400" />
                  Desglose Cuota #{installmentNumber}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Monto Total a Pagar: <span className="text-white font-bold">${(expectedAmount / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-white transition-colors p-2 bg-white/5 hover:bg-white/10 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-5 sm:p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
              
              {/* Resumen General */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Abono a Capital</p>
                  <p className="text-xl font-bold text-white">${(principalPart / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex flex-col justify-center">
                  <p className="text-xs text-emerald-400 mb-1 uppercase tracking-wider">Interés Cobrado</p>
                  <p className="text-xl font-bold text-emerald-400">${(interestPart / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                {lateFee > 0 && (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex flex-col justify-center col-span-2 sm:col-span-1">
                    <p className="text-xs text-orange-400 mb-1 uppercase tracking-wider">Mora Adicional</p>
                    <p className="text-xl font-bold text-orange-400">+ ${(lateFee / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                )}
              </div>

              {/* Distribución del Interés Total (Comisiones) */}
              {secretaryCommission > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
                    <User className="h-4 w-4 text-blue-400" /> Comisión Secretaria
                  </h3>
                  
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Gestión y Cobro</p>
                        <p className="text-xs text-muted-foreground">
                          {secretaryCommissionType === "FIXED_AMOUNT" 
                            ? "Fracción de comisión fija" 
                            : secretaryCommissionType === "PERCENTAGE_PRINCIPAL" 
                              ? `${secretaryCommission}% sobre el capital` 
                              : `${secretaryCommission}% de la rentabilidad`}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-white">${(secretaryCommissionAmount / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}

              {/* Comisión Fija JyJ */}
              {companyCommission > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
                    <Building2 className="h-4 w-4 text-purple-400" /> Comisión JyJ
                  </h3>
                  
                  <div className="flex justify-between items-center p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Comisión Plataforma JyJ</p>
                        <p className="text-xs text-purple-400/80">
                          {companyCommissionType === "FIXED_AMOUNT"
                            ? "Fracción de comisión fija"
                            : companyCommissionType === "PERCENTAGE_PRINCIPAL"
                              ? `${companyCommission}% sobre el capital`
                              : `${companyCommission}% de la rentabilidad`}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-purple-400">${(jyjCommissionAmount / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}

              {/* Inversionistas */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
                  <PieChart className="h-4 w-4 text-primary" /> Retorno Inversionistas
                </h3>

                {referredByInvestor && (
                  <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30 flex flex-col gap-2 mb-2">
                    <div className="flex justify-between items-center border-b border-emerald-500/20 pb-2">
                      <p className="text-sm font-bold text-emerald-400">Comisión por Referido (3%)</p>
                      <p className="text-sm font-bold text-emerald-400">+ ${(referralCommissionAmount / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="flex justify-between text-xs text-emerald-400/80">
                      <span>Inversor: {referredByInvestor.name}</span>
                      <span>Extraído de la ganancia general</span>
                    </div>
                  </div>
                )}
                
                {investors.length === 0 ? (
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm text-primary">
                    <span className="font-bold">Fondeo Propio Completo (100%):</span> JyJ recibe la devolución de todo el capital (${(principalPart/100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) + la rentabilidad restante (${(remainingInterest/100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).
                  </div>
                ) : (
                  <div className="space-y-2">
                    {investors.map((inv, idx) => {
                      const investorCapital = Math.round(principalPart * (inv.participationPercentage / 100))
                      const investorInterest = Math.round(remainingInterest * (inv.participationPercentage / 100))
                      const totalToInvestor = investorCapital + investorInterest

                      return (
                        <div key={idx} className="p-3 bg-white/5 rounded-lg border border-white/5 flex flex-col gap-2">
                          <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <p className="text-sm font-bold text-white">{inv.investor.name} <span className="text-primary font-normal">({inv.participationPercentage}%)</span></p>
                            <p className="text-sm font-bold text-emerald-400">+ ${(totalToInvestor / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Devolución Capital: ${(investorCapital / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <span>Ganancia Neta (inc. mora): ${(investorInterest / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      )
                    })}

                    {/* Si los inversionistas no suman el 100%, JyJ fondea el resto */}
                    {(() => {
                      const totalInvestorsPercentage = investors.reduce((sum, inv) => sum + inv.participationPercentage, 0)
                      const jyjFundingPercentage = 100 - totalInvestorsPercentage
                      
                      if (jyjFundingPercentage > 0) {
                        const jyjCapital = Math.round(principalPart * (jyjFundingPercentage / 100))
                        const jyjInterest = Math.round(remainingInterest * (jyjFundingPercentage / 100))
                        const totalToJyj = jyjCapital + jyjInterest

                        return (
                          <div className="p-3 bg-primary/10 rounded-lg border border-primary/30 flex flex-col gap-2 mt-4">
                            <div className="flex justify-between items-center border-b border-primary/20 pb-2">
                              <p className="text-sm font-bold text-primary">Fondeo Propio JyJ <span className="text-primary/70 font-normal">({jyjFundingPercentage}%)</span></p>
                              <p className="text-sm font-bold text-emerald-400">+ ${(totalToJyj / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                            <div className="flex justify-between text-xs text-primary/80">
                              <span>Devolución Capital: ${(jyjCapital / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              <span>Ganancia Neta (inc. mora): ${(jyjInterest / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        )
                      }
                      return null
                    })()}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
