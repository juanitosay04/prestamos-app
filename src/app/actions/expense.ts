"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

import { getCurrentUserSummary } from "@/lib/session"
import { notifyExpenseCreated, notifyExpenseDeleted } from "@/lib/telegram"

export async function createExpense(formData: FormData) {
  try {
    const description = formData.get("description")?.toString()
    const amountStr = formData.get("amount")?.toString()
    const category = formData.get("category")?.toString() || "OTHER"

    if (!description || !amountStr) {
      return { error: "Descripción y monto son obligatorios." }
    }

    const amount = Math.round(parseFloat(amountStr) * 100) // Convertir a centavos
    if (isNaN(amount) || amount <= 0) {
      return { error: "Monto inválido." }
    }

    const expense = await prisma.expense.create({
      data: {
        description,
        amount,
        category,
      }
    })

    const operator = await getCurrentUserSummary()
    notifyExpenseCreated({
      expenseId: expense.id,
      description,
      amount,
      category,
      performedBy: operator.label
    }).catch(err => console.error("Telegram notifyExpenseCreated error:", err))

    revalidatePath("/", "layout")
    return { success: true, expense }
  } catch (error: any) {
    console.error("Create expense error:", error)
    return { error: "Ocurrió un error al registrar el gasto." }
  }
}

export async function deleteExpense(id: string) {
  try {
    const expense = await prisma.expense.findUnique({ where: { id } })
    await prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date() }
    })

    if (expense) {
      const operator = await getCurrentUserSummary()
      notifyExpenseDeleted({
        expenseId: expense.id,
        description: expense.description,
        amount: expense.amount,
        performedBy: operator.label
      }).catch(err => console.error("Telegram notifyExpenseDeleted error:", err))
    }

    revalidatePath("/", "layout")
    return { success: true }
  } catch (error: any) {
    return { error: "No se pudo eliminar el gasto." }
  }
}
