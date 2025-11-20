import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return new Response('Non authentifié', { status: 401 })
    }

    // Récupérer les counts séparément
    const [threads, posts, eventsCount, userData] = await Promise.all([
      prisma.thread.findMany({
        where: { user: { email: session.user.email } },
        select: {
          id: true,
          label: true,
          messageCount: true,
          lastActivity: true,
          isPinned: true
        },
        orderBy: { lastActivity: 'desc' }
      }),
      prisma.post.findMany({
        where: { author: { email: session.user.email } },
        select: {
          id: true,
          title: true,
          published: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.event.count({
        where: { user: { email: session.user.email } }
      }),
      prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true, email: true, image: true, createdAt: true }
      })
    ])

    if (!userData) {
      return new Response('Utilisateur non trouvé', { status: 404 })
    }

    const statusData = {
      user: {
        threadsCount: threads.length,
        postsCount: posts.length,
        eventsCount: eventsCount
      },
      recentThreads: threads.slice(0, 5),
      recentPosts: posts.slice(0, 3),
      exportInfo: {
        recommended: threads.length > 0 || posts.length > 0,
        estimatedSize: Math.round((eventsCount * 0.5 + posts.length * 2) / 1024) + ' KB',
        lastActivity: threads[0]?.lastActivity || null
      }
    }

    return new Response(JSON.stringify(statusData, null, 2), {
      headers: {
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('Erreur status:', error)
    return new Response('Erreur serveur', { status: 500 })
  }
}