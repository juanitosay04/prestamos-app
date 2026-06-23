import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function GET() {
  try {
    // Obtener Préstamos Activos
    const loans = await prisma.loan.findMany({
      include: {
        client: true,
        installments: true
      }
    })

    // Obtener Gastos
    const expenses = await prisma.expense.findMany({
      where: { deletedAt: null }
    })

    // Formatear datos de Préstamos
    const loanData = loans.map(loan => {
      const totalPaid = loan.installments.filter(i => i.status === "PAID").reduce((sum, curr) => sum + curr.expectedAmount, 0)
      const totalExpected = loan.installments.reduce((sum, curr) => sum + curr.expectedAmount, 0)

      return {
        'ID Préstamo': loan.id,
        'Cliente': `${loan.client.firstName} ${loan.client.lastName}`,
        'Documento': loan.client.idDocument,
        'Fecha Inicio': new Date(loan.startDate).toLocaleDateString(),
        'Estado': loan.status,
        'Capital Prestado': loan.principalAmount / 100,
        'Total a Pagar (Con Interés)': totalExpected / 100,
        'Total Pagado': totalPaid / 100,
        'Saldo Pendiente': (totalExpected - totalPaid) / 100,
        'Número de Cuotas': loan.numberOfInstallments,
      }
    })

    // Formatear datos de Gastos
    const expenseData = expenses.map(exp => ({
      'ID Gasto': exp.id,
      'Fecha': new Date(exp.date).toLocaleDateString(),
      'Descripción': exp.description,
      'Categoría': exp.category,
      'Monto': exp.amount / 100,
    }))

    // Crear libro de trabajo
    const workbook = XLSX.utils.book_new()

    // Hoja 1: Préstamos
    const worksheetLoans = XLSX.utils.json_to_sheet(loanData)
    XLSX.utils.book_append_sheet(workbook, worksheetLoans, 'Préstamos')

    // Hoja 2: Gastos
    const worksheetExpenses = XLSX.utils.json_to_sheet(expenseData)
    XLSX.utils.book_append_sheet(workbook, worksheetExpenses, 'Gastos')

    // Escribir buffer
    const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buf, {
      headers: {
        'Content-Disposition': 'attachment; filename="Reporte_Contable_JyJ.xlsx"',
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
    })
  } catch (error: any) {
    console.error('Error exportando excel:', error)
    return NextResponse.json({ error: 'Error interno del servidor al exportar datos.' }, { status: 500 })
  }
}
