"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Calendar } from "lucide-react"

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]

export function MonthFilter({ basePath = "/prestamos" }: { basePath?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const currentMonth = searchParams.get("month") || ""
  const currentYear = searchParams.get("year") || ""
  
  const handleFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val === "ALL") {
      router.push(basePath)
      return
    }
    
    const [month, year] = val.split("-")
    router.push(`${basePath}?month=${month}&year=${year}`)
  }
  
  const now = new Date()
  const thisYear = now.getFullYear()

  // Generar opciones para el año actual y el anterior
  const options = []
  for (let y = thisYear; y >= thisYear - 1; y--) {
    for (let m = 12; m >= 1; m--) {
      // No mostrar meses futuros del año actual
      if (y === thisYear && m > now.getMonth() + 1) continue
      
      options.push({
        value: `${m}-${y}`,
        label: `${MONTHS[m - 1]} ${y}`
      })
    }
  }

  const currentValue = currentMonth && currentYear ? `${currentMonth}-${currentYear}` : "ALL"

  return (
    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <select 
        value={currentValue}
        onChange={handleFilter}
        className="bg-transparent text-sm text-white focus:outline-none focus:ring-0 cursor-pointer appearance-none pr-4"
      >
        <option value="ALL" className="bg-background text-white">Todos los meses</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-background text-white">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
