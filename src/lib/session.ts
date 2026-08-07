import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

const secretKey = process.env.SESSION_SECRET || "fallback_super_secret_key_jyj"
const key = new TextEncoder().encode(secretKey)

import { prisma } from "@/lib/prisma"

export type SessionPayload = {
  userId: string
  name?: string
  email: string
  role: string
}

export async function encrypt(payload: SessionPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(key)
}

export async function decrypt(input: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ["HS256"],
    })
    return payload as SessionPayload
  } catch (error) {
    return null
  }
}

export async function getSession() {
  const session = (await cookies()).get("session")?.value
  if (!session) return null
  return await decrypt(session)
}

export async function getCurrentUserSummary(): Promise<{ id?: string; name: string; role: string; label: string }> {
  try {
    const session = await getSession()
    if (!session) {
      return { name: "Sistema", role: "SYSTEM", label: "🤖 Sistema / Automático" }
    }
    
    let name = session.name
    let role = session.role
    
    if (!name && session.userId) {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { name: true, role: true }
      })
      if (user) {
        name = user.name
        role = user.role
      }
    }
    
    const displayName = name || session.email.split("@")[0] || "Usuario"
    const roleIcon = role === "ADMIN" ? "👑" : "💼"
    const roleText = role === "ADMIN" ? "Admin" : "Secretaría"
    
    return {
      id: session.userId,
      name: displayName,
      role: role || "SECRETARY",
      label: `${displayName} (${roleIcon} ${roleText})`
    }
  } catch {
    return { name: "Usuario", role: "UNKNOWN", label: "Usuario" }
  }
}
