import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import {prisma} from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json()

    if (!token || !password) {
      return NextResponse.json({ error: 'Token ou mot de passe manquant.' }, { status: 400 })
    }

    // Chercher l'utilisateur avec ce token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gte: new Date(), // le token est encore valide
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Token invalide ou expiré.' }, { status: 400 })
    }

    // Hachage du nouveau mot de passe
    const hashedPassword = await hash(password, 10)

    // Mise à jour de l'utilisateur
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      
      },
    })

    return NextResponse.json({ message: 'Mot de passe réinitialisé avec succès.' })
  } catch (err) {
    console.error('Erreur reset password:', err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
