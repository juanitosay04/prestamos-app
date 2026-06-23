import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const email = 'juanestupinan901@gmail.com'
    const password = 'rojas860765'
    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        role: 'ADMIN',
      },
      create: {
        name: 'Juan Administrador',
        email,
        passwordHash,
        role: 'ADMIN',
      },
    })

    return NextResponse.json({ success: true, user: user.email })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message })
  }
}
