"use client"

import { MessageCircle } from "lucide-react"

type ReminderProps = {
  clientName: string
  clientPhone: string
  installmentNumber: number
  amount: number
  dueDate: Date
  status: string
}

export function WhatsAppReminderButton({ clientName, clientPhone, installmentNumber, amount, dueDate, status }: ReminderProps) {
  // Solo mostrar el botón si la cuota está PENDING o LATE
  if (status === "PAID") return null

  const handleSendReminder = () => {
    const today = new Date()
    const due = new Date(dueDate)
    
    // Calcular días de mora (ignorando las horas, solo la fecha)
    const diffTime = today.getTime() - due.getTime()
    const daysLate = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    const isOverdue = daysLate > 0

    let message = ""
    
    if (isOverdue) {
      const moraAmount = daysLate * 2000
      const totalAmount = amount + (moraAmount * 100) // amount is in cents
      
      const formattedAmount = (amount / 100).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })
      const formattedMora = (moraAmount).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })
      const formattedTotal = (totalAmount / 100).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })
      const formattedDate = due.toLocaleDateString("es-CO")

      message = `Hola ${clientName}, te escribimos de JyJ Inversiones. Queremos recordarte que tu cuota #${installmentNumber} por valor de ${formattedAmount} venció el día ${formattedDate}. Al día de hoy presentas ${daysLate} día(s) de mora (Cargo por mora: ${formattedMora}). El nuevo total a pagar es de ${formattedTotal}. Por favor, contáctanos lo más pronto posible para regularizar tu pago. ¡Gracias!`
    } else {
      const formattedAmount = (amount / 100).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })
      const formattedDate = due.toLocaleDateString("es-CO")
      
      message = `Hola ${clientName}, te escribimos de JyJ Inversiones. Queremos recordarte amablemente que tu cuota #${installmentNumber} por valor de ${formattedAmount} vencerá el día ${formattedDate}. Quedamos atentos a tu pago. ¡Que tengas un excelente día!`
    }

    // Limpiar número de teléfono (quitar espacios, guiones, etc)
    const cleanPhone = clientPhone.replace(/\D/g, "")
    // Asumir código de país de Colombia (+57) si el número tiene 10 dígitos y no empieza por 57
    const finalPhone = cleanPhone.length === 10 ? `57${cleanPhone}` : cleanPhone

    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/${finalPhone}?text=${encodedMessage}`

    window.open(whatsappUrl, "_blank")
  }

  return (
    <button
      onClick={handleSendReminder}
      className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 rounded-lg transition-colors flex items-center gap-2 ml-1"
      title="Enviar Recordatorio por WhatsApp"
    >
      <MessageCircle className="h-4 w-4" />
    </button>
  )
}
