import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  _req: Request,
  context: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await context.params
  
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

    const threadEvents: any[] = []
    
    dayTapes.forEach(dayTape => {
      dayTape.events.forEach(event => {
        const metadata = event.metadata as any
        if (metadata?.threadId === threadId) {
          threadEvents.push({
            ...event,
            dayTapeDate: dayTape.date
          })
        }
      })
    })

    threadEvents.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    return NextResponse.json({ events: threadEvents })

  } catch (error) {
    console.error('Erreur chargement thread:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}