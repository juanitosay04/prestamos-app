"use client"

import { useState } from "react"
import { Briefcase, Calendar, CheckCircle2, AlertCircle, Printer, Loader2, FileDown, Check } from "lucide-react"
import Link from "next/link"
import { processBatchInstallments, getBatchInstallmentsInfo } from "@/app/actions/payment"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

type Loan = any // Using any for simplicity here to map the enriched loan
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

  const handleProcessBatch = async (onlyPdf: boolean) => {
    if (!onlyPdf) {
      if (!confirm(`¿Estás seguro de que deseas procesar el cobro de la cuota actual para los ${selectedIds.length} préstamos seleccionados?`)) {
        return
      }
    }

    setLoading(true)
    const res = onlyPdf ? await getBatchInstallmentsInfo(selectedIds) : await processBatchInstallments(selectedIds)
    setLoading(false)

    if (res.error) {
      alert(res.error)
      return
    }

    if (res.results) {
      const successfulPayments = res.results.filter((r: any) => r.success)
      if (successfulPayments.length > 0) {
        generatePDF(successfulPayments, onlyPdf)
        if (!onlyPdf) {
          setSelectedIds([])
          alert(`Se han cobrado ${successfulPayments.length} cuotas exitosamente y se descargó el recibo.`)
          window.location.reload()
        }
      } else {
        alert("No se encontró información de cuotas pendientes para los préstamos seleccionados.")
      }
    }
  }

  const generatePDF = (payments: any[], isProforma: boolean) => {
    const doc = new jsPDF()

    // Title
    doc.setFontSize(18)
    doc.text(isProforma ? "Desglose de Cuotas Pendientes" : "Recibo Consolidado de Pagos", 14, 22)
    doc.setFontSize(11)
    doc.text(`Fecha de Emisión: ${new Date().toLocaleString('es-CO')}`, 14, 30)

    let currentY = 40

    let totalAmountCollected = 0
    let totalPrincipal = 0
    let totalInterest = 0

    for (let i = 0; i < payments.length; i++) {
      const p = payments[i]
      totalAmountCollected += p.amountPaid
      totalPrincipal += p.principalPart
      totalInterest += p.interestPart + p.lateFee

      // Check if we need a new page
      if (currentY > 250) {
        doc.addPage()
        currentY = 20
      }

      // Title for the Loan
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(41, 128, 185)
      doc.text(`Cliente: ${p.clientName} | Préstamo: ${p.loanId.slice(0,8)} | Cuota: #${p.installmentNumber}`, 14, currentY)
      currentY += 6

      // Math calculations
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

      // Summary Table
      autoTable(doc, {
        startY: currentY,
        head: [['Total a Pagar', 'Abono a Capital', 'Interés Cobrado', 'Mora']],
        body: [[
          `$${(p.amountPaid / 100).toLocaleString('es-CO')}`,
          `$${(p.principalPart / 100).toLocaleString('es-CO')}`,
          `$${(p.interestPart / 100).toLocaleString('es-CO')}`,
          `$${(p.lateFee / 100).toLocaleString('es-CO')}`
        ]],
        theme: 'grid',
        headStyles: { fillColor: [44, 62, 80] },
        styles: { fontSize: 9 }
      })
      currentY = (doc as any).lastAutoTable.finalY + 5

      // Comisiones y Retornos
      const breakdownData: any[][] = []
      
      if (secComm > 0) {
        breakdownData.push(['Comisión Secretaria', 'Gestión y Cobro', `$${(secComm / 100).toLocaleString('es-CO')}`])
      }
      breakdownData.push(['Comisión Plataforma JyJ', '20% de Rentabilidad', `$${(jyjComm / 100).toLocaleString('es-CO')}`])

      if (p.referredByInvestor) {
        breakdownData.push(['Comisión por Referido', `3% - Inversor: ${p.referredByInvestor.name}`, `$${(referralComm / 100).toLocaleString('es-CO')}`])
      }

      let totalInvPct = 0
      if (p.investors && p.investors.length > 0) {
        p.investors.forEach((inv: any) => {
          totalInvPct += inv.participationPercentage
          const cap = Math.round(p.principalPart * (inv.participationPercentage / 100))
          const int = Math.round(remainingInterest * (inv.participationPercentage / 100))
          breakdownData.push([`Inversionista: ${inv.investor.name}`, `Capital: $${(cap/100).toLocaleString('es-CO')} | Ganancia: $${(int/100).toLocaleString('es-CO')}`, `$${((cap+int)/100).toLocaleString('es-CO')}`])
        })
      }

      const jyjFundingPct = 100 - totalInvPct
      if (jyjFundingPct > 0) {
        const cap = Math.round(p.principalPart * (jyjFundingPct / 100))
        const int = Math.round(remainingInterest * (jyjFundingPct / 100))
        breakdownData.push([`Fondeo Propio JyJ (${jyjFundingPct}%)`, `Capital: $${(cap/100).toLocaleString('es-CO')} | Ganancia: $${(int/100).toLocaleString('es-CO')}`, `$${((cap+int)/100).toLocaleString('es-CO')}`])
      }

      autoTable(doc, {
        startY: currentY,
        head: [['Concepto', 'Detalle', 'Monto']],
        body: breakdownData,
        theme: 'grid',
        headStyles: { fillColor: [142, 68, 173] }, // Purple for breakdown
        styles: { fontSize: 9 }
      })
      currentY = (doc as any).lastAutoTable.finalY + 15
    }

    // Gran Total
    if (currentY > 270) {
      doc.addPage()
      currentY = 20
    }
    
    doc.setFillColor(41, 128, 185)
    doc.rect(14, currentY, 182, 10, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text(`GRAN TOTAL ${isProforma ? 'A COBRAR' : 'PAGADO'}: $${(totalAmountCollected / 100).toLocaleString('es-CO')}`, 20, currentY + 7)

    doc.save(`Recibo_Detallado_${new Date().getTime()}.pdf`)
  }

  return (
    <div className="relative">
      {/* Floating Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-card border border-white/10 shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-6 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="flex flex-col">
            <span className="text-white font-bold text-lg">{selectedIds.length} seleccionados</span>
            <span className="text-xs text-muted-foreground">Listos para procesar</span>
          </div>
          <div className="w-px h-10 bg-white/10"></div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => handleProcessBatch(true)}
              disabled={loading}
              className="bg-white/10 hover:bg-white/20 text-white px-5 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileDown className="h-5 w-5" />}
              {loading ? "Generando..." : "Solo Generar PDF"}
            </button>

            <button 
              onClick={() => handleProcessBatch(false)}
              disabled={loading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Printer className="h-5 w-5" />}
              {loading ? "Procesando..." : "Cobrar y Generar PDF"}
            </button>
          </div>
        </div>
      )}

      <div className="glass-panel rounded-2xl overflow-hidden border border-white/5 pb-20">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/5 text-muted-foreground border-b border-white/5 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4 w-12"></th>
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
                  // Prevent selecting DEFAULTED or PAID loans as they don't have pending installments
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
