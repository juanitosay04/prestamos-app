"use client"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { Printer, Eye, Download, ShieldCheck, X, MessageSquare, FileSpreadsheet, Building2, Users } from "lucide-react"
import { useReactToPrint } from "react-to-print"
import { InternalSettlementTemplate, InternalSettlementData } from "@/components/InternalSettlementTemplate"

export function PrintInternalSettlementButton({ data }: { data: InternalSettlementData }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Manejo de tecla Escape y bloqueo de scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false)
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Liquidacion_Interna_${data.clientName.replace(/\s+/g, "_")}_${data.loanId.slice(-6).toUpperCase()}`
  })

  // Mensaje para WhatsApp con resumen contable
  const handleWhatsApp = () => {
    const abonosCount = data.principalPayments.length
    const totalAbonos = data.principalPayments.reduce((s, p) => s + p.amount, 0)
    
    let invText = data.investorsSummary.map(inv => 
      `• *${inv.name}* (${inv.percentage}%): Total Liquidado: $${(inv.totalLiquidated / 100).toLocaleString('es-CO')} | Cap. Devuelto: $${(inv.totalPrincipalReturned / 100).toLocaleString('es-CO')} | Rendimiento: $${(inv.interestEarned / 100).toLocaleString('es-CO')}`
    ).join("\n")

    const message = encodeURIComponent(
      `📊 *RESUMEN DE LIQUIDACIÓN INTERNA JYJ*\n` +
      `Préstamo: *#${data.loanId.slice(-6).toUpperCase()}*\n` +
      `Cliente: *${data.clientName}* (CC: ${data.idDocument})\n` +
      `Estado: *${data.status}*\n\n` +
      `💰 *Capital Inicial:* $${(data.principalAmount / 100).toLocaleString('es-CO')}\n` +
      `📈 *Total Recaudado:* $${(data.totalPaid / 100).toLocaleString('es-CO')}\n` +
      `⚡ *Abonos a Capital:* ${abonosCount} abono(s) por $${(totalAbonos / 100).toLocaleString('es-CO')}\n\n` +
      `👥 *REPARTICIÓN POR INVERSIONISTA:*\n${invText}\n\n` +
      `_Generado por Sistema Préstamos JyJ_`
    )
    window.open(`https://wa.me/?text=${message}`, "_blank")
  }

  return (
    <>
      {/* Botón Principal en la Vista del Préstamo */}
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-3.5 py-2 rounded-xl font-semibold text-xs transition-all border border-white/10 shadow-sm active:scale-95 hover:border-white/20"
        title="Ver o imprimir planilla de liquidación interna y repartición a inversores"
      >
        <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
        <span>Liquidación Interna (PDF)</span>
      </button>

      {/* Contenedor Oculto Exclusivo para Impresión Física / PDF Nativo */}
      <div aria-hidden="true" style={{ position: "fixed", top: "-9999px", left: "-9999px", width: "820px", opacity: 0, pointerEvents: "none", zIndex: -9999 }}>
        <InternalSettlementTemplate ref={printRef} data={data} isPreview={false} />
      </div>

      {/* Modal de Vista Previa Ejecutiva montado en document.body */}
      {mounted && isOpen && createPortal(
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false)
          }}
          className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="bg-[#0A0F1D] w-full max-w-5xl h-[92vh] max-h-[92vh] rounded-2xl border border-white/20 shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Header del Modal */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/15 bg-[#0D1424] flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex-shrink-0">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 truncate">
                    Planilla de Liquidación Interna & Repartición • {data.clientName}
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-mono truncate">
                    Ref: LIQ-{data.loanId.slice(-6).toUpperCase()} • Capital: ${(data.principalAmount / 100).toLocaleString('es-CO')}
                  </p>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                {/* Botón WhatsApp */}
                <button
                  onClick={handleWhatsApp}
                  className="h-9 px-3.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 active:scale-95 shadow-sm"
                  title="Compartir Resumen por WhatsApp"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </button>

                {/* Botón Imprimir / PDF */}
                <button
                  onClick={() => handlePrint()}
                  className="h-9 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                  title="Imprimir o Guardar en PDF"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Imprimir / PDF</span>
                </button>
                
                {/* Botón Cerrar */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="h-9 px-3.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs transition-all inline-flex items-center gap-1.5 active:scale-95 shadow-lg shadow-rose-500/20 cursor-pointer"
                  title="Cerrar visor (Esc)"
                >
                  <X className="h-4 w-4" />
                  <span>Cerrar</span>
                </button>
              </div>
            </div>

            {/* Visualizador / Canvas de Previsualización */}
            <div className="flex-1 min-h-0 bg-[#060813] p-4 sm:p-8 overflow-y-auto flex items-start justify-center">
              <div className="w-full max-w-[840px] rounded-lg shadow-2xl transition-transform my-auto">
                <InternalSettlementTemplate data={data} isPreview={true} />
              </div>
            </div>

            {/* Footer con Indicador de Validez */}
            <div className="px-6 py-2.5 bg-[#0A0E1A] border-t border-white/10 flex items-center justify-between text-xs text-muted-foreground flex-shrink-0">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                <ShieldCheck className="h-3.5 w-3.5" /> Planilla contable confidencial para uso interno de Préstamos JyJ e Inversionistas
              </span>
              <span className="font-mono text-[11px]">
                Formato Ejecutivo • 1 Página
              </span>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  )
}
