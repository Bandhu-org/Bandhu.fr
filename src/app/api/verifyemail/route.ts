import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { token } = await request.json()
    
    const user = await prisma.user.findFirst({
      where: {
        VerificationToken: token,
        VerificationExpires: { gt: new Date() }
      }
    })
    
    if (!user) {
      return NextResponse.json({ success: false })
    }
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        VerificationToken: null,
        VerificationExpires: null
      }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false })
  }
}