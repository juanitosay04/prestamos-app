"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

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

    revalidatePath("/", "layout")
    return { success: true, expense }
  } catch (error: any) {
    console.error("Create expense error:", error)
    return { error: "Ocurrió un error al registrar el gasto." }
  }
}

export async function deleteExpense(id: string) {
  try {
    await prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date() }
    })
    revalidatePath("/", "layout")
    return { success: true }
  } catch (error: any) {
    return { error: "No se pudo eliminar el gasto." }
  }
}
