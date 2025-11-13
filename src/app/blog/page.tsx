import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function BlogPage() {
  // Récupère uniquement les articles publiés
  const posts = await prisma.post.findMany({
    where: { published: true },
    orderBy: { createdAt: 'desc' },
    include: {
      author: {
        select: {
          name: true,
          email: true
        }
      }
    }
  })

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-8">Blog</h1>
      
      {posts.length === 0 ? (
        <p className="text-gray-500">Aucun article publié pour le moment.</p>
      ) : (
        <div className="space-y-8">
          {posts.map((post) => (
            <article key={post.id} className="bg-white rounded-lg shadow p-6">
              {post.coverImage && (
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}
              
              <Link href={`/blog/${post.slug}`}>
                <h2 className="text-2xl font-bold mb-2 hover:text-blue-600">
                  {post.title}
                </h2>
              </Link>
              
              {post.excerpt && (
                <p className="text-gray-600 mb-4">{post.excerpt}</p>
              )}
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>
                  Par {post.author.name || post.author.email}
                </span>
                <span>
                  {new Date(post.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
              
              <Link
                href={`/blog/${post.slug}`}
                className="inline-block mt-4 text-blue-600 hover:text-blue-800"
              >
                Lire la suite →
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}