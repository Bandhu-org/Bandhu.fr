import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return new Response('Non authentifié', { status: 401 })
    }

    // Récupérer TOUTES les données de l'utilisateur
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
        },
        posts: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!userData) {
      return new Response('Utilisateur non trouvé', { status: 404 })
    }

    // Structure d'export complète
    const exportData = {
      version: '1.0',
      schema: 'bandhu-complete',
      exportedAt: new Date().toISOString(),
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        image: userData.image,
        createdAt: userData.createdAt.toISOString()
      },
      data: {
        threads: userData.threads.map(thread => ({
          id: thread.id,
          label: thread.label,
          messageCount: thread.messageCount,
          lastActivity: thread.lastActivity.toISOString(),
          activeDates: thread.activeDates,
          isPinned: thread.isPinned,
          createdAt: thread.createdAt.toISOString(),
          updatedAt: thread.updatedAt.toISOString(),
          events: thread.events.map(event => ({
            id: event.id,
            type: event.type,
            role: event.role,
            content: event.content,
            createdAt: event.createdAt.toISOString()
          }))
        })),
        posts: userData.posts.map(post => ({
          id: post.id,
          title: post.title,
          slug: post.slug,
          content: post.content,
          excerpt: post.excerpt,
          coverImage: post.coverImage,
          published: post.published,
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString()
        }))
      }
    }

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="bandhu-complete-backup-${new Date().toISOString().split('T')[0]}.json"`
      }
    })

  } catch (error) {
    console.error('Erreur export:', error)
    return new Response('Erreur serveur', { status: 500 })
  }
}