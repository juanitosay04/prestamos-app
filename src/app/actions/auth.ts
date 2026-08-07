"use server"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { encrypt } from "@/lib/session"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function login(formData: FormData) {
  const email = formData.get("email")?.toString().toLowerCase().trim()
  const password = formData.get("password")?.toString()

  if (!email || !password) {
    return { error: "Todos los campos son obligatorios" }
  }

  // Auto-seed if 0 users
  const userCount = await prisma.user.count()
  if (userCount === 0) {
    const defaultPassword = await bcrypt.hash("rojas860765", 10)
    await prisma.user.create({
      data: {
        name: "Juan Administrador",
        email: "juanestupinan901@gmail.com",
        passwordHash: defaultPassword,
        role: "ADMIN"
      }
    })
  }

  const user = await prisma.user.findUnique({
    where: { email }
  })

  if (!user) {
    return { error: "Credenciales incorrectas" }
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash)

  if (!isValidPassword) {
    return { error: "Credenciales incorrectas" }
  }

  const sessionData = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  }

  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  const sessionToken = await encrypt(sessionData)

  const cookieStore = await cookies()
  cookieStore.set("session", sessionToken, {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  })

  redirect("/")
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete("session")
  redirect("/login")
}
