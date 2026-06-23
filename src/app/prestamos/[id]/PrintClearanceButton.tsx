"use client"

import { useRef } from "react"
import { Printer } from "lucide-react"
import { useReactToPrint } from "react-to-print"
import { ClearanceCertificateTemplate, ClearanceData } from "@/components/ClearanceCertificateTemplate"

export function PrintClearanceButton({ data }: { data: ClearanceData }) {
  const printRef = useRef<HTMLDivElement>(null)
  
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Paz_y_Salvo_${data.loanId}`
  })

  return (
    <>
      <button 
        onClick={() => handlePrint()}
        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-emerald-500/20"
      >
        <Printer className="h-5 w-5" />
        Imprimir Paz y Salvo
      </button>

      <ClearanceCertificateTemplate ref={printRef} data={data} />
    </>
  )
}
