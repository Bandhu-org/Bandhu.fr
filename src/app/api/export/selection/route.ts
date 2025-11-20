import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return new Response('Non authentifié', { status: 401 })
    }

    // Récupérer tous les threads et events de l'utilisateur
    const userData = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        threads: {
          include: {
            events: {
              orderBy: { createdAt: 'asc' }
            }
          },
          orderBy: { lastActivity: 'desc' }
        }
      }
    })

    if (!userData) {
      return new Response('Utilisateur non trouvé', { status: 404 })
    }

    // Structurer les données pour la sélection
    const selectionData = userData.threads.map(thread => ({
      threadId: thread.id,
      threadLabel: thread.label,
      threadDate: thread.lastActivity.toISOString(),
      events: thread.events.map(event => ({
        id: event.id,
        content: event.content,
        type: event.type,
        role: event.role,
        createdAt: event.createdAt.toISOString(),
        selected: true // Par défaut, tout est sélectionné
      }))
    }))

    return new Response(JSON.stringify({
      success: true,
      data: selectionData,
      metadata: {
        totalThreads: selectionData.length,
        totalEvents: selectionData.reduce((sum, thread) => sum + thread.events.length, 0)
      }
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('❌ Erreur endpoint sélection:', error)
    return new Response(JSON.stringify({
      success: false,
      error: 'Erreur lors de la récupération des données'
    }), { status: 500 })
  }
}