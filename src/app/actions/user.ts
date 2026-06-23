"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getUsers() {
  try {
    return await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      }
    })
  } catch (error) {
    console.error("Error fetching users:", error)
    return []
  }
}

export async function createUser(formData: FormData) {
  try {
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const role = formData.get("role") as string || "SECRETARY"

    if (!name || !email || !password) {
      return { error: "Faltan campos obligatorios" }
    }

    // Hash the password properly
    const bcrypt = require('bcryptjs')
    const passwordHash = await bcrypt.hash(password, 10)
    
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role
      }
    })
    
    revalidatePath("/configuracion")
    return { success: true }
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { error: "Ya existe un usuario con este correo electrónico" }
    }
    return { error: "Error al crear el usuario" }
  }
}

export async function updateUser(id: string, formData: FormData) {
  try {
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const role = formData.get("role") as string
    const password = formData.get("password") as string

    if (!name || !email || !role) {
      return { error: "Faltan campos obligatorios" }
    }

    const dataToUpdate: any = { name, email, role }

    if (password && password.trim() !== "") {
      const bcrypt = require('bcryptjs')
      dataToUpdate.passwordHash = await bcrypt.hash(password, 10)
    }

    await prisma.user.update({
      where: { id },
      data: dataToUpdate
    })

    revalidatePath("/configuracion")
    return { success: true }
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { error: "Ya existe otro usuario con este correo electrónico" }
    }
    return { error: "Error al actualizar el usuario" }
  }
}
