import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { threadId, newLabel } = await request.json()

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Trouver le marker FRESH_CHAT du thread
    const dayTapes = await prisma.dayTape.findMany({
      where: { userId: user.id },
      include: { events: true }
    })

    let markerEvent = null
    for (const dt of dayTapes) {
      for (const event of dt.events) {
        const metadata = event.metadata as any
        if (metadata?.threadId === threadId && event.type === 'FRESH_CHAT') {
          markerEvent = event
          break
        }
      }
      if (markerEvent) break
    }

    if (!markerEvent) {
      return NextResponse.json({ error: 'Thread non trouvé' }, { status: 404 })
    }

    // Mettre à jour le label
    const metadata = markerEvent.metadata as any
    await prisma.event.update({
      where: { id: markerEvent.id },
      data: {
        metadata: {
          ...metadata,
          threadLabel: newLabel
        }
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erreur renommage thread:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}