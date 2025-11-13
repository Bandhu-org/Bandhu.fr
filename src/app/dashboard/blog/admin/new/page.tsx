// src/app/blog/admin/new/page.tsx

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function NewPostPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    coverImage: '',
    published: false
  })

  // Auto-génère le slug depuis le titre
  const handleTitleChange = (title: string) => {
    setFormData({
      ...formData,
      title,
      slug: title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/blog/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        router.push('/dashboard/blog/admin')
      } else {
        alert('Erreur lors de la création')
      }
    } catch (error) {
      console.error(error)
      alert('Erreur lors de la création')
    } finally {
      setIsLoading(false)
    }
  }

  if (!session) {
    return <div className="p-6">Chargement...</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Nouvel article</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Titre</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Slug (URL)</label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            URL : /blog/{formData.slug || 'mon-article'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Extrait</label>
          <textarea
            value={formData.excerpt}
            onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg h-24"
            placeholder="Court résumé de l'article..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Contenu</label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg h-64"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Image de couverture (URL)</label>
          <input
            type="url"
            value={formData.coverImage}
            onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="https://..."
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="published"
            checked={formData.published}
            onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
            className="mr-2"
          />
          <label htmlFor="published" className="text-sm font-medium">
            Publier immédiatement
          </label>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
          >
            {isLoading ? 'Création...' : 'Créer l\'article'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/blog/admin')}
            className="bg-gray-200 hover:bg-gray-300 px-6 py-2 rounded-lg"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}