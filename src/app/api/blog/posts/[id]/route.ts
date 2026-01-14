// src/app/api/blog/posts/[id]/route.ts

import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const session: any = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const { id } = await params
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    // Vérifie que le post appartient à l'utilisateur
    const post = await prisma.post.findUnique({
      where: { id }
    })

    if (!post) {
      return NextResponse.json({ error: 'Article introuvable' }, { status: 404 })
    }

    if (post.authorId !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Supprime l'article
    await prisma.post.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur suppression post:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}