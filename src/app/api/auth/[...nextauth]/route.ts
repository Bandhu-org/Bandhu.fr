import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials: any) {
        if (!credentials?.email) return null

        let user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user) {
          user = await prisma.user.create({
            data: {
              email: credentials.email
            }
          })
        }

        return { id: user.id, email: user.email }
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
    }
  },
  pages: {
    signIn: '/login' // ✅ Pour permettre redirect après signOut
  },
  session: {
    strategy: 'jwt'
  }
} as any

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
