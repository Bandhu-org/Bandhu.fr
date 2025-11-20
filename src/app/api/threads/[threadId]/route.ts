import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  _req: Request,
  context: { params: Promise<{ threadId: string }> }  // ← Promise
) {
  const { threadId } = await context.params  // ← Await obligatoire

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

    // ========== UNE SEULE REQUÊTE AVEC INCLUDE ==========
    const thread = await prisma.thread.findFirst({
      where: {
        id: threadId,
        userId: user.id,
      },
      include: {
        events: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!thread) {
      return NextResponse.json(
        { error: 'Thread introuvable' },
        { status: 404 },
      )
    }

    // Retourner les events du thread
    return NextResponse.json({ 
      events: thread.events,
      thread: {
        id: thread.id,
        label: thread.label,
        messageCount: thread.messageCount
      }
    })

  } catch (error) {
    console.error('Erreur chargement thread:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 },
    )
  }
}