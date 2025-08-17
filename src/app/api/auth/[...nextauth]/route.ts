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
          subject: '🔥 Vérifie ton email Bandhu !',
          html: `<a href="${verifyUrl}">Clique ici pour vérifier ton email</a>`
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