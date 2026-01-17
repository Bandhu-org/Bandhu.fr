import { PrismaClient } from "@prisma/client"
import CredentialsProvider from 'next-auth/providers/credentials'
import EmailProvider from 'next-auth/providers/email'
import { PasswordSecurity } from '@/app/lib/password'
import crypto from 'crypto'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { Resend } from 'resend'
import { NextAuthOptions } from "next-auth"

const prisma = new PrismaClient()

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) throw new Error('MISSING_FIELDS')
        const user = await prisma.user.findUnique({ where: { email: credentials.email } })
        if (!user) throw new Error('EMAIL_NOT_REGISTERED')
        if (!user.emailVerified) throw new Error('EMAIL_NOT_VERIFIED')
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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials?.name) throw new Error('MISSING_FIELDS')
        const existingUser = await prisma.user.findUnique({ where: { email: credentials.email } })
        if (existingUser) throw new Error('USER_ALREADY_EXISTS')
        
        const hashedPassword = await PasswordSecurity.hashPassword(credentials.password)
        const VerificationToken = crypto.randomBytes(32).toString('hex')
        const VerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)
        
        const newUser = await prisma.user.create({
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
    subject: '🔥 Bienvenue chez Bandhu - Vérifie ton email',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #a855f7;">Bienvenue sur Bandhu !</h1>
        <p style="font-size: 16px; line-height: 1.6;">
          Merci de t'être inscrit. Clique sur le bouton ci-dessous pour vérifier ton adresse email :
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" 
             style="background: linear-gradient(to right, #a855f7, #60a5fa); 
                    color: white; 
                    padding: 12px 30px; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    font-weight: bold;
                    display: inline-block;">
            Vérifier mon email
          </a>
        </div>
        <p style="font-size: 14px; color: #666;">
          Ou copie ce lien dans ton navigateur :<br>
          <a href="${verifyUrl}" style="color: #a855f7;">${verifyUrl}</a>
        </p>
        <p style="font-size: 12px; color: #999; margin-top: 30px;">
          Si tu n'as pas créé de compte, ignore cet email.
        </p>
      </div>
    `
})
        return null // Retourne null car l'utilisateur doit d'abord vérifier son mail
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }: any) {
      if (token && session.user) session.user.id = token.id
      return session
    },
  },
  session: { strategy: "jwt" },
  pages: { verifyRequest: '/api/auth/verify-request' },
  secret: process.env.NEXTAUTH_SECRET,
}