// src/app/api/timeline/metadata/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  console.log('🔍 [METADATA API] Route called')
  
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      console.log('❌ [METADATA API] No session')
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

    console.log('📊 [METADATA API] Fetching all metadata for user:', user.id)

    // ✨ REQUÊTE ULTRA OPTIMISÉE
    // Seulement 4 colonnes, pas de JOIN, pas de LIMIT
    const events = await prisma.event.findMany({
      where: {
        userId: user.id
      },
      select: {
        id: true,
        createdAt: true,
        role: true,
        threadId: true
      },
      orderBy: {
        createdAt: 'asc' // ✨ Important : ordre chronologique
      }
    })

    console.log(`✅ [METADATA API] Loaded ${events.length} events`)

    // Calculer first/last pour le front
    const firstEventDate = events.length > 0 
      ? events[0].createdAt.toISOString() 
      : new Date().toISOString()
    
    const lastEventDate = events.length > 0 
      ? events[events.length - 1].createdAt.toISOString() 
      : new Date().toISOString()

    return NextResponse.json({
      events: events.map(e => ({
        id: e.id,
        createdAt: e.createdAt.toISOString(),
        role: e.role as 'user' | 'assistant' | 'system',
        threadId: e.threadId
      })),
      meta: {
        total: events.length,
        firstEventDate,
        lastEventDate
      }
    })

  } catch (error) {
    console.error('❌ [METADATA API] Error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}