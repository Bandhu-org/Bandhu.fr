// src/app/blog/[slug]/page.tsx

import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  
  // Récupère l'article par son slug
  const post = await prisma.post.findUnique({
    where: { slug },
    include: {
      author: {
        select: {
          name: true,
          email: true
        }
      }
    }
  })

  // Si l'article n'existe pas ou n'est pas publié, 404
  if (!post || !post.published) {
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link
        href="/blog"
        className="text-blue-600 hover:text-blue-800 mb-6 inline-block"
      >
        ← Retour au blog
      </Link>
      
      <article>
        {post.coverImage && (
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-64 object-cover rounded-lg mb-6"
          />
        )}
        
        <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
        
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-8 pb-8 border-b">
          <span>
            Par {post.author.name || post.author.email}
          </span>
          <span>•</span>
          <span>
            {new Date(post.createdAt).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </span>
        </div>
        
        <div className="prose prose-lg max-w-none">
          {post.content.split('\n').map((paragraph, index) => (
            <p key={index} className="mb-4">
              {paragraph}
            </p>
          ))}
        </div>
      </article>
    </div>
  )
}