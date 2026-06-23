"use client"

import { useState } from "react"
import { ShieldAlert, ShieldCheck } from "lucide-react"
import { toggleClientBlacklist } from "@/app/actions/client"

export function BlacklistToggleButton({ clientId, isBlacklisted }: { clientId: string, isBlacklisted: boolean }) {
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    if (!confirm(`¿Estás seguro de que deseas ${isBlacklisted ? 'quitar' : 'añadir'} a este cliente de la lista negra?`)) {
      return
    }
    
    setLoading(true)
    await toggleClientBlacklist(clientId, !isBlacklisted)
    setLoading(false)
  }

  return (
    <button 
      onClick={handleToggle}
      disabled={loading}
      className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
        isBlacklisted 
          ? "text-destructive hover:text-white hover:bg-destructive/80 bg-destructive/10" 
          : "text-muted-foreground hover:text-destructive hover:bg-white/10"
      }`}
      title={isBlacklisted ? "Quitar de Lista Negra" : "Añadir a Lista Negra"}
    >
      {isBlacklisted ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
    </button>
  )
}
