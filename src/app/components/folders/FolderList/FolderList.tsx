'use client'

import React, { useEffect, useState } from 'react'

interface Folder {
  id: string
  name: string
  createdAt: string
}

export const FolderList = () => {
  const [folders, setFolders] = useState<Folder[]>([])

  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const res = await fetch('/api/folder')
        const data = await res.json()
        console.log("Dossiers reçus :", data.folders)
        setFolders(data.folders || [])
      } catch (error) {
        console.error('Erreur lors du fetch des dossiers', error)
      }
    }
     
    fetchFolders()
  }, [])

  return (
    <div className="space-y-2">
      {folders.map((folder) => (
        <div key={folder.id} className="text-white px-2">
          📁 {folder.name}
        </div>
      ))}
    </div>
  )
}

