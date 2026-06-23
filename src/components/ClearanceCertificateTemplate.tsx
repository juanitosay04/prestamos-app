"use client"

import React, { forwardRef } from "react"

export type ClearanceData = {
  loanId: string
  clientName: string
  idDocument: string
  principalAmount: number
  totalPaid: number
  clearanceDate: Date
}

export const ClearanceCertificateTemplate = forwardRef<HTMLDivElement, { data: ClearanceData }>(({ data }, ref) => {
  return (
    <div className="hidden">
      <div ref={ref} className="p-12 max-w-[800px] mx-auto bg-white text-black font-sans">
        
        {/* Encabezado */}
        <div className="text-center mb-12 border-b-2 border-black pb-6">
          <h1 className="text-3xl font-bold uppercase tracking-widest mb-2">JyJ Préstamos</h1>
          <p className="text-sm font-semibold uppercase tracking-widest text-gray-600">Inversiones & Créditos</p>
        </div>

        {/* Título Principal */}
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold underline mb-4">CERTIFICADO DE PAZ Y SALVO</h2>
          <p className="text-sm text-gray-500">Ref: {data.loanId}</p>
        </div>

        {/* Cuerpo del Certificado */}
        <div className="space-y-6 text-justify text-lg leading-relaxed mb-16">
          <p>
            Por medio de la presente, <strong>JyJ Préstamos</strong> certifica que el/la señor(a) 
            <strong> {data.clientName}</strong>, identificado(a) con documento de identidad número 
            <strong> {data.idDocument}</strong>, se encuentra a la fecha en estado de <strong>PAZ Y SALVO</strong> por 
            todo concepto de capital, intereses y gastos asociados al préstamo referenciado.
          </p>
          
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 my-8">
            <h3 className="font-bold text-gray-700 mb-4 uppercase text-sm border-b pb-2">Detalles de la Obligación Cancelada:</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="font-semibold">Capital Original:</span> ${(data.principalAmount / 100).toLocaleString("es-CO")}</div>
              <div><span className="font-semibold">Total Pagado:</span> ${(data.totalPaid / 100).toLocaleString("es-CO")}</div>
              <div><span className="font-semibold">Fecha de Emisión:</span> {new Date(data.clearanceDate).toLocaleDateString("es-CO")}</div>
              <div><span className="font-semibold">Estado:</span> CANCELADO TOTALMENTE</div>
            </div>
          </div>

          <p>
            Esta certificación se expide a solicitud del interesado(a), el día <strong>
              {new Date(data.clearanceDate).toLocaleDateString("es-CO", { year: 'numeric', month: 'long', day: 'numeric' })}
            </strong>.
          </p>
        </div>

        {/* Firmas */}
        <div className="mt-24 pt-8 flex justify-center">
          <div className="text-center relative">
            {/* Imagen de la Firma */}
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-24 pointer-events-none opacity-90 mix-blend-multiply">
              {/* Usamos un <img> nativo en lugar de next/image para mayor compatibilidad con react-to-print */}
              <img 
                src="/jyj-signature.png" 
                alt="Firma de Gerencia" 
                className="w-full h-full object-contain"
              />
            </div>
            
            <div className="border-t-2 border-black w-72 mx-auto mb-2 mt-4 relative z-10"></div>
            <p className="font-bold text-lg">Gerencia General</p>
            <p className="text-sm text-gray-600 font-semibold tracking-wider uppercase">JyJ Préstamos e Inversiones</p>
          </div>
        </div>

      </div>
    </div>
  )
})
ClearanceCertificateTemplate.displayName = "ClearanceCertificateTemplate"
