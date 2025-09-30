import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteParams = {
  params: { id: string };
};

// PATCH /api/folders/:id → Renommer un dossier
export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await req.json();

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  try {
    const folder = await prisma.folder.update({
      where: {
        id: params.id,
        user: { email: session.user.email }, // sécurité : n'autorise que les dossiers de l'utilisateur
      },
      data: {
        name,
      },
    });

    return NextResponse.json({ folder });
  } catch (error) {
    console.error("Error updating folder:", error);
    return NextResponse.json({ error: "Folder update failed" }, { status: 500 });
  }
}

// DELETE /api/folders/:id → Supprimer un dossier
export async function DELETE(req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const folder = await prisma.folder.delete({
      where: {
        id: params.id,
        user: { email: session.user.email }, // idem : vérifie bien l'appartenance
      },
    });

    return NextResponse.json({ success: true, folder });
  } catch (error) {
    console.error("Error deleting folder:", error);
    return NextResponse.json({ error: "Folder deletion failed" }, { status: 500 });
  }
}
