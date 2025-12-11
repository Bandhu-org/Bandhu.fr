// src/app/api/timeline/events/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  console.log('🌐 [TIMELINE API] Route called')
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      console.log('❌ [TIMELINE API] No session')
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Récupérer les paramètres
    const searchParams = request.nextUrl.searchParams
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const zoom = searchParams.get('zoom') || 'month'
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    console.log('📅 [TIMELINE API] Params:', { start, end, zoom, limit, offset })

    // Validation
    if (!start || !end) {
      return NextResponse.json(
        { error: 'Les paramètres start et end sont requis' },
        { status: 400 }
      )
    }

    const startDate = new Date(start)
    const endDate = new Date(end)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Dates invalides' },
        { status: 400 }
      )
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Construire la requête selon le zoom
    let events: any[] = []
    let total = 0
    let hasMore = false

    if (zoom === 'year') {
      // Version simplifiée sans queryRaw
      const yearEvents = await prisma.event.findMany({
        where: {
          userId: user.id,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      // Agrégation manuelle par mois
      const monthlyMap = new Map<string, number>()
      
      yearEvents.forEach(event => {
        const monthKey = event.createdAt.toISOString().slice(0, 7) // YYYY-MM
        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + 1)
      })

      const monthlyCounts = Array.from(monthlyMap.entries())
        .sort(([a], [b]) => b.localeCompare(a)) // Tri décroissant
        .slice(0, 12)

      // Stocker dans events au lieu de return direct
      events = monthlyCounts.map(([monthKey, count]) => ({
        id: `month_${monthKey}`,
        createdAt: new Date(`${monthKey}-01T00:00:00Z`),
        role: 'system' as const,
        contentPreview: `${count} événements`,
        threadId: '',
        threadLabel: 'Agrégat mensuel',
        userId: user.id,
        count
      }))

      total = events.length
      hasMore = false

    } else {
      // 1. Compter le total pour cette plage
      total = await prisma.event.count({
        where: {
          userId: user.id,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      })

      // 2. Récupérer avec pagination
      events = await prisma.event.findMany({
        where: {
          userId: user.id,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          thread: {
            select: {
              id: true,
              label: true
            }
          },
          user: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: Math.min(limit, 500)
      })

      // Calculer hasMore
      hasMore = (offset + events.length) < total
    }

    // Formater la réponse
    const formattedEvents = events.map(event => ({
      id: event.id,
      createdAt: event.createdAt,
      role: event.role as 'user' | 'assistant' | 'system',
      contentPreview: event.content?.length > 50 
        ? event.content.substring(0, 50) + '...' 
        : event.content || '',
      threadId: event.threadId,
      threadLabel: event.thread?.label || 'Sans titre',
      userId: event.userId,
      userName: event.user?.name || undefined
    }))

    return NextResponse.json({
      events: formattedEvents,
      meta: {
        total: zoom === 'year' ? formattedEvents.length : total,
        returned: formattedEvents.length,
        offset,
        limit: Math.min(limit, 500),
        hasMore: zoom === 'year' ? false : hasMore,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        zoom
      }
    })

  } catch (error) {
    console.error('Erreur API timeline:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}