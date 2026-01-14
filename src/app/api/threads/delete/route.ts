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

    const { threadId } = await request.json()

    if (!threadId) {
      return NextResponse.json({ error: 'ThreadId requis' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Vérifier que le thread appartient à l'utilisateur
    const thread = await prisma.thread.findFirst({
      where: {
        id: threadId,
        userId: user.id
      }
    })

    if (!thread) {
      return NextResponse.json({ error: 'Thread non trouvé' }, { status: 404 })
    }

    // ========== SUPPRESSION EN CASCADE AUTOMATIQUE ! ==========
    // Grâce à onDelete: Cascade, tous les Events sont supprimés auto
    await prisma.thread.delete({
      where: { id: threadId }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erreur suppression thread:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}