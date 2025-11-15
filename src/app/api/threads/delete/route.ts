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

    const { threadId } = await request.json()

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Supprimer tous les events avec ce threadId
    const dayTapes = await prisma.dayTape.findMany({
      where: { userId: user.id },
      include: { events: true }
    })

    const eventIdsToDelete: string[] = []
    
    dayTapes.forEach(dt => {
      dt.events.forEach(event => {
        const metadata = event.metadata as any
        if (metadata?.threadId === threadId) {
          eventIdsToDelete.push(event.id)
        }
      })
    })

    await prisma.event.deleteMany({
      where: {
        id: { in: eventIdsToDelete }
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erreur suppression thread:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}