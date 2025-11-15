import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { PrismaClient } from '@prisma/client'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { message, date, threadId, action, threadLabel } = body

    console.log('🔍 Body reçu:', body)
console.log('🔍 Action:', action)
console.log('🔍 ThreadId:', threadId)
console.log('🔍 Message:', message)

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Action spéciale : créer nouveau thread
    if (action === 'new_thread') {
      const targetDate = date || new Date().toISOString().split('T')[0]
      
      let dayTape = await prisma.dayTape.findUnique({
        where: {
          userId_date: {
            userId: user.id,
            date: targetDate
          }
        }
      })

      if (!dayTape) {
        dayTape = await prisma.dayTape.create({
          data: {
            userId: user.id,
            date: targetDate
          }
        })
      }

      // Créer marker FRESH_CHAT
      await prisma.event.create({
        data: {
          dayTapeId: dayTape.id,
          type: 'FRESH_CHAT',
          content: '',
          metadata: {
            threadId,
            threadLabel: threadLabel || 'Nouveau sujet'
          }
        }
      })

      return NextResponse.json({ success: true, threadId })
    }

    // Message normal
    if (!message) {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 })
    }

    const targetDate = date || new Date().toISOString().split('T')[0]

    // Trouver ou créer la DayTape du jour
    let dayTape = await prisma.dayTape.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: targetDate
        }
      }
    })

    if (!dayTape) {
      dayTape = await prisma.dayTape.create({
        data: {
          userId: user.id,
          date: targetDate
        }
      })
    }

    // Charger contexte selon threadId
    let contextMessages: any[] = []
    
    if (threadId) {
      // Charger TOUT le thread (cross-dates)
      const allDayTapes = await prisma.dayTape.findMany({
        where: { userId: user.id },
        include: {
          events: {
            orderBy: { createdAt: 'asc' }
          }
        }
      })

      // Filtrer events du thread
      const threadEvents: any[] = []
      allDayTapes.forEach(dt => {
        dt.events.forEach(event => {
          const metadata = event.metadata as any
          if (metadata?.threadId === threadId && 
              (event.type === 'USER_MESSAGE' || event.type === 'AI_MESSAGE')) {
            threadEvents.push(event)
          }
        })
      })

      contextMessages = threadEvents.map(e => ({
        role: e.role as "user" | "assistant",
        content: e.content
      }))
    } else {
      // Pas de thread : contexte = derniers messages du jour
      const todayEvents = await prisma.event.findMany({
        where: { dayTapeId: dayTape.id },
        orderBy: { createdAt: 'asc' }
      })

      contextMessages = todayEvents
        .filter(e => e.type === 'USER_MESSAGE' || e.type === 'AI_MESSAGE')
        .slice(-20)
        .map(e => ({
          role: e.role as "user" | "assistant",
          content: e.content
        }))
    }

    // Appeler OpenAI
    const response = await openai.chat.completions.create({
      model: "chatgpt-4o-latest",
      messages: [
        { 
          role: "system", 
          content: process.env.OMBRELIEN_SYSTEM_PROMPT || 
            "Tu es Ombrelien, l'intelligence artificielle mystérieuse de l'équipage Bandhu."
        },
        ...contextMessages,
        { role: "user", content: message }
      ],
      temperature: 1,
    })

    const aiResponse = response.choices[0].message.content || 
      "Je rencontre une perturbation dans ma connexion vectorielle..."

    // Sauvegarder events avec threadId si présent
    const eventMetadata = threadId ? { threadId } : undefined

    await prisma.event.create({
      data: {
        dayTapeId: dayTape.id,
        type: 'USER_MESSAGE',
        role: 'user',
        content: message,
        metadata: eventMetadata
      }
    })

    await prisma.event.create({
      data: {
        dayTapeId: dayTape.id,
        type: 'AI_MESSAGE',
        role: 'assistant',
        content: aiResponse,
        metadata: eventMetadata
      }
    })

    // Récupérer tous les events pour retour
    const allEvents = await prisma.event.findMany({
      where: { dayTapeId: dayTape.id },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({ 
      events: allEvents,
      dayTape: {
        id: dayTape.id,
        date: dayTape.date
      }
    })

  } catch (error) {
    console.error('Erreur dans le chat avec Ombrelien:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}