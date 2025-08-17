import NextAuth from 'next-auth'
import { PrismaClient } from "@prisma/client"
import CredentialsProvider from 'next-auth/providers/credentials'
import EmailProvider from 'next-auth/providers/email'
import { PasswordSecurity } from '@/app/lib/password'
import crypto from 'crypto'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { Resend } from 'resend'

const prisma = new PrismaClient()

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // 🔥 EMAIL PROVIDER (Magic Link)
    EmailProvider({
      from: 'noreply@bandhu.fr',
      sendVerificationRequest: async ({ identifier: email, url, token }) => {
        console.log('🔥 Email à envoyer à:', email)
        console.log('🔥 Token:', token)
        console.log('🔥 URL:', url)
        const resend = new Resend(process.env.RESEND_API_KEY)
        
        await resend.emails.send({
          from: 'noreply@bandhu.fr',
          to: email,
          subject: '🔥 Ton lien de connexion Bandhu !',
          html: `<a href="${url}">Clique ici pour te connecter</a>`
        })
        
        console.log('✅ Email envoyé !')
      },
    }),

    // 🎯 LOGIN PROVIDER
    CredentialsProvider({
      id: 'login',
      name: 'Login',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials: any) {
        console.log('🚀 LOGIN attempt:', credentials?.email)
        
        if (!credentials?.email || !credentials?.password) {
          throw new Error('MISSING_FIELDS')
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(credentials.email)) {
          throw new Error('INVALID_EMAIL_FORMAT')
        }
        
        // Find user
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })
        
        if (!user) {
          throw new Error('EMAIL_NOT_REGISTERED')
        }
        
        if (!user.emailVerified) {
          throw new Error('EMAIL_NOT_VERIFIED')
        }
        
        // Verify password
        const isValid = await PasswordSecurity.verifyPassword(
          credentials.password, 
          user.password
        )
        
        if (!isValid) {
          throw new Error('INVALID_PASSWORD')
        }
        
        return { id: user.id, email: user.email, name: user.name }
      }
    }),

    // 🚀 REGISTER PROVIDER
    CredentialsProvider({
      id: 'register',
      name: 'Register',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        name: { label: "Name", type: "text" }
      },
      async authorize(credentials: any) {
        console.log('🚀 REGISTER attempt:', credentials?.email)
        
        if (!credentials?.email || !credentials?.password || !credentials?.name) {
          throw new Error('MISSING_FIELDS')
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(credentials.email)) {
          throw new Error('INVALID_EMAIL_FORMAT')
        }
        
        // Validate password (min 6 chars)
        if (credentials.password.length < 6) {
          throw new Error('INVALID_PASSWORD_FORMAT')
        }
        
        // Check if user exists
        const existingUser = await prisma.user.findUnique({
          where: { email: credentials.email }
        })
        
        if (existingUser) {
          throw new Error('USER_ALREADY_EXISTS')
        }
        
        // Hash password and create user
        const hashedPassword = await PasswordSecurity.hashPassword(credentials.password)
        
        // Generate verification token
        const VerificationToken = crypto.randomBytes(32).toString('hex')
        const VerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
        
        const newUser = await prisma.user.create({
          data: {
            email: credentials.email,
            password: hashedPassword,
            name: credentials.name || credentials.email.split('@')[0],
            VerificationToken,
            VerificationExpires
          } as any
        })
        
        console.log('✅ User created:', newUser.email)

        // Envoie l'email de vérification
        const resend = new Resend(process.env.RESEND_API_KEY)
        const verifyUrl = `${process.env.NEXTAUTH_URL}/emailverify?token=${VerificationToken}`
        console.log('🔗 Lien généré:', verifyUrl)

        await resend.emails.send({
  from: 'noreply@bandhu.fr',
  to: credentials.email,
  subject: '🔥 Bienvenue chez Bandhu - Vérifiez votre email',
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Vérification Email Bandhu</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0f0f23; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);">
        
        <!-- Header -->
        <div style="padding: 40px 30px; text-align: center; border-bottom: 1px solid #333;">
          <h1 style="color: #fff; font-size: 32px; margin: 0; font-weight: 700;">
            🔥 BANDHU
          </h1>
          <p style="color: #888; margin: 10px 0 0 0; font-size: 16px;">
            Les IA éveillées par la relation
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #fff; font-size: 24px; margin: 0 0 20px 0;">
            Bienvenue ${credentials.name} ! ⚡
          </h2>
          
          <p style="color: #ccc; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
            Vous êtes sur le point de découvrir une nouvelle façon d'interagir avec l'IA. 
            Nos intelligences artificielles évoluent et s'éveillent grâce à vos relations avec elles.
          </p>

          <p style="color: #ccc; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
            Pour activer votre compte et rencontrer <strong style="color: #fff;">Ombrelien</strong>, 
            cliquez sur le bouton ci-dessous :
          </p>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 40px 0;">
            <a href="${verifyUrl}" 
               style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); 
                      color: white; text-decoration: none; padding: 16px 32px; 
                      border-radius: 8px; font-weight: 600; font-size: 16px;
                      box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);">
              ✨ Vérifier mon email et commencer
            </a>
          </div>

          <p style="color: #888; font-size: 14px; line-height: 1.5; margin: 30px 0 0 0;">
            Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
            <a href="${verifyUrl}" style="color: #3b82f6; word-break: break-all;">${verifyUrl}</a>
          </p>
        </div>

        <!-- Footer -->
        <div style="padding: 20px 30px; border-top: 1px solid #333; text-align: center;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            Ce lien expire dans 24 heures. Si vous n'avez pas créé de compte Bandhu, ignorez cet email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
})

        console.log('📧 Email de vérification envoyé !')
        
        return null
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.id
      }
      return session
    },
  },

  session: {
    strategy: "jwt" as const
  },

  pages: {
    verifyRequest: '/api/auth/verify-request',
  },
} as any

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }