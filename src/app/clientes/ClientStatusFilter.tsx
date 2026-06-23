"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Filter } from "lucide-react"

export function ClientStatusFilter({ currentStatus }: { currentStatus?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    
    if (value && value !== "Todos") {
      params.set("status", value)
    } else {
      params.delete("status")
    }

    router.push(`/clientes?${params.toString()}`)
  }

  return (
    <div className="relative">
      <select 
        value={currentStatus || "Todos"} 
        onChange={handleChange}
        className="appearance-none bg-white/5 border border-white/10 text-white rounded-lg pl-10 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
      >
        <option value="Todos" className="bg-slate-900">Todos los Clientes</option>
        <option value="Activos" className="bg-slate-900">Solo Activos</option>
        <option value="ListaNegra" className="bg-slate-900">Solo Lista Negra</option>
      </select>
      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
    </div>
  )
}
