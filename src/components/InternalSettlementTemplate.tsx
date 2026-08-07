"use client"

import React, { forwardRef } from "react"
import { ShieldCheck, Users, Wallet, TrendingUp, DollarSign, Calendar, Building2, CheckCircle2 } from "lucide-react"

export type PrincipalPaymentDetail = {
  id: string
  date: string | Date
  amount: number // in cents
  type: string
  distributions: {
    investorName: string
    percentage: number
    amount: number // in cents
  }[]
}

export type InvestorSummary = {
  id: string
  name: string
  percentage: number
  investedAmount: number // in cents
  principalReturnedFromInstallments: number // in cents
  principalReturnedFromAbonos: number // in cents
  totalPrincipalReturned: number // in cents
  interestEarned: number // in cents
  totalLiquidated: number // in cents
  pendingPrincipal: number // in cents
}

export type InternalSettlementData = {
  loanId: string
  clientName: string
  idDocument: string
  clientPhone?: string
  clientAddress?: string
  status: string
  startDate: string | Date
  settlementDate: string | Date
  principalAmount: number // in cents
  interestRate: number
  interestType: string
  numberOfInstallments: number
  installmentAmount: number // in cents
  
  // Totales financieros
  totalPaid: number // in cents
  totalPrincipalPaid: number // in cents
  totalInterestPaid: number // in cents
  totalLateFeesPaid: number // in cents
  outstandingPrincipal: number // in cents
  
  // Comisiones
  secretaryCommissionTotal: number // in cents
  companyCommissionTotal: number // in cents
  referrerCommissionTotal: number // in cents
  netInvestorYieldTotal: number // in cents
  
  // Desglose de Abonos a Capital
  principalPayments: PrincipalPaymentDetail[]
  
  // Inversionistas y sus balances
  investorsSummary: InvestorSummary[]
}

export const InternalSettlementTemplate = forwardRef<HTMLDivElement, { data: InternalSettlementData; isPreview?: boolean }>(({ data, isPreview = false }, ref) => {
  const settlementDateObj = new Date(data.settlementDate)
  const formattedSettlementDate = settlementDateObj.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric"
  })
  const formattedStartDate = new Date(data.startDate).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric"
  })
  const documentCode = `LIQ-${data.loanId.slice(-6).toUpperCase()}`
  const totalAbonosCents = data.principalPayments.reduce((s, p) => s + p.amount, 0)

  return (
    <div className={isPreview ? "w-full flex justify-center" : "w-full flex justify-center print:block"}>
      <div 
        ref={ref} 
        className="w-[820px] min-h-[1100px] bg-white text-slate-900 font-sans p-8 relative box-border print:p-6 print:m-0 print:w-full print:shadow-none shadow-2xl mx-auto flex flex-col justify-between"
        style={{
          colorScheme: "light"
        }}
      >
        {/* Borde perimetral sobrio */}
        <div className="absolute inset-3 border border-slate-300 pointer-events-none rounded-sm" />

        {/* Encabezado Corporativo Oficial */}
        <div className="relative z-10">
          <div className="flex items-start justify-between pb-4 border-b-2 border-slate-900 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center p-1 shadow-sm flex-shrink-0">
                <img 
                  src="/logo.png" 
                  alt="Préstamos JyJ" 
                  className="w-full h-full object-contain"
                  onError={(e) => { (e.currentTarget.style.display = 'none') }}
                />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                  Préstamos JyJ
                </h1>
                <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                  Planilla de Liquidación Interna & Repartición de Capital
                </p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                  NIT: 901.458.239-1 • Control Financiero y Auditoría de Inversiones
                </p>
              </div>
            </div>

            {/* Metadatos del Documento */}
            <div className="text-right bg-slate-50 border border-slate-200 rounded-lg p-2.5 shadow-sm min-w-[190px]">
              <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                Control Contable
              </span>
              <span className="text-xs font-extrabold font-mono text-blue-900 block mt-0.5">
                N° {documentCode}
              </span>
              <span className="text-[10px] text-slate-600 block mt-0.5">
                Fecha: <strong>{formattedSettlementDate}</strong>
              </span>
              <span className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded mt-1 ${
                data.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
              }`}>
                Estado: {data.status === 'PAID' ? 'LIQUIDADO (PAZ Y SALVO)' : data.status}
              </span>
            </div>
          </div>

          {/* 1. FICHA TÉCNICA DEL CRÉDITO Y CLIENTE */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Datos del Cliente */}
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 text-[11px]">
              <h3 className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px] mb-1.5 border-b border-slate-200 pb-1 flex items-center justify-between">
                <span>Información del Deudor</span>
                <span className="font-mono text-slate-500 font-normal">ID: {data.loanId.slice(-8).toUpperCase()}</span>
              </h3>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Titular:</span>
                  <span className="font-bold text-slate-900">{data.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Documento C.C.:</span>
                  <span className="font-bold font-mono text-slate-900">{data.idDocument}</span>
                </div>
                {data.clientPhone && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Teléfono:</span>
                    <span className="text-slate-900 font-mono">{data.clientPhone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Fecha Desembolso:</span>
                  <span className="text-slate-900">{formattedStartDate}</span>
                </div>
              </div>
            </div>

            {/* Condiciones del Préstamo */}
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 text-[11px]">
              <h3 className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px] mb-1.5 border-b border-slate-200 pb-1">
                Condiciones del Crédito
              </h3>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Capital Inicial:</span>
                  <span className="font-bold font-mono text-slate-900">${(data.principalAmount / 100).toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tasa de Interés:</span>
                  <span className="font-bold font-mono text-slate-900">{data.interestRate}% mensual</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Plazo / Modalidad:</span>
                  <span className="text-slate-900">{data.numberOfInstallments} cuotas • Amortización Francesa</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cuota Inicial Proyectada:</span>
                  <span className="font-bold font-mono text-slate-900">${(data.installmentAmount / 100).toLocaleString('es-CO')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. DESGLOSE DE ABONOS EXTRAORDINARIOS A CAPITAL (LO MÁS IMPORTANTE) */}
          <div className="mb-4 bg-emerald-50/50 rounded-xl border border-emerald-300 p-3.5 shadow-sm">
            <div className="flex justify-between items-center pb-2 border-b border-emerald-200 mb-2.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-700" />
                Abonos Extraordinarios a Capital & Repartición a Inversionistas
              </h3>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 font-mono">
                Total Abonado a Capital: ${(totalAbonosCents / 100).toLocaleString('es-CO')}
              </span>
            </div>

            {data.principalPayments.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic py-1 text-center">
                No se registraron abonos extraordinarios a capital durante la vigencia del crédito.
              </p>
            ) : (
              <div className="space-y-2.5">
                {data.principalPayments.map((p, pIdx) => {
                  const pDate = new Date(p.date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
                  return (
                    <div key={p.id || pIdx} className="bg-white rounded-lg border border-emerald-200 p-2.5 text-[11px] shadow-xs">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-1 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-xs text-emerald-800">
                            Abono #{pIdx + 1}: ${(p.amount / 100).toLocaleString('es-CO')}
                          </span>
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-bold bg-slate-100 text-slate-700">
                            {p.type === 'REDUCE_TERM' ? '⚡ Recortó Plazo' : p.type === 'REDUCE_AMOUNT' ? '📉 Redujo Cuota' : 'Abono Directo'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Fecha: {pDate}
                        </span>
                      </div>

                      {/* Repartición desmenuzada por cada inversor */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                        {p.distributions.map((d, dIdx) => (
                          <div key={dIdx} className="flex justify-between items-center bg-slate-50 px-2 py-1 rounded border border-slate-200/60">
                            <span className="font-medium text-slate-800 text-[10px]">
                              {d.investorName} <strong className="text-slate-500">({d.percentage}%)</strong>:
                            </span>
                            <span className="font-bold font-mono text-emerald-700 text-[11px]">
                              ${(d.amount / 100).toLocaleString('es-CO')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 3. RESUMEN FINANCIERO GLOBAL (INGRESOS, INTERESES Y COMISIONES) */}
          <div className="mb-4 bg-slate-50 rounded-xl border border-slate-200 p-3 text-[11px]">
            <h3 className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px] mb-2 pb-1 border-b border-slate-200 flex justify-between items-center">
              <span>Distribución Financiera y Comisiones Totales</span>
              <span className="font-mono text-slate-500 font-normal">Recaudo Total: ${(data.totalPaid / 100).toLocaleString('es-CO')}</span>
            </h3>

            <div className="grid grid-cols-3 gap-3 text-[10px]">
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="text-slate-500 block">Capital Reintegrado:</span>
                <span className="font-bold font-mono text-slate-900 text-xs">${(data.totalPrincipalPaid / 100).toLocaleString('es-CO')}</span>
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="text-slate-500 block">Intereses Recaudados:</span>
                <span className="font-bold font-mono text-slate-900 text-xs">${(data.totalInterestPaid / 100).toLocaleString('es-CO')}</span>
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="text-slate-500 block">Recargos por Mora:</span>
                <span className="font-bold font-mono text-amber-700 text-xs">${(data.totalLateFeesPaid / 100).toLocaleString('es-CO')}</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-200 text-[10px]">
              <div>
                <span className="text-slate-500 block">Comisión Secretaría:</span>
                <span className="font-bold font-mono text-slate-800">${(data.secretaryCommissionTotal / 100).toLocaleString('es-CO')}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Comisión JyJ / Admin:</span>
                <span className="font-bold font-mono text-slate-800">${(data.companyCommissionTotal / 100).toLocaleString('es-CO')}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Comisión Referido:</span>
                <span className="font-bold font-mono text-slate-800">${(data.referrerCommissionTotal / 100).toLocaleString('es-CO')}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-emerald-800 font-bold">Rendimiento Inversionistas:</span>
                <span className="font-extrabold font-mono text-emerald-800">${(data.netInvestorYieldTotal / 100).toLocaleString('es-CO')}</span>
              </div>
            </div>
          </div>

          {/* 4. CUADRO CONTABLE FINAL POR INVERSIONISTA */}
          <div className="mb-4">
            <h3 className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px] mb-1.5 flex items-center justify-between">
              <span>Balance de Cierre por Inversionista</span>
              <span className="text-[9px] text-slate-500 font-normal">Capital Inicial + Rendimientos - Saldo Restante</span>
            </h3>

            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <table className="w-full text-[10px] text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2">Inversionista</th>
                    <th className="p-2 text-center">% Part.</th>
                    <th className="p-2 text-right">Capital Aportado</th>
                    <th className="p-2 text-right">Cap. Cuotas</th>
                    <th className="p-2 text-right">Cap. Abonos</th>
                    <th className="p-2 text-right">Rendimiento</th>
                    <th className="p-2 text-right text-emerald-800">Total Liquidado</th>
                    <th className="p-2 text-right">Saldo Pend.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  {data.investorsSummary.map((inv, idx) => (
                    <tr key={inv.id || idx} className="hover:bg-slate-50">
                      <td className="p-2 font-sans font-bold text-slate-900">{inv.name}</td>
                      <td className="p-2 text-center">{inv.percentage}%</td>
                      <td className="p-2 text-right text-slate-700">${(inv.investedAmount / 100).toLocaleString('es-CO')}</td>
                      <td className="p-2 text-right text-slate-600">${(inv.principalReturnedFromInstallments / 100).toLocaleString('es-CO')}</td>
                      <td className="p-2 text-right text-emerald-700 font-bold">${(inv.principalReturnedFromAbonos / 100).toLocaleString('es-CO')}</td>
                      <td className="p-2 text-right text-blue-800 font-bold">${(inv.interestEarned / 100).toLocaleString('es-CO')}</td>
                      <td className="p-2 text-right font-extrabold text-emerald-800 bg-emerald-50/50">
                        ${(inv.totalLiquidated / 100).toLocaleString('es-CO')}
                      </td>
                      <td className="p-2 text-right font-bold text-slate-900">
                        ${(inv.pendingPrincipal / 100).toLocaleString('es-CO')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. FIRMAS Y APROBACIONES */}
          <div className="mt-8 pt-4 flex items-end justify-between px-8">
            <div className="text-center w-64">
              <div className="border-t border-slate-900 mb-1" />
              <p className="font-bold text-xs uppercase text-slate-900">Gerencia General</p>
              <p className="text-[9px] text-slate-500 uppercase font-semibold">Préstamos JyJ • Autorización</p>
            </div>

            <div className="text-center w-64">
              <div className="border-t border-slate-900 mb-1" />
              <p className="font-bold text-xs uppercase text-slate-900">Control Contable & Auditoría</p>
              <p className="text-[9px] text-slate-500 uppercase font-semibold">Verificación de Repartición</p>
            </div>
          </div>
        </div>

        {/* Pie de página de seguridad */}
        <div className="relative z-10 pt-3 mt-4 border-t border-slate-200 text-center px-2">
          <div className="flex items-center justify-between text-[8px] text-slate-400 font-mono">
            <span>DOC-INTERNO: {data.loanId}</span>
            <span>AUDITORÍA JYJ SISTEMA FINTECH</span>
            <span>PÁGINA 1 DE 1</span>
          </div>
        </div>
      </div>
    </div>
  )
})

InternalSettlementTemplate.displayName = "InternalSettlementTemplate"
