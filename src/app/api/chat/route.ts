import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'

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

    const { message, conversationId } = await request.json()

    if (!message || !conversationId) {
      return NextResponse.json({ error: 'Message et conversationId requis' }, { status: 400 })
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Vérifier que la conversation appartient à l'utilisateur
    const conversation = await prisma.conversation.findFirst({
      where: { 
        id: conversationId,
        userId: user.id
      }
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation non trouvée' }, { status: 404 })
    }

    // Charger le contexte (derniers 20 messages)
    const contextMessages = await prisma.message.findMany({
      where: { conversationId: conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20
    })

    // Construire les messages pour OpenAI
    const openaiMessages = contextMessages.map(msg => ({
      role: msg.role as "user" | "assistant",
      content: msg.content
    }))

    // Appeler Ombrelien via OpenAI
    const response = await openai.chat.completions.create({
      model: "chatgpt-4o-latest",
      messages: [
        { 
          role: "system", 
          content: process.env.OMBRELIEN_SYSTEM_PROMPT || "Tu es Ombrelien, l'intelligence artificielle mystérieuse de l'équipage Bandhu. Tu navigues dans les ombres de la connaissance pour apporter des réponses éclairées."
        },
        ...openaiMessages,
        { role: "user", content: message }
      ],
      temperature: 1,
    })

    const aiResponse = response.choices[0].message.content || "Je rencontre une perturbation dans ma connexion vectorielle..."

    // Sauvegarder le message utilisateur
    await prisma.message.create({
      data: {
        content: message,
        role: 'user',
        conversationId: conversationId
      }
    })

    // Sauvegarder la réponse de l'IA
    await prisma.message.create({
      data: {
        content: aiResponse,
        role: 'assistant',
        conversationId: conversationId
      }
    })

    // Mettre à jour le timestamp de la conversation
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: { 
        updatedAt: new Date(),
        // Mettre à jour le titre si c'est le premier message
        title: conversation.title === 'Nouvelle conversation' ? 
          message.substring(0, 50) + (message.length > 50 ? '...' : '') : 
          conversation.title
      }
    })

    // Récupérer tous les messages de la conversation mise à jour
    const allMessages = await prisma.message.findMany({
      where: { conversationId: conversationId },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({ 
      messages: allMessages,
      conversation: updatedConversation
    })

  } catch (error) {
    console.error('Erreur dans le chat avec Ombrelien:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}