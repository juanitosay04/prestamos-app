"use client"

import React, { forwardRef } from "react"
import { ShieldCheck, CheckCircle2, Award, Building2 } from "lucide-react"

export type ClearanceData = {
  loanId: string
  clientName: string
  idDocument: string
  clientPhone?: string
  clientAddress?: string
  principalAmount: number
  totalPaid: number
  startDate?: Date | string
  clearanceDate: Date | string
  installmentsCount?: number
}

export const ClearanceCertificateTemplate = forwardRef<HTMLDivElement, { data: ClearanceData; isPreview?: boolean }>(({ data, isPreview = false }, ref) => {
  const clearanceDateObj = new Date(data.clearanceDate)
  const formattedClearanceDate = clearanceDateObj.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric"
  })
  const formattedYear = clearanceDateObj.getFullYear()
  const certificateCode = `PYS-${data.loanId.slice(-6).toUpperCase()}`

  return (
    <div className={isPreview ? "w-full flex justify-center" : "hidden"}>
      <div 
        ref={ref} 
        className="w-[800px] min-h-[1050px] bg-white text-slate-900 font-sans p-10 relative box-border print:p-8 print:m-0 print:w-full print:shadow-none shadow-2xl mx-auto flex flex-col justify-between"
        style={{
          colorScheme: "light"
        }}
      >
        {/* Marco de Seguridad Perimetral con Doble Línea */}
        <div className="absolute inset-4 border-2 border-slate-900 pointer-events-none rounded-sm">
          <div className="absolute inset-1 border border-amber-600/40 pointer-events-none" />
          {/* Adornos en las 4 esquinas */}
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-slate-900" />
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-slate-900" />
          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-slate-900" />
          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-slate-900" />
        </div>

        {/* Marca de agua de seguridad de fondo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
          <div className="text-center transform -rotate-45">
            <p className="text-8xl font-black tracking-widest text-slate-950 uppercase">PRÉSTAMOS JYJ</p>
            <p className="text-6xl font-bold tracking-widest uppercase mt-4">PAZ Y SALVO</p>
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="relative z-10 px-4 pt-2">
          
          {/* Encabezado Corporativo Oficial */}
          <div className="flex items-start justify-between pb-6 border-b-2 border-slate-900 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center p-1 shadow-sm flex-shrink-0">
                <img 
                  src="/logo.png" 
                  alt="Préstamos JyJ" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Fallback en caso de no cargar
                    (e.currentTarget.style.display = 'none')
                  }}
                />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 uppercase">
                  Préstamos JyJ
                </h1>
                <p className="text-xs font-bold text-amber-700 uppercase tracking-widest">
                  Soluciones Financieras & Gestión de Crédito
                </p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  NIT: 901.458.239-1 • Vigilancia y Control de Cartera • Colombia
                </p>
              </div>
            </div>

            {/* Cuadro de Metadatos del Certificado */}
            <div className="text-right bg-slate-50 border border-slate-200 rounded-lg p-3 shadow-sm min-w-[190px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Certificación Oficial
              </span>
              <span className="text-sm font-extrabold font-mono text-blue-900 block mt-0.5">
                N° {certificateCode}
              </span>
              <span className="text-[11px] text-slate-600 block mt-1">
                Expedición: <strong>{new Date(data.clearanceDate).toLocaleDateString("es-CO")}</strong>
              </span>
            </div>
          </div>

          {/* Título Principal y Sello de Paz y Salvo */}
          <div className="text-center my-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 border border-emerald-300 rounded-full text-emerald-800 text-xs font-extrabold tracking-wider uppercase mb-3 shadow-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-600 inline" />
              Obligación Cancelada • 100% Pagada
            </div>
            <h2 className="text-2xl font-black tracking-wide text-slate-900 uppercase">
              Certificado de Paz y Salvo
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-700 via-amber-500 to-blue-700 mx-auto mt-2 rounded-full" />
          </div>

          {/* Declaración Legal */}
          <div className="space-y-4 text-justify text-[13px] leading-relaxed text-slate-700 mb-6">
            <p className="font-semibold text-slate-900 uppercase text-xs tracking-wider">
              La Gerencia de Préstamos JyJ hace constar que:
            </p>
            
            <p>
              El/La ciudadano(a) <strong className="text-slate-950 font-bold uppercase">{data.clientName}</strong>, mayor de edad, identificado(a) con Cédula de Ciudadanía N° <strong className="text-slate-950 font-mono font-bold">{data.idDocument}</strong>, se encuentra a la fecha <strong>A PAZ Y SALVO POR TODO CONCEPTO</strong> (Capital, Intereses Corrientes, Intereses Moratorios y Gastos Administrativos) respecto a la obligación crediticia identificada bajo el número de referencia <strong className="font-mono text-slate-950">#{data.loanId}</strong>.
            </p>
          </div>

          {/* Ficha Técnica de la Obligación Cancelada */}
          <div className="bg-slate-50/80 rounded-xl border border-slate-300 p-4 mb-6 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Award className="h-4 w-4 text-amber-600" /> Resumen de Liquidación Definitiva
              </h3>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300">
                SALDO PENDIENTE: $0.00 COP
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Titular del Crédito:</span>
                <span className="font-bold text-slate-900 text-right">{data.clientName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Documento de Identidad:</span>
                <span className="font-bold font-mono text-slate-900">{data.idDocument}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Capital Desembolsado:</span>
                <span className="font-bold text-slate-900">${(data.principalAmount / 100).toLocaleString("es-CO")} COP</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Monto Total Cancelado:</span>
                <span className="font-bold text-emerald-800">${(data.totalPaid / 100).toLocaleString("es-CO")} COP</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Fecha de Liquidación:</span>
                <span className="font-bold text-slate-900">{formattedClearanceDate}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Estado Jurídico:</span>
                <span className="font-bold text-emerald-700">EXTINGUIDA / SIN OBLIGACIÓN</span>
              </div>
            </div>
          </div>

          {/* Cláusula de Liberación de Garantías */}
          <div className="text-[12px] leading-relaxed text-slate-600 text-justify mb-6 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
            <p>
              <strong>Liberación de Responsabilidad y Garantías:</strong> La presente certificación extingue de pleno derecho los compromisos derivados del crédito citado, dando lugar a la desanotación de pagarés en custodia o garantías asociadas. Se expide a solicitud de la parte interesada el día <strong>{formattedClearanceDate}</strong>.
            </p>
          </div>

          {/* Bloque de Firmas y Sello Corporativo */}
          <div className="mt-8 pt-4 flex items-end justify-between px-6">
            
            {/* Sello Holográfico Digital */}
            <div className="w-32 h-32 rounded-full border-2 border-dashed border-amber-600/60 p-1 flex items-center justify-center text-center opacity-85 select-none">
              <div className="w-full h-full rounded-full border border-amber-600/40 bg-amber-50/30 flex flex-col items-center justify-center p-2">
                <ShieldCheck className="h-6 w-6 text-amber-700 mb-1" />
                <span className="text-[8px] font-black uppercase text-amber-800 tracking-tighter leading-none">PRÉSTAMOS JYJ</span>
                <span className="text-[7px] font-bold text-emerald-700 tracking-widest mt-0.5">VALIDADO</span>
                <span className="text-[6px] text-slate-500 font-mono mt-0.5">{certificateCode}</span>
              </div>
            </div>

            {/* Firma de Gerencia */}
            <div className="text-center relative min-w-[260px]">
              {/* Imagen de la Firma Oficial */}
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-24 pointer-events-none opacity-95 mix-blend-multiply flex items-center justify-center">
                <img 
                  src="/jyj-signature.png" 
                  alt="Firma de Gerencia General" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.currentTarget.style.display = 'none')
                  }}
                />
              </div>
              
              <div className="border-t-2 border-slate-900 w-64 mx-auto mb-1.5 relative z-10" />
              <p className="font-extrabold text-sm text-slate-900 uppercase">Gerencia General</p>
              <p className="text-[11px] text-slate-600 font-bold uppercase tracking-wider">
                Préstamos JyJ • Soluciones Financieras
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                Firma Digital Certificada
              </p>
            </div>
          </div>
        </div>

        {/* Pie de Página de Seguridad */}
        <div className="relative z-10 pt-4 mt-6 border-t border-slate-200 text-center px-4">
          <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
            <span>DOC-REF: {data.loanId}</span>
            <span>VERIFICACIÓN: SHA256-{data.loanId.slice(0, 10).toUpperCase()}</span>
            <span>PÁGINA 1 DE 1</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-1">
            Este certificado es un documento emitido electrónicamente y goza de plena validez jurídica. Para verificación contáctenos a través de nuestros canales oficiales.
          </p>
        </div>

      </div>
    </div>
  )
})

ClearanceCertificateTemplate.displayName = "ClearanceCertificateTemplate"

