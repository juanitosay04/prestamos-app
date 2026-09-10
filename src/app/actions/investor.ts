"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession, getCurrentUserSummary } from "@/lib/session"
import { notifyInvestorCreated, notifyInvestorDeleted } from "@/lib/telegram"

export async function getInvestors() {
  try {
    return await prisma.investor.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        investments: true
      }
    })
  } catch (error) {
    console.error("Error fetching investors:", error)
    return []
  }
}

export async function getInvestorById(id: string) {
  try {
    return await prisma.investor.findUnique({
      where: { id },
      include: {
        investments: {
          include: {
            loan: {
              include: {
                client: true
              }
            }
          }
        }
      }
    })
  } catch (error) {
    console.error("Error fetching investor details:", error)
    return null
  }
}

export async function createInvestor(formData: FormData) {
  try {
    const name = formData.get("name") as string
    const phone = formData.get("phone") as string
    const email = formData.get("email") as string
    const transferKey = formData.get("transferKey") as string

    if (!name) {
      return { error: "El nombre es obligatorio" }
    }

    const investor = await prisma.investor.create({
      data: {
        name,
        phone: phone || null,
        email: email || null,
        transferKey: transferKey || null,
      }
    })
    
    // Notificación / Auditoría
    const session = await getSession()
    const operator = await getCurrentUserSummary()
    if (session) {
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: "CREATE_INVESTOR",
          entityType: "Investor",
          entityId: investor.id,
          details: JSON.stringify({ name, role: session.role })
        }
      })
    }
    
    notifyInvestorCreated({
      investorId: investor.id,
      investorName: name,
      phone: phone || undefined,
      email: email || undefined,
      performedBy: operator.label
    }).catch(err => console.error("Telegram notifyInvestorCreated error:", err))

    revalidatePath("/inversionistas")
    return { success: true, investor }
  } catch (error: any) {
    console.error("Error creating investor:", error)
    return { error: "Error al crear el inversionista" }
  }
}

export async function updateInvestor(id: string, formData: FormData) {
  try {
    const name = formData.get("name") as string
    const phone = formData.get("phone") as string
    const email = formData.get("email") as string
    const transferKey = formData.get("transferKey") as string

    if (!name) {
      return { error: "El nombre es obligatorio" }
    }

    const investor = await prisma.investor.update({
      where: { id },
      data: {
        name,
        phone: phone || null,
        email: email || null,
        transferKey: transferKey || null,
      }
    })
    
    revalidatePath("/inversionistas")
    revalidatePath(`/inversionistas/${id}`)
    return { success: true, investor }
  } catch (error: any) {
    console.error("Error updating investor:", error)
    return { error: "Error al actualizar el inversionista" }
  }
}


export async function deleteInvestor(id: string) {
  try {
    // Verificar si el inversionista tiene préstamos activos
    const investor = await prisma.investor.findUnique({
      where: { id },
      include: {
        investments: {
          include: {
            loan: true
          }
        }
      }
    })

    if (!investor) {
      return { error: "Inversionista no encontrado" }
    }

    const hasActiveLoans = investor.investments.some(
      inv => inv.loan.status === "ACTIVE" || inv.loan.status === "OVERDUE"
    )

    if (hasActiveLoans) {
      return { error: "No se puede eliminar porque tiene préstamos activos en curso." }
    }

    await prisma.investor.update({
      where: { id },
      data: { deletedAt: new Date() }
    })
    
    const operator = await getCurrentUserSummary()
    notifyInvestorDeleted({
      investorId: investor.id,
      investorName: investor.name,
      performedBy: operator.label
    }).catch(err => console.error("Telegram notifyInvestorDeleted error:", err))

    revalidatePath("/inversionistas")
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting investor:", error)
    return { error: "Error al eliminar el inversionista" }
  }
}
