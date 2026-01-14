// app/api/account/delete/route.ts
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function DELETE(req: Request) {
  const session: any = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    // Trouve l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    // Supprime d'abord toutes les conversations (et messages en cascade)
    await prisma.thread.deleteMany({
      where: { userId: user.id }
    })

    // Supprime les accounts
    await prisma.account.deleteMany({
      where: { userId: user.id }
    })

    // Supprime les sessions
    await prisma.session.deleteMany({
      where: { userId: user.id }
    })

    // Enfin supprime l'utilisateur
    await prisma.user.delete({
      where: { email: session.user.email }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur suppression:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}