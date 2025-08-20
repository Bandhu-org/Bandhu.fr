import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/options'
import { prisma } from '@/lib/prisma'

// DELETE /api/folders/[id] - Supprimer un dossier
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    const folder = await prisma.folder.findUnique({
      where: { id: params.id }
    })

    if (!folder || folder.userId !== user.id) {
      return NextResponse.json({ error: 'Dossier introuvable ou non autorisé' }, { status: 404 })
    }

    await prisma.folder.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Dossier supprimé' })
  } catch (error) {
    console.error('Erreur DELETE folder :', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH /api/folders/[id] - Renommer un dossier
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { name } = await req.json()

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Nom invalide' }, { status: 400 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    const folder = await prisma.folder.findUnique({
      where: { id: params.id }
    })

    if (!folder || folder.userId !== user.id) {
      return NextResponse.json({ error: 'Dossier introuvable ou non autorisé' }, { status: 404 })
    }

    const updatedFolder = await prisma.folder.update({
      where: { id: params.id },
      data: { name }
    })

    return NextResponse.json({ folder: updatedFolder })
  } catch (error) {
    console.error('Erreur PATCH folder :', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
