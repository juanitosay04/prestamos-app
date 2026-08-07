"use client"

import React, { forwardRef } from "react"

export type ReceiptData = {
  loanId: string
  clientName: string
  idDocument: string
  clientPhone?: string
  installmentNumber: number
  totalInstallments?: number
  amountPaid: number
  paymentDate: Date
  moraPaid: number
  principalPaid?: number
  interestPaid?: number
  remainingBalance?: number
}

export const ReceiptTemplate = forwardRef<HTMLDivElement, { data: ReceiptData }>(({ data }, ref) => {
  const paymentDate = new Date(data.paymentDate)
  const baseInstallmentPaid = Math.max(0, data.amountPaid - data.moraPaid)

  return (
    <div className="hidden">
      <div 
        ref={ref} 
        className="p-6 max-w-[80mm] mx-auto bg-white text-black font-mono text-[11px] leading-tight select-none"
      >
        {/* Encabezado */}
        <div className="text-center mb-4">
          <h1 className="text-base font-black uppercase tracking-wider mb-0.5">JYJ PRÉSTAMOS</h1>
          <p className="text-[10px] text-gray-700 font-semibold uppercase tracking-wide">Soluciones Financieras & Inversiones</p>
          <p className="text-[9px] text-gray-500 font-sans mt-0.5">NIT / ID: 901.458.239-1</p>
          <div className="my-2 border-y border-black py-1">
            <span className="text-[11px] font-black uppercase tracking-wider">COMPROBANTE OFICIAL DE PAGO</span>
          </div>
          <p className="text-[9px] text-gray-600 font-sans">
            Recibo No: <strong className="font-mono text-black">REC-{data.loanId.slice(-6).toUpperCase()}-{data.installmentNumber}</strong>
          </p>
        </div>

        {/* Datos del Cliente y Obligación */}
        <div className="space-y-1.5 mb-3 border-b border-black/80 pb-2">
          <div className="flex justify-between">
            <span className="text-gray-600">FECHA/HORA:</span>
            <span className="font-bold">{paymentDate.toLocaleDateString("es-CO")} {paymentDate.toLocaleTimeString("es-CO", { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">TITULAR:</span>
            <span className="font-black text-right max-w-[170px] truncate">{data.clientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">DOCUMENTO:</span>
            <span className="font-bold">{data.idDocument}</span>
          </div>
          {data.clientPhone && (
            <div className="flex justify-between">
              <span className="text-gray-600">TELÉFONO:</span>
              <span>{data.clientPhone}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">PRÉSTAMO REF:</span>
            <span className="font-bold font-mono">#{data.loanId.slice(-8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">CONCEPTO:</span>
            <span className="font-black text-black">
              CUOTA #{data.installmentNumber} {data.totalInstallments ? `DE ${data.totalInstallments}` : ''}
            </span>
          </div>
        </div>

        {/* Desglose del Pago */}
        <div className="space-y-1.5 mb-3">
          <div className="flex justify-between">
            <span className="text-gray-700">Abono Cuota:</span>
            <span className="font-bold">${(baseInstallmentPaid / 100).toLocaleString("es-CO", { minimumFractionDigits: 0 })}</span>
          </div>

          {data.principalPaid !== undefined && data.principalPaid > 0 && (
            <div className="flex justify-between text-[10px] text-gray-600 pl-2">
              <span>• Abono a Capital:</span>
              <span>${(data.principalPaid / 100).toLocaleString("es-CO", { minimumFractionDigits: 0 })}</span>
            </div>
          )}

          {data.interestPaid !== undefined && data.interestPaid > 0 && (
            <div className="flex justify-between text-[10px] text-gray-600 pl-2">
              <span>• Interés Corriente:</span>
              <span>${(data.interestPaid / 100).toLocaleString("es-CO", { minimumFractionDigits: 0 })}</span>
            </div>
          )}

          {data.moraPaid > 0 && (
            <div className="flex justify-between text-black font-bold">
              <span>Recargo por Mora:</span>
              <span>+ ${(data.moraPaid / 100).toLocaleString("es-CO", { minimumFractionDigits: 0 })}</span>
            </div>
          )}

          {/* Gran Total */}
          <div className="border-t-2 border-black pt-1.5 mt-2 flex justify-between text-xs font-black">
            <span>TOTAL RECIBIDO:</span>
            <span className="text-sm">${(data.amountPaid / 100).toLocaleString("es-CO", { minimumFractionDigits: 0 })}</span>
          </div>

          {data.remainingBalance !== undefined && (
            <div className="flex justify-between text-[10px] text-gray-700 pt-1.5 mt-1 border-t border-dashed border-gray-400">
              <span className="font-bold">Saldo Deuda Restante:</span>
              <span className="font-bold">${(data.remainingBalance / 100).toLocaleString("es-CO", { minimumFractionDigits: 0 })}</span>
            </div>
          )}
        </div>

        {/* Pie de Página y Seguridad */}
        <div className="text-center text-[9px] mt-4 pt-3 border-t border-black border-dashed text-gray-600 font-sans space-y-1">
          <p className="font-bold text-black uppercase text-[10px]">¡Gracias por su puntualidad!</p>
          <p>Conserve este soporte oficial como comprobante de pago.</p>
          <p className="text-[8px] text-gray-400 mt-1 font-mono">
            SISTEMA JYJ FINTECH • VAL: {data.loanId.slice(0, 4)}-{Date.now().toString().slice(-4)}
          </p>
        </div>
      </div>
    </div>
  )
})
ReceiptTemplate.displayName = "ReceiptTemplate"
