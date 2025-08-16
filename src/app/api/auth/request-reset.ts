// /api/auth/request-reset.ts
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { sendResetEmail } from '@/lib/email' // à créer avec resend ou nodemailer

export async function POST(req: Request) {
  const { email } = await req.json()

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: 'Email non trouvé' }, { status: 404 })

  const token = randomBytes(32).toString('hex')
  const expiry = new Date(Date.now() + 15 * 60 * 1000)

  await prisma.user.update({
    where: { email },
    data: {
      resetToken: token,
      resetTokenExpiry: expiry,
    },
  })

  await sendResetEmail(email, token) // À définir selon ton système d'envoi

  return NextResponse.json({ success: true })
}
