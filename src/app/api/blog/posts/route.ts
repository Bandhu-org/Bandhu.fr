// src/app/api/blog/posts/route.ts

import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    const body = await req.json()
    
    const post = await prisma.post.create({
      data: {
        title: body.title,
        slug: body.slug,
        content: body.content,
        excerpt: body.excerpt || null,
        coverImage: body.coverImage || null,
        published: body.published,
        authorId: user.id
      }
    })

    return NextResponse.json(post)
  } catch (error) {
    console.error('Erreur création post:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// src/app/api/blog/posts/route.ts

// Ajoute cette fonction GET en plus de la POST existante

export async function GET(req: Request) {
  const session: any = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    // Récupère tous les posts de l'utilisateur
    const posts = await prisma.post.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(posts)
  } catch (error) {
    console.error('Erreur récupération posts:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}