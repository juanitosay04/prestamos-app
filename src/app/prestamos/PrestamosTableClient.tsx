"use client"

import { useState } from "react"
import { Briefcase, Calendar, FileDown, Printer, Loader2, Check, ShieldAlert, ChevronRight, User } from "lucide-react"
import Link from "next/link"
import { processBatchInstallments, getBatchInstallmentsInfo } from "@/app/actions/payment"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

type Loan = any

export function PrestamosTableClient({ loans, userRole }: { loans: Loan[], userRole?: string }) {
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
          `$${(mora / 100).toLocaleString('es-CO')}`,
          `$${(p.amountPaid / 100).toLocaleString('es-CO')}`
        ]],
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 9 }
      })

      currentY = (doc as any).lastAutoTable.finalY + 12
    }

    if (currentY > 260) {
      doc.addPage()
      currentY = 20
    }

    doc.setFillColor(241, 245, 249)
    doc.rect(14, currentY, 182, 10, 'F')
    doc.setTextColor(15, 23, 42)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.text(`TOTAL RECAUDADO: $${(grandTotal / 100).toLocaleString('es-CO')}`, 20, currentY + 7)

    doc.save(`${isProforma ? 'Pre_Liquidacion' : 'Recibo_Clientes'}_${new Date().getTime()}.pdf`)
  }

  const generateInternalSettlementPDF = (payments: any[]) => {
    const doc = new jsPDF()

    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.setTextColor(24, 43, 73)
    doc.text("JyJ Préstamos - Informe Interno de Liquidación", 14, 20)
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text(`Generado: ${new Date().toLocaleString('es-CO')} | Confidencial - Uso Administrativo`, 14, 26)

    const tableRows = []
    let totalCollected = 0
    let totalJyJProfit = 0

    for (const p of payments) {
      totalCollected += p.amountPaid
      totalJyJProfit += p.jyjProfit

      const investorNames = p.investorsBreakdown?.map((inv: any) => `${inv.name} ($${(inv.investorPayout / 100).toLocaleString('es-CO')})`).join(', ') || 'Fondeo Propio'

      tableRows.push([
        p.clientName,
        `#${p.installmentNumber}`,
        `$${(p.amountPaid / 100).toLocaleString('es-CO')}`,
        `$${(p.jyjProfit / 100).toLocaleString('es-CO')}`,
        investorNames
      ])
    }

    autoTable(doc, {
      startY: 32,
      head: [['Cliente', 'Cuota', 'Recaudado', 'Ganancia JyJ', 'Pago Inversionistas']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [142, 68, 173] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 15 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 80 }
      }
    })

    let currentY = (doc as any).lastAutoTable.finalY + 8
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
    <div className="relative space-y-4">
      {/* Floating Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass-panel-elevated rounded-2xl px-6 py-4 flex flex-wrap items-center justify-between gap-4 max-w-4xl w-[92%] animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold font-mono text-sm">
              {selectedIds.length}
            </div>
            <div>
              <span className="text-white font-bold text-xs block">Préstamos Seleccionados</span>
              <span className="text-[11px] text-muted-foreground">Listos para procesar</span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => handleAction("CLIENT_PDF")}
              disabled={loading}
              className="bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
              title="Descarga comprobante sin aplicar cobro en el sistema"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5 text-blue-400" />}
              PDF Clientes
            </button>

            {userRole === "ADMIN" && (
              <button 
                onClick={() => handleAction("INTERNAL_REPORT")}
                disabled={loading}
                className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
                title="Descarga informe administrativo con comisiones y rentabilidad"
              >
                <ShieldAlert className="h-3.5 w-3.5 text-purple-400" />
                Liquidación Interna
              </button>
            )}

            <button 
              onClick={() => handleAction("CLIENT_PAY")}
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 active:scale-95"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
              Cobrar y Recibo
            </button>
          </div>
        </div>
      )}

      {/* Tabla Principal */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-white/[0.08]">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-white/[0.02] text-muted-foreground border-b border-white/[0.06] uppercase text-[10px] font-bold tracking-wider font-mono">
              <tr>
                <th className="px-5 py-3.5 w-10">
                  <button 
                    onClick={selectAllSelectable}
                    className="text-[10px] text-muted-foreground hover:text-white underline font-normal"
                    title="Seleccionar todos los activos"
                  >
                    Todos
                  </button>
                </th>
                <th className="px-5 py-3.5">Cliente / Código</th>
                <th className="px-5 py-3.5">Capital Prestado</th>
                <th className="px-5 py-3.5">Plan de Cuotas</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5">Fondeo</th>
                <th className="px-5 py-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground text-xs">
                    No hay préstamos emitidos aún o no coinciden con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                loans.map((loan) => {
                  const isSelected = selectedIds.includes(loan.id)
                  const isSelectable = loan.status !== "DEFAULTED" && loan.status !== "PAID"
                  
                  return (
                    <tr 
                      key={loan.id} 
                      className={`transition-colors duration-150 ${
                        isSelected ? 'bg-blue-500/10' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        {isSelectable && (
                          <button 
                            onClick={() => toggleSelection(loan.id)}
                            className={`w-5 h-5 rounded-md flex items-center justify-center transition-all border ${
                              isSelected 
                                ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/30" 
                                : "bg-black/30 border-white/15 hover:border-white/40"
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                          </button>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600/20 to-indigo-500/20 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-xs">
                            {loan.client.firstName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-white font-bold text-xs">{loan.client.firstName} {loan.client.lastName}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">ID: {loan.id.slice(0, 8).toUpperCase()}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="text-white font-extrabold font-mono text-xs">
                          ${(loan.principalAmount / 100).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </span>
                        <div className="text-[10px] text-muted-foreground capitalize">
                          {loan.interestType === "MONTHLY" ? "Mensual" : 
                           loan.interestType === "BIWEEKLY" ? "Quincenal" :
                           loan.interestType === "WEEKLY" ? "Semanal" : "Diario"}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-muted-foreground">
                        <span className="text-white font-medium">{loan.numberOfInstallments} cuotas</span>
                        <div className="text-[11px] text-blue-400 font-mono font-bold">
                          ${(loan.installmentAmount / 100).toLocaleString('es-CO', { maximumFractionDigits: 0 })} c/u
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${loan.statusColor}`}>
                          {loan.statusIcon} {loan.derivedStatus}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-muted-foreground">
                        {loan.investors.length > 0 ? (
                          <div className="flex -space-x-1.5 items-center">
                            {loan.investors.map((inv: any, idx: number) => (
                              <div 
                                key={idx} 
                                className="h-6 w-6 rounded-full bg-indigo-600 border border-[#0A0D14] flex items-center justify-center text-[10px] text-white font-bold shadow-sm" 
                                title={`${inv.investor.name} (${inv.participationPercentage}%)`}
                              >
                                {inv.investor.name.charAt(0)}
                              </div>
                            ))}
                            <span className="text-[10px] text-indigo-400 font-mono font-semibold ml-2">
                              {loan.investors.length} inv.
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-emerald-400/90 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            Propio
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <Link 
                          href={`/prestamos/${loan.id}`} 
                          className="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.08] hover:border-white/20 rounded-lg transition-all inline-flex items-center gap-1.5 text-[11px] font-semibold active:scale-95"
                        >
                          <Calendar className="h-3.5 w-3.5 text-blue-400" />
                          Cronograma
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
