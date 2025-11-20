// src/app/api/threads/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(_request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 },
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 },
      )
    }

    // ========== CHARGER TOUS LES THREADS ==========
    const threads = await prisma.thread.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        label: true,
        messageCount: true,
        lastActivity: true,
        activeDates: true,
        isPinned: true,      // ← IMPORTANT pour l'épinglage
        createdAt: true,     // ← IMPORTANT pour l'âge
        updatedAt: true
      },
      orderBy: { lastActivity: 'desc' },
    })

    return NextResponse.json({ threads })
  } catch (error) {
    console.error('Erreur chargement threads:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 },
    )
  }
}
