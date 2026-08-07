"use client"

import { Printer } from "lucide-react"

export function PrintReportButton() {
  return (
    <button
      onClick={() => window.print()}
      className="h-10 px-4 bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.08] hover:border-white/20 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-2 shadow-sm active:scale-95"
    >
      <Printer className="h-3.5 w-3.5 text-indigo-400" />
      <span>Imprimir Balance</span>
    </button>
  )
}
