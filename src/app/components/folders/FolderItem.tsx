'use client'

import { Folder } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  folder: {
    id: string
    name: string
    _count: { conversations: number }
  }
}

export function FolderItem({ folder }: Props) {
  return (
    <button
      className={cn(
        "flex w-full items-center justify-between px-3 py-2 rounded-md hover:bg-muted text-sm"
      )}
    >
      <div className="flex items-center gap-2">
        <Folder className="h-4 w-4" />
        <span>{folder.name}</span>
      </div>
      <span className="text-muted-foreground text-xs">{folder._count.conversations}</span>
    </button>
  )
}
