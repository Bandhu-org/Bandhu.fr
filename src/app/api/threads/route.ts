import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    const dayTapes = await prisma.dayTape.findMany({
      where: { userId: user.id },
      include: {
        events: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    const threadsMap = new Map<string, any>()
    
    dayTapes.forEach(dayTape => {
      dayTape.events.forEach(event => {
        const metadata = event.metadata as any
        const threadId = metadata?.threadId
        
        if (!threadId) return
        
        if (!threadsMap.has(threadId)) {
          threadsMap.set(threadId, {
            id: threadId,
            label: metadata?.threadLabel || 'Sans titre',
            messageCount: 0,
            lastActivity: event.createdAt,
            activeDates: new Set<string>()
          })
        }
        
        const thread = threadsMap.get(threadId)
        
        if (event.type === 'USER_MESSAGE' || event.type === 'AI_MESSAGE') {
          thread.messageCount++
        }
        
        thread.activeDates.add(dayTape.date)
        
        if (new Date(event.createdAt) > new Date(thread.lastActivity)) {
          thread.lastActivity = event.createdAt
        }
      })
    })

    const threads = Array.from(threadsMap.values()).map(t => ({
      ...t,
      activeDates: Array.from(t.activeDates).sort()
    }))

    return NextResponse.json({ threads })

  } catch (error) {
    console.error('Erreur chargement threads:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
