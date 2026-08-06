"use client"

import React, { forwardRef } from "react"

export type ReceiptData = {
  loanId: string
  clientName: string
  idDocument: string
  installmentNumber: number
  totalInstallments?: number
  amountPaid: number
  paymentDate: Date
  moraPaid: number
  remainingBalance?: number
}

export const ReceiptTemplate = forwardRef<HTMLDivElement, { data: ReceiptData }>(({ data }, ref) => {
  const paymentDate = new Date(data.paymentDate)
  const baseInstallmentPaid = Math.max(0, data.amountPaid - data.moraPaid)

  return (
    <div className="hidden">
      <div ref={ref} className="p-8 max-w-[80mm] mx-auto bg-white text-black font-sans text-sm">
        <div className="text-center mb-6">
          <h1 className="text-xl font-black uppercase tracking-wider mb-1">JyJ Préstamos</h1>
          <p className="text-xs text-gray-600 font-medium">Inversiones & Soluciones Financieras</p>
          <div className="mt-3 border-b-2 border-black pb-2 border-dashed">
            <span className="text-xs font-bold uppercase bg-gray-100 px-2 py-0.5 rounded">Comprobante de Pago</span>
          </div>
        </div>

        <div className="space-y-2 mb-5 text-xs">
          <div className="flex justify-between">
            <span className="font-bold text-gray-700">Fecha y Hora:</span>
            <span>{paymentDate.toLocaleDateString("es-CO")} {paymentDate.toLocaleTimeString("es-CO", { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold text-gray-700">Cliente:</span>
            <span className="text-right font-semibold">{data.clientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold text-gray-700">Cédula / DNI:</span>
            <span className="font-mono">{data.idDocument}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold text-gray-700">Ref. Préstamo:</span>
            <span className="font-mono font-bold">#{data.loanId.slice(-6).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold text-gray-700">Cuota Aplicada:</span>
            <span className="font-bold text-gray-900">
              #{data.installmentNumber} {data.totalInstallments ? `de ${data.totalInstallments}` : ''}
            </span>
          </div>
        </div>

        <div className="border-t border-black border-dashed pt-3 mb-5 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-700">Abono a Cuota</span>
            <span className="font-semibold">${(baseInstallmentPaid / 100).toLocaleString("es-CO", { minimumFractionDigits: 0 })}</span>
          </div>
          {data.moraPaid > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Recargo por Mora</span>
              <span className="font-semibold">+ ${(data.moraPaid / 100).toLocaleString("es-CO", { minimumFractionDigits: 0 })}</span>
            </div>
          )}
          <div className="flex justify-between font-black text-base mt-2 border-t-2 border-black pt-2">
            <span>TOTAL RECIBIDO</span>
            <span>${(data.amountPaid / 100).toLocaleString("es-CO", { minimumFractionDigits: 0 })}</span>
          </div>
          {data.remainingBalance !== undefined && (
            <div className="flex justify-between text-[11px] text-gray-600 pt-1 border-t border-gray-200">
              <span>Saldo Pendiente Estimado:</span>
              <span className="font-bold text-gray-800">${(data.remainingBalance / 100).toLocaleString("es-CO", { minimumFractionDigits: 0 })}</span>
            </div>
          )}
        </div>

        <div className="text-center text-[11px] mt-6 pt-3 border-t border-black border-dashed text-gray-600">
          <p className="font-bold text-black mb-1">¡Gracias por su puntualidad!</p>
          <p>Conserve este comprobante como respaldo oficial de su pago.</p>
        </div>
      </div>
    </div>
  )
})
ReceiptTemplate.displayName = "ReceiptTemplate"
