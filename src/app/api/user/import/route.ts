import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return new Response('Non authentifié', { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!currentUser) {
      return new Response('Utilisateur non trouvé', { status: 404 })
    }

    const body = await request.json()
    
    // Validation du format
    if (!body.data || !body.version) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Format de fichier invalide'
      }), { status: 400 })
    }

    const results = {
      threads: { created: 0, skipped: 0, errors: 0 },
      posts: { created: 0, skipped: 0, errors: 0 },
      events: { created: 0, errors: 0 }
    }

    // IMPORT DES THREADS (avec merge par label + dates)
    if (body.data.threads && Array.isArray(body.data.threads)) {
      for (const threadData of body.data.threads) {
        try {
          // Vérifier si un thread similaire existe déjà
          const existingThread = await prisma.thread.findFirst({
            where: {
              userId: currentUser.id,
              OR: [
                { id: threadData.id }, // Même ID
                { 
                  AND: [
                    { label: threadData.label },
                    { activeDates: { hasSome: threadData.activeDates } }
                  ]
                } // Même label + dates communes
              ]
            }
          })

          if (existingThread) {
            results.threads.skipped++
            continue
          }

          // Créer le nouveau thread
          const newThread = await prisma.thread.create({
            data: {
              label: threadData.label,
              messageCount: threadData.messageCount,
              lastActivity: new Date(threadData.lastActivity),
              activeDates: threadData.activeDates,
              isPinned: threadData.isPinned,
              userId: currentUser.id,
              // Importer les events associés
              events: {
                create: threadData.events?.map((event: any) => ({
                  content: event.content,
                  role: event.role,
                  type: event.type,
                  userId: currentUser.id,
                  createdAt: new Date(event.createdAt)
                })) || []
              }
            },
            include: { events: true }
          })

          results.threads.created++
          results.events.created += newThread.events.length

        } catch (error) {
          console.error('Erreur import thread:', error)
          results.threads.errors++
        }
      }
    }

    // IMPORT DES POSTS (merge par slug)
    if (body.data.posts && Array.isArray(body.data.posts)) {
      for (const postData of body.data.posts) {
        try {
          // Vérifier si le post existe déjà
          const existingPost = await prisma.post.findFirst({
            where: {
              authorId: currentUser.id,
              OR: [
                { id: postData.id },
                { slug: postData.slug }
              ]
            }
          })

          if (existingPost) {
            results.posts.skipped++
            continue
          }

          await prisma.post.create({
            data: {
              title: postData.title,
              slug: postData.slug,
              content: postData.content,
              excerpt: postData.excerpt,
              coverImage: postData.coverImage,
              published: postData.published,
              authorId: currentUser.id,
              createdAt: new Date(postData.createdAt),
              updatedAt: new Date(postData.updatedAt)
            }
          })

          results.posts.created++

        } catch (error) {
          console.error('Erreur import post:', error)
          results.posts.errors++
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Import terminé',
      summary: {
        threads: `+${results.threads.created} créés, ${results.threads.skipped} existants, ${results.threads.errors} erreurs`,
        posts: `+${results.posts.created} créés, ${results.posts.skipped} existants, ${results.posts.errors} erreurs`,
        events: `+${results.events.created} événements créés`
      },
      details: results
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Erreur import:', error)
    return new Response('Erreur serveur', { status: 500 })
  }
}