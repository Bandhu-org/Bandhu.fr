// src/app/api/threads/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth";
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

    // ✅ Formater pour ThreadsView
    const threads = await prisma.thread.findMany({
  where: { userId: user.id },
  include: {
    events: {
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true,
        content: true,
        role: true,
        createdAt: true,
      }
    }
  },
  orderBy: [
    { isPinned: 'desc' },      // ✅ Épinglés d'abord
    { lastActivity: 'desc' }
  ],
})

const formattedThreads = threads.map(thread => ({
  id: thread.id,
  label: thread.label || 'Sans titre',
  messageCount: thread.messageCount || 0,
  lastActivity: thread.lastActivity || thread.updatedAt,
  isPinned: thread.isPinned || false, // ✅ ICI
  activeDates: thread.activeDates || [],
  messages: thread.events?.map(event => ({
    id: event.id,
    content: event.content?.length > 100 
      ? event.content.substring(0, 100) + '...' 
      : event.content || '',
    role: event.role as 'user' | 'assistant',
    createdAt: event.createdAt
  })) || []
}))

    return NextResponse.json({ 
      threads: formattedThreads 
    })
  } catch (error) {
    console.error('Erreur chargement threads:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 },
    )
  }
}