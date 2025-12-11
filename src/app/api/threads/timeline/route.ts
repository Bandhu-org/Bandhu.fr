// src/app/api/threads/timeline/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(_request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    const threads = await prisma.thread.findMany({
      where: { userId: user.id },
      include: {
        events: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            content: true,
            role: true,
            createdAt: true,
            userId: true,
          }
        }
      },
      orderBy: [
        { isPinned: 'desc' },
        { lastActivity: 'desc' }
      ],
    })

    const formattedThreads = threads.map(thread => ({
      id: thread.id,
      label: thread.label || 'Sans titre',
      messageCount: thread.messageCount || 0,
      lastActivity: thread.lastActivity || thread.updatedAt,
      isPinned: thread.isPinned || false,
      events: thread.events
    }))

    return NextResponse.json({ threads: formattedThreads })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}