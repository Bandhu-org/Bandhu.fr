import NextAuth from 'next-auth'
import { PrismaClient } from "@prisma/client"
import CredentialsProvider from 'next-auth/providers/credentials'
import EmailProvider from 'next-auth/providers/email'
import { PasswordSecurity } from '@/app/lib/password'
//import { sendVerificationEmail } from '@/lib/email'
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
        console.log('🔥 Données reçues:', credentials)

        if (!credentials?.email || !credentials?.password || !credentials?.name) {
          console.log('❌ Missing credentials')
          return null
          console.log('🔥 Credentials OK, checking existing user...')
        }
        
        // Find user
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })
        
        if (!user || !(user as any).password) {
          console.log('❌ User not found or no password')
          return null
        }

        // 🔥 TEMPORAIREMENT ON SKIP LA VERIF EMAIL
        if (!user.emailVerified) {
           throw new Error('Please verify your email before logging in')
         }
  
        // Verify password
        const isValid = await PasswordSecurity.verifyPassword(
          credentials.password, 
          (user as any).password
        )
        
        if (!isValid) {
          console.log('❌ Invalid password')
          return null
        }
        
        console.log('✅ Login success for:', user.email)
        return { id: user.id, email: user.email, name: (user as any).name }
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
        
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials')
          return null
        }
        
        // Check if user exists
        const existingUser = await prisma.user.findUnique({
          where: { email: credentials.email }
        })
        
        if (existingUser) {
          console.log('❌ User already exists')
          throw new Error('User already exists') // 🔥 Throw error au lieu de return null
        }
        
        // Hash password and create user
        const hashedPassword = await PasswordSecurity.hashPassword(credentials.password)
        
        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex')
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
        
        const newUser = await prisma.user.create({
          data: {
            email: credentials.email,
            password: hashedPassword,
            name: credentials.name || credentials.email.split('@')[0],
            //emailVerified: new Date(), // 🔥 Auto-vérifié pour l'instant
            verificationToken,
            verificationExpires
          } as any
        })
        
        console.log('✅ User created:', newUser.email)
        
        // TODO: Send verification email here later
        // console.log(`Verification token for ${credentials.email}: ${verificationToken}`)
        
        return { id: newUser.id, email: newUser.email, name: newUser.name }
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
    verifyRequest: '/auth/verify-request',
  },
} as any

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }