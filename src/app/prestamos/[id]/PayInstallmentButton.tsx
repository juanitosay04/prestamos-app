"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Check, Loader2, X, Printer, MessageCircle, AlertTriangle, ArrowLeft, ShieldAlert } from "lucide-react"
import { payInstallment } from "@/app/actions/payment"
import { useReactToPrint } from "react-to-print"
import { ReceiptTemplate, ReceiptPreview, ReceiptData } from "@/components/ReceiptTemplate"
import { CurrencyInput } from "@/components/ui/CurrencyInput"
import toast from "react-hot-toast"

export function PayInstallmentButton({ 
  installmentId, 
  status,
  dueDate,
  expectedAmount,
  amountPaid,
  principalPart,
  interestPart,
  loanId,
  clientName,
  idDocument,
  clientPhone,
  installmentNumber,
  totalInstallments,
  defaultedAt,
  totalOutstanding
}: { 
  installmentId: string
  status: string
  dueDate: Date
  expectedAmount: number
  amountPaid: number
  principalPart?: number
  interestPart?: number
  loanId: string
  clientName: string
  idDocument: string
  clientPhone?: string
  installmentNumber: number
  totalInstallments?: number
  defaultedAt?: Date | null
  totalOutstanding?: number
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Calcular mora sugerida
  const today = defaultedAt ? new Date(defaultedAt) : new Date()
  const due = new Date(dueDate)
  const diffTime = today.getTime() - due.getTime()
  const daysLate = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))
  const suggestedMora = daysLate * 2000

  const [moraToPay, setMoraToPay] = useState(suggestedMora.toString())
  
  const remainingAmount = expectedAmount - amountPaid
  const [amountToPay, setAmountToPay] = useState((remainingAmount / 100).toString())

  const [showMoraConfirmation, setShowMoraConfirmation] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  
  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Recibo_${installmentId}`
  })

  const executePayment = async () => {
    setLoading(true)
    setError("")
    
    const parsedMora = parseFloat(moraToPay) || 0
    const moraInCents = parsedMora * 100
    
    const parsedAmount = parseFloat(amountToPay) || 0
    const amountInCents = Math.round(parsedAmount * 100)

    if (amountInCents <= 0) {
      setError("El monto a abonar debe ser mayor a 0")
      setLoading(false)
      return
    }

    const result = await payInstallment(installmentId, moraInCents, amountInCents)
    
    if (result.error) {
      setError(result.error)
      toast.error(result.error)
      setShowMoraConfirmation(false)
    } else {
      toast.success("Pago registrado correctamente")
      const newOutstanding = totalOutstanding !== undefined ? Math.max(0, totalOutstanding - amountInCents) : undefined

      setReceiptData({
        loanId,
        clientName,
        idDocument,
        clientPhone,
        installmentNumber,
        totalInstallments,
        amountPaid: amountInCents + moraInCents,
        paymentDate: new Date(),
        moraPaid: moraInCents,
        principalPaid: principalPart,
        interestPaid: interestPart,
        remainingBalance: newOutstanding
      })
      setIsSuccess(true)
      setShowMoraConfirmation(false)
    }
    setLoading(false)
  }

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    const parsedAmount = parseFloat(amountToPay) || 0
    if (parsedAmount <= 0) {
      setError("El monto a abonar debe ser mayor a 0")
      return
    }

    const parsedMora = parseFloat(moraToPay) || 0
    if (parsedMora > 0) {
      // Doble confirmación si hay mora
      setShowMoraConfirmation(true)
      return
    }

    await executePayment()
  }

  const handleClose = () => {
    setIsOpen(false)
    setShowMoraConfirmation(false)
    if (isSuccess) {
      window.location.reload()
    }
  }

  const handleSendWhatsApp = () => {
    if (!receiptData) return
    const cleanPhone = (clientPhone || "").replace(/\D/g, "")
    const fullPhone = cleanPhone.startsWith("57") ? cleanPhone : "57" + cleanPhone

    const baseAbono = Math.max(0, receiptData.amountPaid - receiptData.moraPaid)
    const fecha = new Date(receiptData.paymentDate).toLocaleDateString("es-CO")
    const hora = new Date(receiptData.paymentDate).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })

    const msg = `*JYJ PRÉSTAMOS - COMPROBANTE DE PAGO* 🧾\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 *Cliente:* ${receiptData.clientName}\n` +
      `📄 *Documento:* ${receiptData.idDocument}\n` +
      `🔖 *Ref. Préstamo:* #${receiptData.loanId.slice(-6).toUpperCase()}\n` +
      `📅 *Fecha:* ${fecha} ${hora}\n` +
      `🔢 *Concepto:* Cuota #${receiptData.installmentNumber}${receiptData.totalInstallments ? ` de ${receiptData.totalInstallments}` : ''}\n\n` +
      `💵 *Abono a Cuota:* $${(baseAbono / 100).toLocaleString("es-CO")}\n` +
      (receiptData.moraPaid > 0 ? `⚠️ *Recargo por Mora:* $${(receiptData.moraPaid / 100).toLocaleString("es-CO")}\n` : '') +
      `💰 *TOTAL PAGADO:* $${(receiptData.amountPaid / 100).toLocaleString("es-CO")}\n` +
      (receiptData.remainingBalance !== undefined ? `📉 *Saldo Deuda Restante:* $${(receiptData.remainingBalance / 100).toLocaleString("es-CO")}\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `_¡Muchas gracias por su puntualidad! Conserve este comprobante como soporte oficial._`

    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`
    window.open(url, "_blank")
  }

  const isPaid = status === "PAID";

  return (
    <>
      {isPaid ? (
        <span className="inline-flex items-center gap-1 text-emerald-400 font-medium text-sm">
          <Check className="h-4 w-4" /> Pagada
        </span>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2"
        >
          <Check className="h-4 w-4" />
          Registrar Pago
        </button>
      )}

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-card w-full max-w-md max-h-[90vh] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-white/5">
              <h2 className="text-xl font-bold text-white">
                {isSuccess ? "Pago Exitoso" : showMoraConfirmation ? "Confirmación de Mora" : "Confirmar Pago"}
              </h2>
              <button onClick={handleClose} className="text-muted-foreground hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {isSuccess && receiptData ? (
              <div className="flex flex-col gap-0 overflow-y-auto max-h-[80vh]">
                {/* Recibo visual premium */}
                <div className="p-4 pb-3">
                  <ReceiptPreview data={receiptData} />
                </div>

                {/* Botones de acción */}
                <div className="px-5 pb-5 pt-2 flex flex-col gap-2.5 border-t border-white/[0.06]">
                  <button 
                    onClick={handlePrint}
                    className="w-full bg-white/[0.06] hover:bg-white/[0.10] text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 border border-white/[0.08] active:scale-98"
                  >
                    <Printer className="h-4 w-4 text-blue-400" />
                    Imprimir Recibo Térmico (POS)
                  </button>

                  <button 
                    onClick={handleSendWhatsApp}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-98"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Enviar por WhatsApp
                  </button>

                  <button 
                    onClick={handleClose}
                    className="w-full bg-white/[0.04] hover:bg-white/[0.08] text-muted-foreground hover:text-white px-4 py-2 rounded-xl font-medium text-xs transition-colors"
                  >
                    Cerrar
                  </button>
                </div>

                <ReceiptTemplate ref={printRef} data={receiptData} />
              </div>
            ) : showMoraConfirmation ? (
              <div className="p-6 flex flex-col gap-5 overflow-y-auto">
                <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300">
                  <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 flex-shrink-0">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Doble Validación: Cobro de Mora</h3>
                    <p className="text-xs text-amber-300/80 mt-0.5">
                      Has ingresado un valor de recargo por mora para esta cuota. Por favor verifica que el monto sea correcto.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 bg-white/[0.03] p-4 rounded-xl border border-white/[0.08] text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-white/[0.06]">
                    <span className="text-muted-foreground">Cliente:</span>
                    <span className="font-bold text-white">{clientName}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-white/[0.06]">
                    <span className="text-muted-foreground">Documento:</span>
                    <span className="font-mono text-white">{idDocument}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-white/[0.06]">
                    <span className="text-muted-foreground">Cuota:</span>
                    <span className="font-semibold text-white">#{installmentNumber} de {totalInstallments || 1}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-white/[0.06]">
                    <span className="text-muted-foreground">Abono a Cuota:</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      ${(parseFloat(amountToPay) || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-white/[0.06] bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
                    <span className="font-semibold text-destructive flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4" /> Recargo por Mora:
                    </span>
                    <span className="font-bold text-destructive font-mono text-sm">
                      +${(parseFloat(moraToPay) || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 font-bold text-sm">
                    <span className="text-white">Total a Recaudar:</span>
                    <span className="text-emerald-400 font-mono text-base font-extrabold">
                      ${((parseFloat(amountToPay) || 0) + (parseFloat(moraToPay) || 0)).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowMoraConfirmation(false)}
                    disabled={loading}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-white/[0.06] hover:bg-white/[0.12] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Modificar Mora
                  </button>
                  <button 
                    type="button"
                    onClick={executePayment}
                    disabled={loading}
                    className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg shadow-amber-600/25 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {loading ? "Procesando..." : "Sí, Confirmar y Cobrar"}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePay} className="p-6 flex flex-col gap-4 overflow-y-auto">
                {error && (
                  <div className="bg-destructive/20 text-destructive text-sm p-3 rounded-lg border border-destructive/20">
                    {error}
                  </div>
                )}

                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm text-muted-foreground">Valor original de la cuota</p>
                    <p className="text-lg font-bold text-white">
                      ${(expectedAmount / 100).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  {amountPaid > 0 && (
                    <div className="flex justify-between items-center mb-1 text-blue-400">
                      <p className="text-sm font-medium">Abonado previamente</p>
                      <p className="text-sm font-bold">
                        -${(amountPaid / 100).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/10">
                    <p className="text-sm font-medium text-emerald-400">Saldo pendiente de la cuota</p>
                    <p className="text-xl font-bold text-emerald-400">
                      ${(remainingAmount / 100).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 mt-4">
                    <label className="text-sm font-medium text-emerald-400">
                      Monto a Abonar a esta Cuota ($) *
                    </label>
                    <CurrencyInput 
                      required
                      value={amountToPay}
                      onChange={(val) => setAmountToPay(val)}
                      className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 text-emerald-100 focus:outline-none focus:border-emerald-500 transition-colors text-lg font-bold" 
                    />
                    <p className="text-xs text-muted-foreground">Si abona menos del saldo pendiente, la cuota quedará como Pago Parcial.</p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-destructive flex justify-between">
                    <span>Mora Cobrada ($)</span>
                    {daysLate > 0 && <span className="text-xs">{daysLate} días de atraso</span>}
                  </label>
                  <CurrencyInput 
                    required
                    value={moraToPay}
                    onChange={(val) => setMoraToPay(val)}
                    className="bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 text-destructive focus:outline-none focus:border-destructive transition-colors" 
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">Puedes ajustar este valor si negociaste un monto distinto con el cliente.</p>
                </div>

                <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-white/5">
                  <button 
                    type="button" 
                    onClick={handleClose}
                    className="px-4 py-2 rounded-lg font-medium text-muted-foreground hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {loading ? "Procesando..." : "Confirmar Pago"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
