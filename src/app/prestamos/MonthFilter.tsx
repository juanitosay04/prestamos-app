"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Calendar, ChevronDown } from "lucide-react"

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

  const options = []
  for (let y = thisYear; y >= thisYear - 1; y--) {
    for (let m = 12; m >= 1; m--) {
      if (y === thisYear && m > now.getMonth() + 1) continue
      
      options.push({
        value: `${m}-${y}`,
        label: `${MONTHS[m - 1]} ${y}`
      })
    }
  }

  const currentValue = currentMonth && currentYear ? `${currentMonth}-${currentYear}` : "ALL"

  return (
    <div className="relative inline-flex items-center">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/80 flex items-center">
        <Calendar className="h-3.5 w-3.5" />
      </div>
      
      <select 
        value={currentValue}
        onChange={handleFilter}
        className="h-10 appearance-none bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] hover:border-white/20 text-white rounded-xl pl-9 pr-9 text-xs font-semibold focus:outline-none focus:border-blue-500 transition-all cursor-pointer shadow-sm"
      >
        <option value="ALL" className="bg-[#0F1523] text-white py-1">Todos los períodos</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-[#0F1523] text-white py-1">
            {opt.label}
          </option>
        ))}
      </select>

      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/60">
        <ChevronDown className="h-3.5 w-3.5" />
      </div>
    </div>
  )
}
