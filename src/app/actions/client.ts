"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/session"

export async function getClients() {
  try {
    return await prisma.client.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" }
    })
  } catch (error) {
    console.error("Error fetching clients:", error)
    return []
  }
}

export async function createClient(formData: FormData) {
  try {
    const firstName = formData.get("firstName") as string
    const lastName = formData.get("lastName") as string
    const idDocument = formData.get("idDocument") as string
    const phone = formData.get("phone") as string
    const email = formData.get("email") as string
    const address = formData.get("address") as string

    if (!firstName || !lastName || !idDocument || !phone) {
      return { error: "Faltan campos obligatorios" }
    }

    const client = await prisma.client.create({
      data: {
        firstName,
        lastName,
        idDocument,
        phone,
        email: email || null,
        address: address || null,
        status: "ACTIVE"
      }
    })
    
    // Notificación / Auditoría
    const session = await getSession()
    if (session) {
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: "CREATE_CLIENT",
          entityType: "Client",
          entityId: client.id,
          details: JSON.stringify({ name: `${firstName} ${lastName}`, role: session.role })
        }
      })
    }
    
    revalidatePath("/clientes")
    return { success: true, client }
  } catch (error: any) {
    console.error("Error creating client:", error)
    if (error.code === 'P2002') {
      return { error: "Ya existe un cliente con este documento de identidad" }
    }
    return { error: "Error al crear el cliente" }
  }
}

export async function deleteClient(id: string) {
  try {
    // Soft delete
    await prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() }
    })
    revalidatePath("/clientes")
    return { success: true }
  } catch (error) {
    return { error: "Error al eliminar el cliente" }
  }
}

export async function toggleClientBlacklist(id: string, isBlacklisted: boolean) {
  try {
    const session = await getSession()
    if (!session || session.role !== "ADMIN") {
      return { error: "No autorizado" }
    }

    await prisma.client.update({
      where: { id },
      data: { isBlacklisted }
    })
    
    revalidatePath("/clientes")
    return { success: true }
  } catch (error) {
    return { error: "Error al actualizar el estado de la lista negra" }
  }
}
