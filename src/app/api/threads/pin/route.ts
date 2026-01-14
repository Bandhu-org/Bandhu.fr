import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth";
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { threadId, isPinned } = await request.json()

    if (!threadId || typeof isPinned !== 'boolean') {
      return NextResponse.json({ error: 'ThreadId et isPinned requis' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Vérifier que le thread existe et appartient à l'utilisateur
    const thread = await prisma.thread.findFirst({
      where: {
        id: threadId,
        userId: user.id
      }
    })

    if (!thread) {
      return NextResponse.json({ error: 'Thread non trouvé' }, { status: 404 })
    }

    // Mettre à jour isPinned
    await prisma.thread.update({
      where: { id: threadId },
      data: { isPinned }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erreur épinglage thread:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}