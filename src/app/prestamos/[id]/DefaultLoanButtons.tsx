"use client"

import { useState } from "react"
import { AlertOctagon, RotateCcw } from "lucide-react"
import { markLoanAsDefaulted, reviveLoan } from "@/app/actions/loan"

export function MarkDefaultedButton({ loanId }: { loanId: string }) {
  const [loading, setLoading] = useState(false)

  const handleDefault = async () => {
    if (!window.confirm("¿Estás seguro de marcar este préstamo como PÉRDIDA? Esto congelará la mora y detendrá los pagos. Solo el capital pendiente se sumará a tus pérdidas históricas.")) return
    
    setLoading(true)
    await markLoanAsDefaulted(loanId)
    setLoading(false)
  }

  return (
    <button 
      onClick={handleDefault}
      disabled={loading}
      className="p-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
      title="Marcar como Pérdida"
    >
      <AlertOctagon className="h-4 w-4" />
      <span className="hidden sm:inline">{loading ? "Procesando..." : "Pasar a Pérdida"}</span>
    </button>
  )
}

export function ReviveLoanButton({ loanId }: { loanId: string }) {
  const [loading, setLoading] = useState(false)

  const handleRevive = async () => {
    if (!window.confirm("¿Deseas revivir este préstamo? Volverá a estar activo y la mora continuará calculándose hasta el día de hoy.")) return
    
    setLoading(true)
    await reviveLoan(loanId)
    setLoading(false)
  }

  return (
    <button 
      onClick={handleRevive}
      disabled={loading}
      className="p-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
      title="Revivir Préstamo"
    >
      <RotateCcw className="h-4 w-4" />
      <span className="hidden sm:inline">{loading ? "Reviviendo..." : "Revivir Préstamo"}</span>
    </button>
  )
}
