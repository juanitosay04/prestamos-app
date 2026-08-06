"use client"

import { useState } from "react"
import { Briefcase, Calendar, FileDown, Printer, Loader2, Check, ShieldAlert } from "lucide-react"
import Link from "next/link"
import { processBatchInstallments, getBatchInstallmentsInfo } from "@/app/actions/payment"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

type Loan = any

export function PrestamosTableClient({ loans }: { loans: Loan[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const selectAllSelectable = () => {
    const selectable = loans
      .filter(l => l.status !== "DEFAULTED" && l.status !== "PAID")
      .map(l => l.id)
    if (selectedIds.length === selectable.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(selectable)
    }
  }

  // mode: "CLIENT_PDF" (only preview/pdf for clients), "CLIENT_PAY" (pay and download client receipt), "INTERNAL_REPORT" (admin breakdown)
  const handleAction = async (mode: "CLIENT_PDF" | "CLIENT_PAY" | "INTERNAL_REPORT") => {
    if (mode === "CLIENT_PAY") {
      if (!confirm(`¿Estás seguro de procesar el cobro de la cuota actual para los ${selectedIds.length} préstamos seleccionados?`)) {
        return
      }
    }

    setLoading(true)
    const isPayment = mode === "CLIENT_PAY"
    const res = isPayment ? await processBatchInstallments(selectedIds) : await getBatchInstallmentsInfo(selectedIds)
    setLoading(false)

    if (res.error) {
      alert(res.error)
      return
    }

    if (res.results) {
      const successfulPayments = res.results.filter((r: any) => r.success)
      if (successfulPayments.length > 0) {
        if (mode === "INTERNAL_REPORT") {
          generateInternalSettlementPDF(successfulPayments)
        } else {
          generateClientReceiptsPDF(successfulPayments, mode === "CLIENT_PDF")
        }

        if (isPayment) {
          setSelectedIds([])
          alert(`Se han cobrado ${successfulPayments.length} cuotas exitosamente y se generó el comprobante.`)
          window.location.reload()
        }
      } else {
        alert("No se encontró información de cuotas pendientes para los préstamos seleccionados.")
      }
    }
  }

  // 1. Recibo 100% LIMPIO PARA CLIENTES (Sin datos de inversores ni comisiones de la empresa)
  const generateClientReceiptsPDF = (payments: any[], isProforma: boolean) => {
    const doc = new jsPDF()

    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.setTextColor(30, 41, 59)
    doc.text("JyJ Préstamos - Comprobante de Recaudo", 14, 20)
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    doc.text(`Fecha de Emisión: ${new Date().toLocaleString('es-CO')}`, 14, 27)
    doc.text(isProforma ? "Estado: Pre-liquidación / Cobro Pendiente" : "Estado: Pago Registrado y Aprobado", 14, 33)

    let currentY = 42
    let grandTotal = 0

    for (let i = 0; i < payments.length; i++) {
      const p = payments[i]
      grandTotal += p.amountPaid

      if (currentY > 240) {
        doc.addPage()
        currentY = 20
      }

      // Encabezado del cliente
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(15, 23, 42)
      doc.text(`${i + 1}. Cliente: ${p.clientName}`, 14, currentY)
      
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(100, 116, 139)
      doc.text(`Documento: ${p.idDocument} | Préstamo: #${p.loanId.slice(-6).toUpperCase()} | Cuota #${p.installmentNumber}`, 14, currentY + 5)
      currentY += 9

      const baseCuota = p.principalPart + p.interestPart
      const mora = p.lateFee || 0

      autoTable(doc, {
        startY: currentY,
        head: [['Concepto', 'Abono Cuota', 'Recargo Mora', 'Total Abonado']],
        body: [[
          `Cuota #${p.installmentNumber} de ${p.numberOfInstallments}`,
          `$${(baseCuota / 100).toLocaleString('es-CO')}`,
          mora > 0 ? `$${(mora / 100).toLocaleString('es-CO')}` : '$0',
          `$${(p.amountPaid / 100).toLocaleString('es-CO')}`
        ]],
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9 }
      })

      currentY = (doc as any).lastAutoTable.finalY + 10
    }

    if (currentY > 260) {
      doc.addPage()
      currentY = 20
    }

    doc.setFillColor(30, 41, 59)
    doc.rect(14, currentY, 182, 10, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.text(`TOTAL RECAUDADO: $${(grandTotal / 100).toLocaleString('es-CO')}`, 20, currentY + 7)

    doc.save(`Recibos_Clientes_${new Date().getTime()}.pdf`)
  }

  // 2. Reporte EXCLUSIVO DE AUDITORÍA Y LIQUIDACIÓN INTERNA (Solo para Administración)
  const generateInternalSettlementPDF = (payments: any[]) => {
    const doc = new jsPDF()

    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.setTextColor(142, 68, 173)
    doc.text("INFORME INTERNO DE LIQUIDACIÓN Y REPARTICIÓN (JyJ)", 14, 20)
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text(`Fecha: ${new Date().toLocaleString('es-CO')} | Documento de uso exclusivo de administración`, 14, 26)

    let currentY = 34
    let totalCollected = 0
    let totalCapital = 0
    let totalInterest = 0
    let totalJyJProfit = 0

    for (let i = 0; i < payments.length; i++) {
      const p = payments[i]
      totalCollected += p.amountPaid
      totalCapital += p.principalPart
      totalInterest += p.interestPart + p.lateFee

      if (currentY > 230) {
        doc.addPage()
        currentY = 20
      }

      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(15, 23, 42)
      doc.text(`Préstamo #${p.loanId.slice(0, 8)} - ${p.clientName} (Cuota ${p.installmentNumber})`, 14, currentY)
      currentY += 5

      const tInt = p.interestPart + p.lateFee
      let secComm = 0
      if (p.secretaryCommissionType === "FIXED_AMOUNT") {
        secComm = Math.round(p.secretaryCommission / p.numberOfInstallments)
      } else if (p.secretaryCommissionType === "PERCENTAGE_PRINCIPAL") {
        secComm = Math.round((p.principalAmount * (p.secretaryCommission / 100)) / p.numberOfInstallments)
      } else {
        secComm = Math.round(tInt * (p.secretaryCommission / 100))
      }
      const jyjComm = Math.round(tInt * 0.20)
      const referralComm = p.referredByInvestor ? Math.round(tInt * 0.03) : 0
      const remainingInterest = Math.max(0, tInt - secComm - jyjComm - referralComm)

      const breakdownData: any[][] = []
      
      if (secComm > 0) {
        breakdownData.push(['Comisión Secretaria', 'Gestión de Cobro', `$${(secComm / 100).toLocaleString('es-CO')}`])
      }
      breakdownData.push(['Comisión Plataforma JyJ', '20% Fijo Rentabilidad', `$${(jyjComm / 100).toLocaleString('es-CO')}`])

      if (p.referredByInvestor) {
        breakdownData.push(['Comisión Referido (3%)', `Inversor: ${p.referredByInvestor.name}`, `$${(referralComm / 100).toLocaleString('es-CO')}`])
      }

      let totalInvPct = 0
      if (p.investors && p.investors.length > 0) {
        p.investors.forEach((inv: any) => {
          totalInvPct += inv.participationPercentage
          const cap = Math.round(p.principalPart * (inv.participationPercentage / 100))
          const int = Math.round(remainingInterest * (inv.participationPercentage / 100))
          breakdownData.push([`Inversor: ${inv.investor.name} (${inv.participationPercentage}%)`, `Capital: $${(cap/100).toLocaleString('es-CO')} | Utilidad: $${(int/100).toLocaleString('es-CO')}`, `$${((cap+int)/100).toLocaleString('es-CO')}`])
        })
      }

      const jyjFundingPct = 100 - totalInvPct
      if (jyjFundingPct > 0) {
        const cap = Math.round(p.principalPart * (jyjFundingPct / 100))
        const int = Math.round(remainingInterest * (jyjFundingPct / 100))
        totalJyJProfit += jyjComm + int
        breakdownData.push([`Fondeo JyJ Propio (${jyjFundingPct}%)`, `Capital: $${(cap/100).toLocaleString('es-CO')} | Utilidad: $${(int/100).toLocaleString('es-CO')}`, `$${((cap+int)/100).toLocaleString('es-CO')}`])
      } else {
        totalJyJProfit += jyjComm
      }

      autoTable(doc, {
        startY: currentY,
        head: [['Distribución', 'Detalle', 'Valor']],
        body: breakdownData,
        theme: 'grid',
        headStyles: { fillColor: [142, 68, 173] },
        styles: { fontSize: 8 }
      })
      currentY = (doc as any).lastAutoTable.finalY + 10
    }

    if (currentY > 260) {
      doc.addPage()
      currentY = 20
    }

    doc.setFillColor(142, 68, 173)
    doc.rect(14, currentY, 182, 10, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.text(`TOTAL RECAUDO: $${(totalCollected / 100).toLocaleString('es-CO')} | GANANCIA TOTAL JYJ: $${(totalJyJProfit / 100).toLocaleString('es-CO')}`, 20, currentY + 7)

    doc.save(`Informe_Liquidacion_Interna_${new Date().getTime()}.pdf`)
  }

  return (
    <div className="relative">
      {/* Floating Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl px-6 py-4 flex flex-wrap items-center justify-between gap-4 max-w-4xl w-[92%] animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold">
              {selectedIds.length}
            </div>
            <div>
              <span className="text-white font-bold text-sm block">Préstamos Seleccionados</span>
              <span className="text-xs text-muted-foreground">Listos para procesar</span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => handleAction("CLIENT_PDF")}
              disabled={loading}
              className="bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="Descarga comprobante sin aplicar cobro en el sistema"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              PDF Clientes
            </button>

            <button 
              onClick={() => handleAction("INTERNAL_REPORT")}
              disabled={loading}
              className="bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="Descarga informe administrativo con comisiones y rentabilidad"
            >
              <ShieldAlert className="h-4 w-4 text-purple-400" />
              Liquidación Interna
            </button>

            <button 
              onClick={() => handleAction("CLIENT_PAY")}
              disabled={loading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              Cobrar y Recibo
            </button>
          </div>
        </div>
      )}

      <div className="glass-panel rounded-2xl overflow-hidden border border-white/5 pb-20">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/5 text-muted-foreground border-b border-white/5 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4 w-12">
                  <button 
                    onClick={selectAllSelectable}
                    className="text-xs text-muted-foreground hover:text-white underline font-normal"
                    title="Seleccionar todos los activos"
                  >
                    Todos
                  </button>
                </th>
                <th className="px-6 py-4">Cliente / ID Préstamo</th>
                <th className="px-6 py-4">Capital Original</th>
                <th className="px-6 py-4">Cuotas (Monto)</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Fondeo</th>
                <th className="px-6 py-4 text-right">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    No hay préstamos emitidos aún o no coinciden con el filtro.
                  </td>
                </tr>
              ) : (
                loans.map((loan) => {
                  const isSelected = selectedIds.includes(loan.id)
                  const isSelectable = loan.status !== "DEFAULTED" && loan.status !== "PAID"
                  
                  return (
                    <tr key={loan.id} className={`transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-white/5'}`}>
                      <td className="px-6 py-4">
                        {isSelectable && (
                          <button 
                            onClick={() => toggleSelection(loan.id)}
                            className={`w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 border ${
                              isSelected 
                                ? "bg-primary border-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.6)]" 
                                : "bg-black/20 border-white/20 hover:border-white/40 hover:bg-white/5"
                            }`}
                          >
                            {isSelected && <Check className="w-4 h-4" strokeWidth={3} />}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                          <Briefcase className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-white">{loan.client.firstName} {loan.client.lastName}</p>
                          <p className="text-xs text-muted-foreground font-normal font-mono">{loan.id.slice(0, 8)}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-white font-medium">
                        ${(loan.principalAmount / 100).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        <div className="text-xs text-muted-foreground font-normal">
                          {loan.interestType === "MONTHLY" ? "Mensual" : 
                           loan.interestType === "BIWEEKLY" ? "Quincenal" :
                           loan.interestType === "WEEKLY" ? "Semanal" : "Diario"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {loan.numberOfInstallments} cuotas de <br/>
                        <span className="text-primary font-medium">${(loan.installmentAmount / 100).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${loan.statusColor}`}>
                          {loan.statusIcon} {loan.derivedStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {loan.investors.length > 0 ? (
                          <div className="flex -space-x-2">
                            {loan.investors.map((inv: any, idx: number) => (
                              <div key={idx} className="h-6 w-6 rounded-full bg-emerald-600 border border-background flex items-center justify-center text-[10px] text-white font-bold" title={`${inv.investor.name} (${inv.participationPercentage}%)`}>
                                {inv.investor.name.charAt(0)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs">Fondeo Propio</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/prestamos/${loan.id}`} className="p-2 text-muted-foreground hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2 ml-auto text-xs font-medium w-fit">
                          <Calendar className="h-4 w-4" />
                          Ver Cuotas
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
