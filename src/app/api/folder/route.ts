import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/options"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json([], { status: 401 })
  }

  const folders = await prisma.folder.findMany({
    where: { user: { email: session.user.email } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(folders)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { name } = await req.json()

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Nom invalide" }, { status: 400 })
  }

  const folder = await prisma.folder.create({
    data: {
      name,
      user: { connect: { email: session.user.email } },
    },
  })

  return NextResponse.json({ folder })

}
