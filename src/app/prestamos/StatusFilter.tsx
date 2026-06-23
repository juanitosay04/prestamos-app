"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Filter } from "lucide-react"

export function StatusFilter({ currentStatus }: { currentStatus?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const statuses = [
    "Todos",
    "Al día",
    "Próximo a pagar",
    "Día de pago",
    "En mora",
    "Mora excesiva",
    "Finalizado",
    "Refinanciado",
    "Cancelado por pérdida"
  ]

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    
    if (value && value !== "Todos") {
      params.set("status", value)
    } else {
      params.delete("status")
    }

    router.push(`/prestamos?${params.toString()}`)
  }

  return (
    <div className="relative">
      <select 
        value={currentStatus || "Todos"} 
        onChange={handleChange}
        className="appearance-none bg-white/5 border border-white/10 text-white rounded-lg pl-10 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
      >
        {statuses.map(s => (
          <option key={s} value={s} className="bg-slate-900">{s}</option>
        ))}
      </select>
      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
    </div>
  )
}
