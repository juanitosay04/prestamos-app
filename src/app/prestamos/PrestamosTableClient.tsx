"use client"

import { useState } from "react"
import { Briefcase, Calendar, FileDown, Printer, Loader2, Check, ShieldAlert, ChevronRight, User, FileCheck, FileText } from "lucide-react"
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
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // Encabezado Corporativo
    doc.setFillColor(15, 23, 42) // Slate 900
    doc.rect(0, 0, pageWidth, 28, 'F')

    // Barra de acento
    doc.setFillColor(37, 99, 235) // Blue 600
    doc.rect(0, 28, pageWidth, 2, 'F')

    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.setTextColor(255, 255, 255)
    doc.text("JYJ PRÉSTAMOS", 14, 12)

    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(148, 163, 184)
    doc.text(isProforma ? "HOJA DE RUTA / PRE-LIQUIDACIÓN DE RECAUDO" : "COMPROBANTE OFICIAL DE RECAUDO EN LOTE", 14, 18)
    doc.text("NIT / ID: 901.458.239-1 • Soluciones Financieras", 14, 23)

    // Metadatos a la derecha
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`, pageWidth - 14, 12, { align: "right" })
    doc.setTextColor(isProforma ? 251 : 52, isProforma ? 191 : 211, isProforma ? 36 : 153) // Amber or Emerald
    doc.text(isProforma ? "ESTADO: PRE-LIQUIDACIÓN" : "ESTADO: APROBADO Y REGISTRADO", pageWidth - 14, 18, { align: "right" })

    // Cálculos de Resumen
    let grandTotal = 0
    let grandPrincipal = 0
    let grandInterest = 0
    let grandLate = 0

    payments.forEach(p => {
      grandTotal += p.amountPaid || 0
      grandPrincipal += p.principalPart || 0
      grandInterest += p.interestPart || 0
      grandLate += p.lateFee || 0
    })

    // Resumen Ejecutivo Cards
    doc.setFillColor(248, 250, 252) // Slate 50
    doc.roundedRect(14, 34, pageWidth - 28, 20, 2, 2, 'F')
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(14, 34, pageWidth - 28, 20, 2, 2, 'S')

    // 4 Columnas en la tarjeta de resumen
    const colW = (pageWidth - 28) / 4
    
    // Col 1: Total Clientes
    doc.setFontSize(7)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(100, 116, 139)
    doc.text("CLIENTES / CUOTAS", 18, 41)
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    doc.text(`${payments.length} Registros`, 18, 48)

    // Col 2: Abono a Capital
    doc.setFontSize(7)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(100, 116, 139)
    doc.text("RETORNO CAPITAL", 18 + colW, 41)
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    doc.text(`$${(grandPrincipal / 100).toLocaleString('es-CO')}`, 18 + colW, 48)

    // Col 3: Interés y Mora
    doc.setFontSize(7)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(100, 116, 139)
    doc.text("INTERÉS + MORA", 18 + (colW * 2), 41)
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    doc.text(`$${((grandInterest + grandLate) / 100).toLocaleString('es-CO')}`, 18 + (colW * 2), 48)

    // Col 4: Gran Total
    doc.setFontSize(7)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(37, 99, 235)
    doc.text("TOTAL RECAUDO", 18 + (colW * 3), 41)
    doc.setFontSize(11)
    doc.setTextColor(37, 99, 235)
    doc.text(`$${(grandTotal / 100).toLocaleString('es-CO')}`, 18 + (colW * 3), 48)

    // Tabla de Detalle
    const tableBody = payments.map((p, idx) => {
      const baseCuota = (p.principalPart || 0) + (p.interestPart || 0)
      const mora = p.lateFee || 0
      return [
        (idx + 1).toString(),
        `${p.clientName}\nCC: ${p.idDocument}${p.clientPhone ? ` • Tel: ${p.clientPhone}` : ''}`,
        `#${p.loanId.slice(-6).toUpperCase()}`,
        `Cuota ${p.installmentNumber} / ${p.numberOfInstallments || '-'}`,
        `$${(p.principalPart / 100).toLocaleString('es-CO')}`,
        `$${(p.interestPart / 100).toLocaleString('es-CO')}${mora > 0 ? `\n(+$${(mora / 100).toLocaleString('es-CO')} mora)` : ''}`,
        `$${(p.amountPaid / 100).toLocaleString('es-CO')}`
      ]
    })

    autoTable(doc, {
      startY: 58,
      head: [['#', 'Cliente / Identificación', 'Ref.', 'Cuota', 'Capital', 'Interés/Mora', 'Total Cobro']],
      body: tableBody,
      theme: 'grid',
      headStyles: { 
        fillColor: [30, 41, 59], 
        textColor: [255, 255, 255], 
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'left'
      },
      bodyStyles: { 
        fontSize: 8,
        textColor: [51, 65, 85]
      },
      alternateRowStyles: { 
        fillColor: [248, 250, 252] 
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 62 },
        2: { cellWidth: 18, fontStyle: 'bold', halign: 'center' },
        3: { cellWidth: 24, halign: 'center' },
        4: { cellWidth: 22, halign: 'right' },
        5: { cellWidth: 24, halign: 'right' },
        6: { cellWidth: 24, halign: 'right', fontStyle: 'bold', textColor: [37, 99, 235] }
      },
      foot: [[
        { content: 'TOTALES CONSOLIDADOS', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `$${(grandPrincipal / 100).toLocaleString('es-CO')}`, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `$${((grandInterest + grandLate) / 100).toLocaleString('es-CO')}`, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `$${(grandTotal / 100).toLocaleString('es-CO')}`, styles: { halign: 'right', fontStyle: 'bold', textColor: [37, 99, 235] } }
      ]],
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontSize: 8.5
      },
      didDrawPage: (data) => {
        // Pie de Página
        doc.setFontSize(7)
        doc.setTextColor(148, 163, 184)
        doc.text(
          `JyJ Préstamos • Sistema de Gestión Crediticia • Generado por Usuario del Sistema`,
          14,
          pageHeight - 8
        )
        doc.text(
          `Página ${data.pageNumber}`,
          pageWidth - 14,
          pageHeight - 8,
          { align: 'right' }
        )
      }
    })

    doc.save(`${isProforma ? 'Pre_Liquidacion_Cobros' : 'Recibo_Lote_Clientes'}_${new Date().getTime()}.pdf`)
  }

  const generateInternalSettlementPDF = (payments: any[]) => {
    const doc = new jsPDF('landscape')
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // Encabezado Corporativo
    doc.setFillColor(15, 23, 42) // Slate 900
    doc.rect(0, 0, pageWidth, 28, 'F')

    // Barra de acento
    doc.setFillColor(168, 85, 247) // Purple 500
    doc.rect(0, 28, pageWidth, 2, 'F')

    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.setTextColor(255, 255, 255)
    doc.text("JYJ PRÉSTAMOS - LIQUIDACIÓN INTERNA & CUADRE DE CAJA", 14, 12)

    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(192, 132, 252)
    doc.text("CONFIDENCIAL • REPORTE FINANCIERO DE CAJA Y DISTRIBUCIÓN DE RENTABILIDAD", 14, 18)
    doc.setTextColor(148, 163, 184)
    doc.text("Exclusivo para Gerencia y Administración", 14, 23)

    // Metadatos a la derecha
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    doc.text(`Fecha Emisión: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`, pageWidth - 14, 12, { align: "right" })
    doc.setTextColor(168, 85, 247)
    doc.text(`Préstamos Liquidados: ${payments.length}`, pageWidth - 14, 18, { align: "right" })

    // Cálculos Contables Maestros
    let totalCollected = 0
    let totalPrincipal = 0
    let totalInterest = 0
    let totalSecretary = 0
    let totalReferral = 0
    let totalJyJPlatform = 0
    let totalInvestors = 0
    let totalJyJProfit = 0

    payments.forEach(p => {
      totalCollected += p.amountPaid || 0
      totalPrincipal += p.principalPart || 0
      totalInterest += p.totalInterest || ((p.interestPart || 0) + (p.lateFee || 0))
      totalSecretary += p.secretaryCommissionAmount || 0
      totalReferral += p.referralFee || 0
      totalJyJPlatform += p.jyjPlatformFee || 0
      totalJyJProfit += p.jyjProfit || 0

      if (p.investorsBreakdown) {
        p.investorsBreakdown.forEach((inv: any) => {
          totalInvestors += inv.investorPayout || 0
        })
      }
    })

    // Resumen Ejecutivo en 5 Tarjetas Contables
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(14, 34, pageWidth - 28, 20, 2, 2, 'F')
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(14, 34, pageWidth - 28, 20, 2, 2, 'S')

    const kpiW = (pageWidth - 28) / 5

    // 1. Total Recaudo
    doc.setFontSize(7)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(100, 116, 139)
    doc.text("TOTAL RECAUDADO", 18, 41)
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    doc.text(`$${(totalCollected / 100).toLocaleString('es-CO')}`, 18, 48)

    // 2. Retorno Inversionistas
    doc.setFontSize(7)
    doc.setTextColor(100, 116, 139)
    doc.text("PAGO INVERSIONISTAS", 18 + kpiW, 41)
    doc.setFontSize(10)
    doc.setTextColor(217, 119, 6) // Amber 600
    doc.text(`$${(totalInvestors / 100).toLocaleString('es-CO')}`, 18 + kpiW, 48)

    // 3. Comisión Secretaría & Ref.
    doc.setFontSize(7)
    doc.setTextColor(100, 116, 139)
    doc.text("COMISIONES / NÓMINA", 18 + (kpiW * 2), 41)
    doc.setFontSize(10)
    doc.setTextColor(225, 29, 72) // Rose 600
    doc.text(`$${((totalSecretary + totalReferral) / 100).toLocaleString('es-CO')}`, 18 + (kpiW * 2), 48)

    // 4. Retorno Capital Propio JyJ
    doc.setFontSize(7)
    doc.setTextColor(100, 116, 139)
    doc.text("CAPITAL RECUPERADO", 18 + (kpiW * 3), 41)
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    doc.text(`$${(totalPrincipal / 100).toLocaleString('es-CO')}`, 18 + (kpiW * 3), 48)

    // 5. Utilidad Neta JyJ
    doc.setFontSize(7)
    doc.setTextColor(147, 51, 234)
    doc.text("UTILIDAD NETA JYJ", 18 + (kpiW * 4), 41)
    doc.setFontSize(11)
    doc.setTextColor(147, 51, 234)
    doc.text(`$${(totalJyJProfit / 100).toLocaleString('es-CO')}`, 18 + (kpiW * 4), 48)

    // Tabla Contable Detallada
    const tableRows = payments.map((p, idx) => {
      let invDetails = "Fondeo Propio (100% JyJ)"
      if (p.investorsBreakdown && p.investorsBreakdown.length > 0) {
        invDetails = p.investorsBreakdown
          .map((inv: any) => `${inv.name} (${inv.percentage}%): $${(inv.investorPayout / 100).toLocaleString('es-CO')}`)
          .join('\n')
      }

      let commDetails = []
      if (p.secretaryCommissionAmount > 0) commDetails.push(`Secr: $${(p.secretaryCommissionAmount / 100).toLocaleString('es-CO')}`)
      if (p.referralFee > 0) commDetails.push(`Ref: $${(p.referralFee / 100).toLocaleString('es-CO')}`)
      const commStr = commDetails.length > 0 ? commDetails.join('\n') : '$0'

      return [
        (idx + 1).toString(),
        `${p.clientName}\nCC: ${p.idDocument}`,
        `#${p.loanId.slice(-6).toUpperCase()}\nCta ${p.installmentNumber}`,
        `$${(p.amountPaid / 100).toLocaleString('es-CO')}`,
        `$${(p.principalPart / 100).toLocaleString('es-CO')}`,
        `$${(p.totalInterest / 100).toLocaleString('es-CO')}`,
        commStr,
        invDetails,
        `$${(p.jyjProfit / 100).toLocaleString('es-CO')}`
      ]
    })

    autoTable(doc, {
      startY: 58,
      head: [['#', 'Cliente', 'Ref/Cuota', 'Recaudado', 'Capital', 'Interés', 'Comisiones', 'Liquidación Inversionistas', 'Utilidad JyJ']],
      body: tableRows,
      theme: 'grid',
      headStyles: { 
        fillColor: [88, 28, 135], // Purple 900
        textColor: [255, 255, 255], 
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'left'
      },
      bodyStyles: { 
        fontSize: 7.5,
        textColor: [51, 65, 85]
      },
      alternateRowStyles: { 
        fillColor: [250, 245, 255] // Purple 50
      },
      columnStyles: {
        0: { cellWidth: 7, halign: 'center' },
        1: { cellWidth: 45 },
        2: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
        4: { cellWidth: 22, halign: 'right' },
        5: { cellWidth: 22, halign: 'right' },
        6: { cellWidth: 26, halign: 'right' },
        7: { cellWidth: 70 },
        8: { cellWidth: 26, halign: 'right', fontStyle: 'bold', textColor: [147, 51, 234] }
      },
      foot: [[
        { content: 'TOTALES DE LIQUIDACIÓN', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `$${(totalCollected / 100).toLocaleString('es-CO')}`, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `$${(totalPrincipal / 100).toLocaleString('es-CO')}`, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `$${(totalInterest / 100).toLocaleString('es-CO')}`, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `$${((totalSecretary + totalReferral) / 100).toLocaleString('es-CO')}`, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `$${(totalInvestors / 100).toLocaleString('es-CO')}`, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `$${(totalJyJProfit / 100).toLocaleString('es-CO')}`, styles: { halign: 'right', fontStyle: 'bold', textColor: [147, 51, 234] } }
      ]],
      footStyles: {
        fillColor: [243, 232, 255],
        textColor: [15, 23, 42],
        fontSize: 8
      },
      didDrawPage: (data) => {
        doc.setFontSize(7)
        doc.setTextColor(148, 163, 184)
        doc.text(
          `JyJ Préstamos • Sistema de Liquidación Interna • Confidencial Gerencial`,
          14,
          pageHeight - 8
        )
        doc.text(
          `Página ${data.pageNumber}`,
          pageWidth - 14,
          pageHeight - 8,
          { align: 'right' }
        )
      }
    })

    doc.save(`Liquidacion_Interna_JyJ_${new Date().getTime()}.pdf`)
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
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-muted-foreground font-mono">ID: {loan.id.slice(0, 8).toUpperCase()}</span>
                              <span className="text-[9px] text-muted-foreground">•</span>
                              {loan.promissoryNoteUrl ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium" title="Pagaré firmado custodiado">
                                  <FileCheck className="h-3 w-3" /> Pagaré OK
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-400/80 font-normal" title="Sin pagaré firmado subido">
                                  <FileText className="h-3 w-3 opacity-70" /> Sin Pagaré
                                </span>
                              )}
                            </div>
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
