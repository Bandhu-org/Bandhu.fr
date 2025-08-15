import NextAuth from 'next-auth'
import { PrismaClient } from "@prisma/client"
import CredentialsProvider from 'next-auth/providers/credentials'
import { PasswordSecurity } from '@/app/lib/password'

const prisma = new PrismaClient()

export const authOptions = {
  providers: [
    // LOGIN PROVIDER
    CredentialsProvider({
      id: 'login',
      name: 'Login',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials: any) {
        if (!credentials?.email || !credentials?.password) return null
        
        // Find user
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })
        
        if (!user || !(user as any).password) return null
        
        // Verify password
        const isValid = await PasswordSecurity.verifyPassword(
          credentials.password, 
          (user as any).password
        )
        
        if (!isValid) return null
        
        return { id: user.id, email: user.email, name: (user as any).name }
      }
    }),

    // REGISTER PROVIDER
    CredentialsProvider({
      id: 'register',
      name: 'Register',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        name: { label: "Name", type: "text" }
      },
      async authorize(credentials: any) {
        if (!credentials?.email || !credentials?.password) return null
        
        // Check if user exists
        const existingUser = await prisma.user.findUnique({
          where: { email: credentials.email }
        })
        
        if (existingUser) return null // User already exists
        
        // Hash password and create user
        const hashedPassword = await PasswordSecurity.hashPassword(credentials.password)
        
        const newUser = await prisma.user.create({
          data: {
            email: credentials.email,
            password: hashedPassword,
            name: credentials.name || credentials.email.split('@')[0]
          }
        })
        
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
} as any

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }