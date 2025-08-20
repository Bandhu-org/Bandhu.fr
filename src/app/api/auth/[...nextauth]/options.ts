import { PrismaClient } from '@prisma/client'
import { PrismaAdapter } from '@auth/prisma-adapter'
import EmailProvider from 'next-auth/providers/email'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PasswordSecurity } from '@/app/lib/password'
import { Resend } from 'resend'
import crypto from 'crypto'
import type { SessionStrategy } from "next-auth"

const prisma = new PrismaClient()

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      from: 'noreply@bandhu.fr',
      sendVerificationRequest: async ({ identifier: email, url, token }) => {
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: 'noreply@bandhu.fr',
          to: email,
          subject: '🔥 Ton lien de connexion Bandhu !',
          html: `<a href="${url}">Clique ici pour te connecter</a>`
        })
      },
    }),
    CredentialsProvider({
      id: 'login',
      name: 'Login',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials: any) {
        if (!credentials?.email || !credentials?.password) throw new Error('MISSING_FIELDS')

        const user = await prisma.user.findUnique({ where: { email: credentials.email } })
        if (!user || !user.emailVerified) throw new Error('INVALID_USER')

        const isValid = await PasswordSecurity.verifyPassword(credentials.password, user.password)
        if (!isValid) throw new Error('INVALID_PASSWORD')

        return { id: user.id, email: user.email, name: user.name }
      }
    }),
    CredentialsProvider({
      id: 'register',
      name: 'Register',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        name: { label: "Name", type: "text" }
      },
      async authorize(credentials: any) {
        if (!credentials?.email || !credentials?.password || !credentials?.name) {
          throw new Error('MISSING_FIELDS')
        }

        const existingUser = await prisma.user.findUnique({ where: { email: credentials.email } })
        if (existingUser) throw new Error('USER_ALREADY_EXISTS')

        const hashedPassword = await PasswordSecurity.hashPassword(credentials.password)
        const VerificationToken = crypto.randomBytes(32).toString('hex')
        const VerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)

        await prisma.user.create({
          data: {
            email: credentials.email,
            password: hashedPassword,
            name: credentials.name,
            VerificationToken,
            VerificationExpires
          } as any
        })

        const resend = new Resend(process.env.RESEND_API_KEY)
        const verifyUrl = `${process.env.NEXTAUTH_URL}/emailverify?token=${VerificationToken}`

        await resend.emails.send({
          from: 'noreply@bandhu.fr',
          to: credentials.email,
          subject: '🔥 Bienvenue chez Bandhu - Vérifiez votre email',
          html: `<a href="${verifyUrl}">Clique ici pour vérifier ton compte</a>`
        })

        return null
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }: any) {
      if (token) session.user.id = token.id
      return session
    }
  },
  

session: {
  strategy: "jwt" as SessionStrategy
},
  pages: {
    verifyRequest: '/api/auth/verify-request'
  }
}
