"use client"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { Briefcase, Calendar, FileDown, Printer, Loader2, Check, ShieldAlert, ChevronRight, User, FileCheck, FileText, FileSpreadsheet, X, MessageSquare, Download, ChevronLeft, Building2, Users } from "lucide-react"
import Link from "next/link"
import { processBatchInstallments, getBatchInstallmentsInfo } from "@/app/actions/payment"
import { getInternalSettlementData, getBatchInstallmentBreakdown } from "@/app/actions/loan"
import { InternalSettlementTemplate, InternalSettlementData } from "@/components/InternalSettlementTemplate"
import { useReactToPrint } from "react-to-print"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

type Loan = any

export function PrestamosTableClient({ loans, userRole }: { loans: Loan[], userRole?: string }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // Estado para el Modal de Liquidación Interna
  const [settlementModalOpen, setSettlementModalOpen] = useState(false)
  const [settlementDataList, setSettlementDataList] = useState<InternalSettlementData[]>([])
  const [currentSettlementIndex, setCurrentSettlementIndex] = useState(0)

  // Estado para el Modal de Desglose de Pago (Inversionistas)
  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false)
  const [breakdownData, setBreakdownData] = useState<{ loansBreakdown: any[], consolidatedPayouts: any[] } | null>(null)
  const [breakdownActiveTab, setBreakdownActiveTab] = useState<"consolidated" | "details">("consolidated")

  const printSingleRef = useRef<HTMLDivElement>(null)
  const printBatchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    return () => {
      // Cleanup al desmontar: restaurar overflow del body
      document.body.style.overflow = "unset"
    }
  }, [])

  const closeModal = () => {
    setSettlementModalOpen(false)
    // Limpiar datos al cerrar para que no quede estado residual en memoria
    setTimeout(() => {
      setSettlementDataList([])
      setCurrentSettlementIndex(0)
    }, 250) // pequeño delay para que la animacion de salida se complete
  }

  const closeBreakdownModal = () => {
    setBreakdownModalOpen(false)
    setTimeout(() => {
      setBreakdownData(null)
      setBreakdownActiveTab("consolidated")
    }, 250)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal()
        closeBreakdownModal()
      }
    }
    if (settlementModalOpen || breakdownModalOpen) {
      window.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "unset"
    }
  }, [settlementModalOpen, breakdownModalOpen])

  const handlePrintSingle = useReactToPrint({
    contentRef: printSingleRef,
    documentTitle: settlementDataList[currentSettlementIndex] 
      ? `Liquidacion_Interna_${settlementDataList[currentSettlementIndex].clientName.replace(/\s+/g, "_")}_${settlementDataList[currentSettlementIndex].loanId.slice(-6).toUpperCase()}`
      : "Liquidacion_Interna"
  })

  const handlePrintBatch = useReactToPrint({
    contentRef: printBatchRef,
    documentTitle: `Liquidacion_Interna_Lote_${settlementDataList.length}_Prestamos_${new Date().getTime()}`
  })

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

  const handleWhatsAppShare = (item: InternalSettlementData) => {
    if (!item) return
    const principalPayments = item.principalPayments || []
    const investorsSummary = item.investorsSummary || []
    const abonosCount = principalPayments.length
    const totalAbonos = principalPayments.reduce((s, p) => s + (p.amount || 0), 0)
    
    let invText = investorsSummary.map(inv => 
      `• *${inv.name}* (${inv.percentage}%): Total Liquidado: $${((inv.totalLiquidated || 0) / 100).toLocaleString('es-CO')} | Cap. Devuelto: $${((inv.totalPrincipalReturned || 0) / 100).toLocaleString('es-CO')} | Rendimiento: $${((inv.interestEarned || 0) / 100).toLocaleString('es-CO')}`
    ).join("\n")

    const message = encodeURIComponent(
      `📊 *RESUMEN DE LIQUIDACIÓN INTERNA JYJ*\n` +
      `Préstamo: *#${(item.loanId || "").slice(-6).toUpperCase()}*\n` +
      `Cliente: *${item.clientName}* (CC: ${item.idDocument})\n` +
      `Estado: *${item.status}*\n\n` +
      `💰 *Capital Inicial:* $${((item.principalAmount || 0) / 100).toLocaleString('es-CO')}\n` +
      `📈 *Total Recaudado:* $${((item.totalPaid || 0) / 100).toLocaleString('es-CO')}\n` +
      `⚡ *Abonos a Capital:* ${abonosCount} abono(s) por $${(totalAbonos / 100).toLocaleString('es-CO')}\n\n` +
      `👥 *REPARTICIÓN POR INVERSIONISTA:*\n${invText || "• Capital Propio JyJ (100%)"}\n\n` +
      `_Generado por Sistema Préstamos JyJ_`
    )
    window.open(`https://wa.me/?text=${message}`, "_blank")
  }

  const handleAction = async (mode: "CLIENT_PDF" | "CLIENT_PAY" | "INTERNAL_REPORT" | "PAYOUT_BREAKDOWN") => {
    if (mode === "INTERNAL_REPORT") {
      try {
        setLoading(true)
        const res = await getInternalSettlementData(selectedIds)
        setLoading(false)

        if (res.error) {
          alert(res.error)
          return
        }

        if (res.data && res.data.length > 0) {
          setSettlementDataList(res.data)
          setCurrentSettlementIndex(0)
          setSettlementModalOpen(true)
        } else {
          alert("No se encontró información de liquidación para los préstamos seleccionados.")
        }
      } catch (err: any) {
        setLoading(false)
        console.error("Error al cargar liquidación interna:", err)
        alert("Ocurrió un error al procesar la liquidación interna: " + (err?.message || err))
      }
      return
    }

    if (mode === "PAYOUT_BREAKDOWN") {
      try {
        setLoading(true)
        const res = await getBatchInstallmentBreakdown(selectedIds)
        setLoading(false)

        if (res.error) {
          alert(res.error)
          return
        }

        if (res.data && res.data.loansBreakdown.length > 0) {
          setBreakdownData(res.data)
          setBreakdownModalOpen(true)
        } else {
          alert("Ninguno de los préstamos seleccionados tiene cuotas pagadas para desglosar.")
        }
      } catch (err: any) {
        setLoading(false)
        console.error("Error al generar desglose de cuotas:", err)
        alert("Ocurrió un error al procesar el desglose de cuotas: " + (err?.message || err))
      }
      return
    }

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
        generateClientReceiptsPDF(successfulPayments, mode === "CLIENT_PDF")

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

  const handleWhatsAppBreakdown = (data: any) => {
    if (!data) return
    let text = `📊 *DESGLOSE MASIVO DE RENTABILIDAD Y PAGOS - JYJ*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Resumen de cobros de las últimas cuotas pagadas para los préstamos seleccionados.\n\n` +
      `💵 *CONSOLIDADO DE TRANSFERENCIAS:*\n`
    
    data.consolidatedPayouts.forEach((p: any) => {
      text += `👤 *${p.name}*: $${(p.amount / 100).toLocaleString('es-CO')} netos\n`
    })

    text += `\n━━━━━━━━━━━━━━━━━━━━\n` +
      `📂 *DETALLE POR DEUDOR:*\n`

    data.loansBreakdown.forEach((l: any) => {
      text += `• *${l.clientName}* (Cta #${l.installmentNumber}):\n` +
        `  - Recaudado: $${(l.amountPaid / 100).toLocaleString('es-CO')}\n` +
        `  - Abono Capital: $${(l.principalPart / 100).toLocaleString('es-CO')}\n` +
        `  - Comisión JyJ: $${(l.companyCommission / 100).toLocaleString('es-CO')}\n`
      if (l.investorsBreakdown.length > 0) {
        text += `  - Distribución Inversionistas:\n`
        l.investorsBreakdown.forEach((inv: any) => {
          text += `    ↳ ${inv.name}: $${(inv.totalPayout / 100).toLocaleString('es-CO')} (${inv.percentage}%)\n`
        })
      } else {
        text += `  - Fondeo Propio JyJ (100%)\n`
      }
      text += `\n`
    })

    text += `_Generado automáticamente por el Sistema Préstamos JyJ_`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank")
  }

  const generateBatchBreakdownPDF = (data: any) => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // Header
    doc.setFillColor(15, 23, 42) // Slate 900
    doc.rect(0, 0, pageWidth, 28, 'F')
    doc.setFillColor(147, 51, 234) // Purple 500
    doc.rect(0, 28, pageWidth, 2, 'F')

    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.setTextColor(255, 255, 255)
    doc.text("JYJ PRÉSTAMOS - REPORTE DE PAGOS A INVERSIONISTAS", 14, 12)

    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(192, 132, 252)
    doc.text("INFORME DE DISTRIBUCIÓN DE CUOTAS COBRADAS Y TRANSFERENCIAS CONSOLIDADAS", 14, 18)
    doc.setTextColor(148, 163, 184)
    doc.text(`Préstamos Procesados: ${data.loansBreakdown.length}`, 14, 23)

    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO')}`, pageWidth - 14, 12, { align: "right" })

    // Consolidated Payouts Table
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    doc.setFont("helvetica", "bold")
    doc.text("1. CONSOLIDADO DE TRANSFERENCIAS A REALIZAR", 14, 38)

    const consolidatedRows = data.consolidatedPayouts.map((p: any, idx: number) => {
      let concept = ""
      if (p.type === "INVESTOR") concept = "Retorno Capital + Rendimiento"
      else if (p.type === "COMPANY") concept = "Utilidad JyJ (Capital + Comisión)"
      else if (p.type === "SECRETARY") concept = "Comisión Colocación/Cobranza"
      else if (p.type === "REFERRER") concept = "Comisión Referido (3%)"
      return [
        (idx + 1).toString(),
        p.name,
        concept,
        p.capitalTotal > 0 ? `$${(p.capitalTotal / 100).toLocaleString('es-CO')}` : "-",
        p.interestTotal > 0 ? `$${(p.interestTotal / 100).toLocaleString('es-CO')}` : "-",
        `$${(p.amount / 100).toLocaleString('es-CO')}`
      ]
    })

    autoTable(doc, {
      startY: 42,
      head: [['#', 'Destinatario', 'Concepto', 'Capital', 'Rentabilidad', 'Total a Transferir']],
      body: consolidatedRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8.5, textColor: [51, 65, 85] },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 50, fontStyle: 'bold' },
        2: { cellWidth: 55 },
        3: { cellWidth: 25, halign: 'right', textColor: [37, 99, 235] },
        4: { cellWidth: 25, halign: 'right', textColor: [5, 150, 105] },
        5: { cellWidth: 25, halign: 'right', fontStyle: 'bold', textColor: [147, 51, 234] }
      }
    })

    // Loan breakdown table
    const nextY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    doc.setFont("helvetica", "bold")
    doc.text("2. DESGLOSE DETALLADO POR CRÉDITO Y CUOTA PAGADA", 14, nextY)

    const loanRows = data.loansBreakdown.map((l: any, idx: number) => {
      let distStr = "100% JyJ (Capital Propio)"
      if (l.investorsBreakdown.length > 0) {
        distStr = l.investorsBreakdown.map((inv: any) => 
          `${inv.name} (${inv.percentage}%)\n  Cap: $${(inv.capitalPayout / 100).toLocaleString('es-CO')} | Rent: $${(inv.interestPayout / 100).toLocaleString('es-CO')} | Total: $${(inv.totalPayout / 100).toLocaleString('es-CO')}`
        ).join('\n')
        if (l.jyjBreakdown && l.jyjBreakdown.percentage > 0) {
          distStr += `\nJyJ ${l.jyjBreakdown.percentage}%: Cap: $${(l.jyjBreakdown.capital / 100).toLocaleString('es-CO')} | Rent: $${(l.jyjBreakdown.interest / 100).toLocaleString('es-CO')}`
        }
      }
      return [
        (idx + 1).toString(),
        `${l.clientName}\nRef: #${l.loanId.slice(-6).toUpperCase()}`,
        `Cta #${l.installmentNumber}`,
        `$${(l.amountPaid / 100).toLocaleString('es-CO')}`,
        `Capital: $${(l.principalPart / 100).toLocaleString('es-CO')}\nInterés: $${(l.interestPart / 100).toLocaleString('es-CO')}`,
        `Secr: $${(l.secretaryCommission / 100).toLocaleString('es-CO')}\nJyJ Com: $${(l.companyCommission / 100).toLocaleString('es-CO')}\nNeto: $${(l.netYield / 100).toLocaleString('es-CO')}`,
        distStr
      ]
    })


    autoTable(doc, {
      startY: nextY + 4,
      head: [['#', 'Cliente / Préstamo', 'Cuota', 'Recaudado', 'Amortización', 'Deducciones', 'Distribución']],
      body: loanRows,
      theme: 'grid',
      headStyles: { fillColor: [88, 28, 135], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [250, 245, 255] },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 38 },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
        4: { cellWidth: 35 },
        5: { cellWidth: 30 },
        6: { cellWidth: 48 }
      },
      didDrawPage: (data) => {
        doc.setFontSize(7)
        doc.setTextColor(148, 163, 184)
        doc.text(
          `Préstamos JyJ • Reporte de Liquidación de Cuotas Pagadas • Página ${data.pageNumber}`,
          14,
          pageHeight - 8
        )
      }
    })

    doc.save(`Desglose_Pagos_Inversionistas_${new Date().getTime()}.pdf`)
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

            <button 
              onClick={() => handleAction("INTERNAL_REPORT")}
              disabled={loading}
              className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50 active:scale-95 shadow-sm hover:border-purple-500/50"
              title="Descarga o previsualiza informe administrativo con comisiones y rentabilidad"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldAlert className="h-3.5 w-3.5 text-purple-400" />}
              Liquidación Interna
            </button>

            <button 
              onClick={() => handleAction("PAYOUT_BREAKDOWN")}
              disabled={loading}
              className="bg-pink-600/20 hover:bg-pink-600/30 text-pink-200 border border-pink-500/30 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50 active:scale-95 shadow-sm hover:border-pink-500/50"
              title="Desglose de distribución de la última cuota pagada entre inversionistas y JyJ"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Briefcase className="h-3.5 w-3.5 text-pink-400" />}
              Desglose de Pago
            </button>

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

      {/* Modal de Liquidación Interna Ejecutiva */}
      {mounted && settlementModalOpen && settlementDataList.length > 0 && createPortal(
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
          className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="bg-[#0A0F1D] w-full max-w-5xl h-[94vh] max-h-[94vh] rounded-2xl border border-white/20 shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Header del Modal */}
            <div className="flex flex-col gap-2 px-4 sm:px-6 py-3.5 border-b border-white/15 bg-[#0D1424] flex-shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex-shrink-0">
                    <FileSpreadsheet className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 truncate">
                      Planilla de Liquidación Interna & Repartición
                    </h3>
                    <p className="text-[11px] text-muted-foreground font-mono truncate">
                      {settlementDataList[currentSettlementIndex]?.clientName} • Ref: LIQ-{settlementDataList[currentSettlementIndex]?.loanId.slice(-6).toUpperCase()} • ${(settlementDataList[currentSettlementIndex]?.principalAmount / 100).toLocaleString('es-CO')}
                    </p>
                  </div>
                </div>

                {/* Acciones del Header */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleWhatsAppShare(settlementDataList[currentSettlementIndex])}
                    className="h-9 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 active:scale-95 shadow-sm"
                    title="Compartir resumen por WhatsApp"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </button>

                  <button
                    onClick={() => handlePrintSingle()}
                    className="h-9 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-lg shadow-purple-600/20 active:scale-95"
                    title="Imprimir o guardar PDF del préstamo actual"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>{settlementDataList.length > 1 ? "Imprimir Este" : "Imprimir / Guardar PDF"}</span>
                  </button>

                  {settlementDataList.length > 1 && (
                    <button
                      onClick={() => handlePrintBatch()}
                      className="h-9 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 active:scale-95"
                      title="Imprimir todos los préstamos seleccionados en lote"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Imprimir Todo ({settlementDataList.length})</span>
                    </button>
                  )}

                  <button
                    onClick={() => closeModal()}
                    className="h-9 w-9 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white rounded-xl flex items-center justify-center transition-all border border-white/10 active:scale-95 ml-1"
                    title="Cerrar vista previa (Esc)"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Selector de Pestañas si se seleccionaron múltiples préstamos */}
              {settlementDataList.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 border-t border-white/10">
                  <span className="text-[10px] text-muted-foreground font-mono mr-1">Préstamos:</span>
                  {settlementDataList.map((item, idx) => (
                    <button
                      key={item.loanId || idx}
                      onClick={() => setCurrentSettlementIndex(idx)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        currentSettlementIndex === idx
                          ? "bg-purple-600 text-white shadow-md shadow-purple-500/30 border border-purple-400/30"
                          : "bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 border border-white/5"
                      }`}
                    >
                      <span>{idx + 1}. {item.clientName}</span>
                      <span className="text-[10px] opacity-75 font-mono">(${(item.principalAmount / 100).toLocaleString('es-CO')})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Vista Previa del Documento */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/60 flex justify-center items-start">
              {settlementDataList[currentSettlementIndex] && (
                <InternalSettlementTemplate 
                  data={settlementDataList[currentSettlementIndex]} 
                  isPreview={true} 
                />
              )}
            </div>
          </div>

          {/* Contenedor Oculto para Impresión de Préstamo Individual */}
          <div style={{ position: "fixed", top: "-99999px", left: "-99999px", opacity: 0, pointerEvents: "none" }}>
            {settlementDataList[currentSettlementIndex] && (
              <div ref={printSingleRef}>
                <InternalSettlementTemplate 
                  data={settlementDataList[currentSettlementIndex]} 
                  isPreview={false} 
                />
              </div>
            )}
          </div>

          {/* Contenedor Oculto para Impresión de Lote Completo */}
          <div style={{ position: "fixed", top: "-99999px", left: "-99999px", opacity: 0, pointerEvents: "none" }}>
            <div ref={printBatchRef}>
              {settlementDataList.map((item, idx) => (
                <div key={item.loanId || idx} style={{ pageBreakAfter: idx < settlementDataList.length - 1 ? "always" : "auto", breakAfter: idx < settlementDataList.length - 1 ? "page" : "auto" }}>
                  <InternalSettlementTemplate data={item} isPreview={false} />
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {mounted && breakdownModalOpen && breakdownData && createPortal(
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) closeBreakdownModal()
          }}
          className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="bg-[#0A0F1D] w-full max-w-4xl h-[90vh] max-h-[90vh] rounded-2xl border border-white/20 shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Header del Modal */}
            <div className="px-4 sm:px-6 py-4 border-b border-white/15 bg-[#0D1424] flex-shrink-0 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-pink-400" />
                  Desglose de Pagos a Inversionistas ({breakdownData.loansBreakdown.length} cuotas procesadas)
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Distribución detallada del recaudo de la última cuota pagada
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleWhatsAppBreakdown(breakdownData)}
                  className="h-9 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 active:scale-95 shadow-sm"
                  title="Compartir resumen consolidado por WhatsApp"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Compartir</span>
                </button>

                <button
                  onClick={() => generateBatchBreakdownPDF(breakdownData)}
                  className="h-9 px-3 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-lg shadow-pink-600/20 active:scale-95"
                  title="Descargar reporte PDF del desglose de pago"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Descargar PDF</span>
                </button>

                <button
                  onClick={closeBreakdownModal}
                  className="h-9 w-9 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white rounded-xl flex items-center justify-center transition-all border border-white/10 active:scale-95 ml-1"
                  title="Cerrar modal (Esc)"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Selector de Pestañas */}
            <div className="flex bg-[#0D1424] px-4 sm:px-6 border-b border-white/[0.08] flex-shrink-0">
              <button
                onClick={() => setBreakdownActiveTab("consolidated")}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                  breakdownActiveTab === "consolidated"
                    ? "border-pink-500 text-pink-400"
                    : "border-transparent text-muted-foreground hover:text-white"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                Consolidado de Transferencias
              </button>
              <button
                onClick={() => setBreakdownActiveTab("details")}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                  breakdownActiveTab === "details"
                    ? "border-pink-500 text-pink-400"
                    : "border-transparent text-muted-foreground hover:text-white"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                Detalles por Crédito
              </button>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/40">
              {breakdownActiveTab === "consolidated" ? (
                <div className="space-y-4">
                  <div className="bg-slate-900/60 border border-white/[0.08] rounded-xl p-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Listado de transferencias a realizar
                    </h4>
                    <div className="divide-y divide-white/[0.06] space-y-3">
                      {breakdownData.consolidatedPayouts.map((p: any, idx: number) => (
                        <div key={idx} className="pt-3 first:pt-0">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-white">{p.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {p.type === "INVESTOR" ? "Inversionista Externo" :
                                 p.type === "COMPANY" ? "JyJ (Capital propio + Comisiones)" :
                                 p.type === "SECRETARY" ? "Secretaría (Comisión Colocación/Cobranza)" : "Comisión por Referido (3%)"}
                              </p>
                              {/* Desglose Capital vs Rentabilidad */}
                              {(p.capitalTotal > 0 || p.interestTotal > 0) && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {p.capitalTotal > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-mono">
                                      🏦 Capital: ${(p.capitalTotal / 100).toLocaleString('es-CO')}
                                    </span>
                                  )}
                                  {p.interestTotal > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">
                                      📈 Rentabilidad: ${(p.interestTotal / 100).toLocaleString('es-CO')}
                                    </span>
                                  )}
                                </div>
                              )}
                              {/* Desglose individual por crédito */}
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {p.details.map((det: any, dIdx: number) => (
                                  <span key={dIdx} className="text-[9px] bg-white/[0.04] border border-white/[0.06] text-slate-300 px-2 py-0.5 rounded font-mono">
                                    {det.clientName}: ${(det.total / 100).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-4">
                              <span className="text-base font-extrabold text-pink-400 font-mono">
                                ${(p.amount / 100).toLocaleString('es-CO')}
                              </span>
                              <p className="text-[9px] text-muted-foreground mt-0.5">Total a transferir</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="space-y-6">
                  {breakdownData.loansBreakdown.map((l: any, idx: number) => (
                    <div key={idx} className="bg-slate-900/60 border border-white/[0.08] rounded-xl p-5 space-y-4 text-left">
                      {/* Header de deudor */}
                      <div className="flex justify-between items-center border-b border-white/[0.06] pb-3">
                        <div>
                          <h4 className="text-sm font-extrabold text-white">{l.clientName}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                            Ref: #{l.loanId.slice(-8).toUpperCase()} • CC: {l.idDocument}
                          </p>
                        </div>
                        <span className="bg-pink-500/10 text-pink-400 border border-pink-500/20 px-2.5 py-1 rounded-lg text-xs font-semibold font-mono">
                          Cuota #{l.installmentNumber} Pagada
                        </span>
                      </div>

                      {/* Caja de recaudo y amortización */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-white/[0.02] border border-white/[0.05] p-3 rounded-lg">
                          <span className="text-[10px] text-muted-foreground block uppercase">Recaudado</span>
                          <span className="text-sm font-bold text-white font-mono">${(l.amountPaid / 100).toLocaleString('es-CO')}</span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/[0.05] p-3 rounded-lg">
                          <span className="text-[10px] text-muted-foreground block uppercase">Capital</span>
                          <span className="text-sm font-bold text-white font-mono">${(l.principalPart / 100).toLocaleString('es-CO')}</span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/[0.05] p-3 rounded-lg">
                          <span className="text-[10px] text-muted-foreground block uppercase">Interés</span>
                          <span className="text-sm font-bold text-white font-mono">${(l.interestPart / 100).toLocaleString('es-CO')}</span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/[0.05] p-3 rounded-lg">
                          <span className="text-[10px] text-muted-foreground block uppercase">Mora Cobrada</span>
                          <span className="text-sm font-bold text-orange-400 font-mono">${(l.lateFee / 100).toLocaleString('es-CO')}</span>
                        </div>
                      </div>

                      {/* Deducciones */}
                      <div className="bg-white/[0.02] border border-white/[0.05] p-4 rounded-lg space-y-2">
                        <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Deducciones y Comisiones de la Cuota
                        </h5>
                        <div className="grid grid-cols-3 gap-4 text-xs">
                          <div>
                            <span className="text-muted-foreground block">Secretaría:</span>
                            <span className="font-semibold text-slate-200 font-mono">${(l.secretaryCommission / 100).toLocaleString('es-CO')}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Comisión JyJ:</span>
                            <span className="font-semibold text-slate-200 font-mono">${(l.companyCommission / 100).toLocaleString('es-CO')}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Comisión Referidor:</span>
                            <span className="font-semibold text-slate-200 font-mono">${(l.referralCommission / 100).toLocaleString('es-CO')}</span>
                          </div>
                        </div>
                        <div className="border-t border-white/[0.04] pt-2 flex justify-between items-center text-xs">
                          <span className="font-semibold text-emerald-400">Rendimiento Neto a Repartir:</span>
                          <span className="font-extrabold text-emerald-400 font-mono">${(l.netYield / 100).toLocaleString('es-CO')}</span>
                        </div>
                      </div>

                      {/* Repartición Final */}
                      <div className="space-y-2.5">
                        <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Distribución de Fondos
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {l.investorsBreakdown.map((inv: any, iIdx: number) => (
                            <div key={iIdx} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 flex justify-between items-center text-xs">
                              <div>
                                <p className="font-bold text-white">{inv.name}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  Part: {inv.percentage}% • (Cap: ${(inv.capitalPayout / 100).toLocaleString('es-CO')} + Int: ${(inv.interestPayout / 100).toLocaleString('es-CO')})
                                </p>
                              </div>
                              <span className="font-bold text-pink-400 font-mono text-sm">${(inv.totalPayout / 100).toLocaleString('es-CO')}</span>
                            </div>
                          ))}
                          
                          {/* Mostrar también la parte de capital propio de JyJ si aplica */}
                          {l.jyjBreakdown.percentage > 0 && (
                            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 flex justify-between items-center text-xs">
                              <div>
                                <p className="font-bold text-emerald-400">Capital Propio (JyJ)</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  Part: {l.jyjBreakdown.percentage}% • (Cap: ${(l.jyjBreakdown.capital / 100).toLocaleString('es-CO')} + Int: ${(l.jyjBreakdown.interest / 100).toLocaleString('es-CO')})
                                </p>
                              </div>
                              <span className="font-bold text-emerald-400 font-mono text-sm">${(l.jyjBreakdown.total / 100).toLocaleString('es-CO')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-[#0D1424] flex justify-end flex-shrink-0">
              <button
                onClick={closeBreakdownModal}
                className="bg-[#1E293B] hover:bg-[#334155] border border-white/10 text-white px-5 py-2 rounded-xl text-xs font-semibold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
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
