"use server"

import { prisma } from "@/lib/prisma"

export async function searchGlobal(query: string) {
  if (!query || query.length < 2) return { clients: [], loans: [], investors: [] }

  try {
    const [clients, loans, investors] = await Promise.all([
      prisma.client.findMany({
        where: {
          deletedAt: null,
          OR: [
            { firstName: { contains: query } },
            { lastName: { contains: query } },
            { idDocument: { contains: query } }
          ]
        },
        take: 3
      }),
      prisma.loan.findMany({
        where: {
          deletedAt: null,
          OR: [
            { id: { contains: query } },
            { client: { firstName: { contains: query } } },
            { client: { lastName: { contains: query } } }
          ]
        },
        include: {
          client: true
        },
        take: 3
      }),
      prisma.investor.findMany({
        where: {
          deletedAt: null,
          OR: [
            { name: { contains: query } },
            { email: { contains: query } }
          ]
        },
        take: 3
      })
    ])

    return { clients, loans, investors }
  } catch (error) {
    console.error("Search error:", error)
    return { clients: [], loans: [], investors: [] }
  }
}
