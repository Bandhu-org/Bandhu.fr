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
    const { message, threadId, action, threadLabel } = body

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

    // ========== ACTION : CRÉER NOUVEAU THREAD ==========
    if (action === 'new_thread') {
      const newThread = await prisma.thread.create({
        data: {
          userId: user.id,
          label: threadLabel || 'Nouvelle conversation',
          activeDates: [new Date().toISOString().split('T')[0]],
        }
      })

      return NextResponse.json({ 
        success: true, 
        threadId: newThread.id 
      })
    }

    // ========== MESSAGE NORMAL ==========
    if (!message) {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 })
    }

    if (!threadId) {
      return NextResponse.json({ error: 'ThreadId requis' }, { status: 400 })
    }

    // Vérifier que le thread existe
    const thread = await prisma.thread.findUnique({
      where: { id: threadId }
    })

    if (!thread) {
      return NextResponse.json({ error: 'Thread non trouvé' }, { status: 404 })
    }

    // ========== CHARGER CONTEXTE (33 DERNIERS MESSAGES) ==========
    const MAX_CONTEXT = 33

    const threadEvents = await prisma.event.findMany({
      where: {
        threadId: threadId,
        type: { in: ['USER_MESSAGE', 'AI_MESSAGE'] }
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_CONTEXT
    })

    // Remettre dans l'ordre chronologique
    const recentEvents = threadEvents.reverse()

    const contextMessages = recentEvents.map(e => ({
      role: e.role as 'user' | 'assistant',
      content: e.content,
    }))

    // ========== APPELER OPENAI ==========
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

    // ========== SAUVEGARDER LES MESSAGES ==========
    await prisma.event.create({
      data: {
        threadId: threadId,
        userId: user.id,
        type: 'USER_MESSAGE',
        role: 'user',
        content: message,
      }
    })

    await prisma.event.create({
      data: {
        threadId: threadId,
        userId: user.id,
        type: 'AI_MESSAGE',
        role: 'assistant',
        content: aiResponse,
      }
    })

    // ========== METTRE À JOUR LE THREAD ==========
    const today = new Date().toISOString().split('T')[0]
    const updatedActiveDates = thread.activeDates.includes(today)
      ? thread.activeDates
      : [...thread.activeDates, today]

    await prisma.thread.update({
      where: { id: threadId },
      data: {
        lastActivity: new Date(),
        messageCount: { increment: 2 }, // +1 user +1 AI
        activeDates: updatedActiveDates
      }
    })

    // ========== RETOURNER LES EVENTS ==========
    const allEvents = await prisma.event.findMany({
      where: { threadId: threadId },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({ 
      events: allEvents,
      thread: {
        id: thread.id,
        label: thread.label
      }
    })

  } catch (error) {
    console.error('Erreur dans le chat avec Ombrelien:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}