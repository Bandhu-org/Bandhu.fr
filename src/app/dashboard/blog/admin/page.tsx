'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Post {
  id: string
  title: string
  slug: string
  published: boolean
  createdAt: string
}

export default function BlogAdminPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/blog/posts')
      if (response.ok) {
        const data = await response.json()
        setPosts(data)
      }
    } catch (error) {
      console.error('Erreur chargement posts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet article ?')) return

    try {
      const response = await fetch(`/api/blog/posts/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchPosts() // Recharge la liste
      } else {
        alert('Erreur lors de la suppression')
      }
    } catch (error) {
      console.error(error)
      alert('Erreur lors de la suppression')
    }
  }

  if (isLoading) {
    return <div className="p-6">Chargement...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Articles du blog</h1>
        <Link
          href="/dashboard/blog/admin/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          Nouvel article
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          Aucun article. Créez-en un !
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Titre</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Slug</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Statut</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {posts.map((post) => (
                <tr key={post.id}>
                  <td className="px-6 py-4">{post.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{post.slug}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      post.published 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {post.published ? 'Publié' : 'Brouillon'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(post.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      className="text-blue-600 hover:text-blue-800 mr-4"
                    >
                      Voir
                    </Link>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}