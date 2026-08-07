"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Filter, ChevronDown } from "lucide-react"

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
    <div className="relative inline-flex items-center">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/80 flex items-center">
        <Filter className="h-3.5 w-3.5" />
      </div>
      
      <select 
        value={currentStatus || "Todos"} 
        onChange={handleChange}
        className="h-10 appearance-none bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] hover:border-white/20 text-white rounded-xl pl-9 pr-9 text-xs font-semibold focus:outline-none focus:border-blue-500 transition-all cursor-pointer shadow-sm"
      >
        {statuses.map(s => (
          <option key={s} value={s} className="bg-[#0F1523] text-white py-1">{s}</option>
        ))}
      </select>
      
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/60">
        <ChevronDown className="h-3.5 w-3.5" />
      </div>
    </div>
  )
}
