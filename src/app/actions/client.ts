"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession, getCurrentUserSummary } from "@/lib/session"
import { notifyClientCreated, notifyClientDeleted } from "@/lib/telegram"

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
    const city = formData.get("city") as string
    const neighborhood = formData.get("neighborhood") as string
    const addressOptions = formData.get("addressOptions") as string

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
        city: city || null,
        neighborhood: neighborhood || null,
        address: address || null,
        addressOptions: addressOptions || null,
        status: "ACTIVE"
      }
    })
    
    // Notificación / Auditoría
    const session = await getSession()
    const operator = await getCurrentUserSummary()
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
    
    notifyClientCreated({
      clientId: client.id,
      clientName: `${firstName} ${lastName}`,
      idDocument,
      phone,
      performedBy: operator.label
    }).catch(err => console.error("Telegram notifyClientCreated error:", err))
    
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
    const client = await prisma.client.findUnique({ where: { id } })
    // Soft delete
    await prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() }
    })

    if (client) {
      const operator = await getCurrentUserSummary()
      notifyClientDeleted({
        clientId: client.id,
        clientName: `${client.firstName} ${client.lastName}`,
        idDocument: client.idDocument,
        performedBy: operator.label
      }).catch(err => console.error("Telegram notifyClientDeleted error:", err))
    }

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

export async function updateClient(id: string, formData: FormData) {
  try {
    const firstName = formData.get("firstName") as string
    const lastName = formData.get("lastName") as string
    const idDocument = formData.get("idDocument") as string
    const phone = formData.get("phone") as string
    const email = formData.get("email") as string
    const address = formData.get("address") as string
    const city = formData.get("city") as string
    const neighborhood = formData.get("neighborhood") as string
    const addressOptions = formData.get("addressOptions") as string

    if (!firstName || !lastName || !idDocument || !phone) {
      return { error: "Faltan campos obligatorios" }
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        firstName,
        lastName,
        idDocument,
        phone,
        email: email || null,
        city: city || null,
        neighborhood: neighborhood || null,
        address: address || null,
        addressOptions: addressOptions || null,
      }
    })
    
    // Notificación / Auditoría
    const session = await getSession()
    if (session) {
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: "UPDATE_CLIENT",
          entityType: "Client",
          entityId: client.id,
          details: JSON.stringify({ name: `${firstName} ${lastName}`, role: session.role })
        }
      })
    }
    
    revalidatePath("/clientes")
    revalidatePath(`/clientes/${id}`)
    return { success: true, client }
  } catch (error: any) {
    console.error("Error updating client:", error)
    if (error.code === 'P2002') {
      return { error: "Ya existe un cliente con este documento de identidad" }
    }
    return { error: "Error al actualizar el cliente" }
  }
}
