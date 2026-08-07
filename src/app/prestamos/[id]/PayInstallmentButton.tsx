"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Check, Loader2, X, Printer, MessageCircle } from "lucide-react"
import { payInstallment } from "@/app/actions/payment"
import { useReactToPrint } from "react-to-print"
import { ReceiptTemplate, ReceiptData } from "@/components/ReceiptTemplate"
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

  const [isSuccess, setIsSuccess] = useState(false)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  
  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Recibo_${installmentId}`
  })

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
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
    }
    setLoading(false)
  }

  const handleClose = () => {
    setIsOpen(false)
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
              <h2 className="text-xl font-bold text-white">{isSuccess ? "Pago Exitoso" : "Confirmar Pago"}</h2>
              <button onClick={handleClose} className="text-muted-foreground hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {isSuccess && receiptData ? (
              <div className="p-6 flex flex-col items-center gap-4 overflow-y-auto">
                <div className="h-16 w-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-1">
                  <Check className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-white">¡Pago Procesado con Éxito!</h3>
                  <p className="text-xs text-muted-foreground mt-1">El comprobante oficial ha sido generado y el estado de la cuota actualizado.</p>
                </div>
                
                <div className="w-full mt-3 flex flex-col gap-2.5">
                  <button 
                    onClick={handlePrint}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-98"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir Recibo Térmico (POS)
                  </button>

                  <button 
                    onClick={handleSendWhatsApp}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-98"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Enviar Comprobante por WhatsApp
                  </button>

                  <button 
                    onClick={handleClose}
                    className="w-full bg-white/[0.06] hover:bg-white/[0.12] text-white px-4 py-2.5 rounded-xl font-medium text-xs transition-colors"
                  >
                    Cerrar
                  </button>
                </div>

                <ReceiptTemplate ref={printRef} data={receiptData} />
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
