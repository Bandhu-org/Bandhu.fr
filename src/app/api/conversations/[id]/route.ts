import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/conversations/[id] - Récupérer une conversation avec ses messages
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const conversationId = params.id

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Récupérer la conversation avec ses messages
    const conversation = await prisma.conversation.findFirst({
      where: { 
        id: conversationId,
        userId: user.id
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation non trouvée' }, { status: 404 })
    }

    return NextResponse.json({ conversation })

  } catch (error) {
    console.error('Erreur lors de la récupération de la conversation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/conversations/[id] - Supprimer une conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const conversationId = params.id

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

    // Supprimer la conversation (les messages seront supprimés en cascade)
    await prisma.conversation.delete({
      where: { id: conversationId }
    })

    return NextResponse.json({ message: 'Conversation supprimée' })

  } catch (error) {
    console.error('Erreur lors de la suppression de la conversation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}