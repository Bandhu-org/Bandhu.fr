// src/app/api/timeline/details/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  console.log('📝 [DETAILS API] Route called')
  
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      console.log('❌ [DETAILS API] No session')
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
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

    // Récupérer les IDs demandés
    const searchParams = request.nextUrl.searchParams
    const idsParam = searchParams.get('ids')
    
    if (!idsParam) {
      return NextResponse.json(
        { error: 'Paramètre ids requis' },
        { status: 400 }
      )
    }

    const ids = idsParam.split(',').filter(Boolean)
    
    if (ids.length === 0) {
      return NextResponse.json({ details: {} })
    }

    if (ids.length > 500) {
      return NextResponse.json(
        { error: 'Maximum 500 IDs par requête' },
        { status: 400 }
      )
    }

    console.log(`📝 [DETAILS API] Fetching ${ids.length} event details`)

    // ✨ REQUÊTE OPTIMISÉE avec JOINs seulement pour les détails
    const events = await prisma.event.findMany({
      where: {
        id: { in: ids },
        userId: user.id // ✨ Sécurité : vérifier que l'user possède ces events
      },
      select: {
        id: true,
        content: true,
        thread: {
          select: {
            label: true
          }
        },
        user: {
          select: {
            name: true
          }
        }
      }
    })

    console.log(`✅ [DETAILS API] Loaded ${events.length} event details`)

    // Formatter en Map pour accès rapide côté front
    const details: Record<string, {
      contentPreview: string
      threadLabel: string
      userName?: string
    }> = {}

    events.forEach(event => {
      details[event.id] = {
        contentPreview: event.content && event.content.length > 150
          ? event.content.substring(0, 150) + '...'
          : event.content || '',
        threadLabel: event.thread?.label || 'Sans titre',
        userName: event.user?.name || undefined
      }
    })

    return NextResponse.json({ details })

  } catch (error) {
    console.error('❌ [DETAILS API] Error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}