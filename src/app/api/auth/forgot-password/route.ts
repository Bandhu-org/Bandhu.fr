import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { Resend } from 'resend'
import crypto from 'crypto'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    console.log('🔥 Email reçu:', email)

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: 'Format d\'email invalide' })
    }

    // Vérification compte existant
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json({ success: false, error: 'Aucun compte trouvé avec cet email' })
    }

    // Génération token reset
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 heure

    // Sauvegarde token
    console.log('🔥 Tentative update user...')
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry
      } as any
    })
console.log('✅ Token sauvegardé en DB')
    // Envoi email
    const resend = new Resend(process.env.RESEND_API_KEY)
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`

    await resend.emails.send({
      from: 'noreply@bandhu.fr',
      to: email,
      subject: '🔒 Réinitialisation de votre mot de passe Bandhu',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; background: #0f0f23; color: #fff; padding: 40px;">
          <div style="max-width: 600px; margin: 0 auto; background: #1a1a2e; padding: 30px; border-radius: 8px;">
            <h1 style="color: #fff; text-align: center;">🔒 Réinitialisation mot de passe</h1>
            <p>Bonjour,</p>
            <p>Vous avez demandé la réinitialisation de votre mot de passe Bandhu.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #2563eb; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; font-weight: bold;">
                Réinitialiser mon mot de passe
              </a>
            </div>
            <p style="color: #ccc; font-size: 14px;">
              Ce lien expire dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
            </p>
            <p style="color: #666; font-size: 12px;">
              Lien: ${resetUrl}
            </p>
          </div>
        </body>
        </html>
      `
    })

    console.log('📧 Email reset envoyé à:', email)
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erreur forgot-password:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' })
  }
}