import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return new Response('Non authentifié', { status: 401 })
    }

    const body = await request.json()
    const { format, content, filename, options = {} } = body

    console.log('📥 Téléchargement demandé:', { format, filename })

    // Validation
    if (!format || !content) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Format ou contenu manquant'
      }), { status: 400 })
    }

    let fileContent: string | ArrayBuffer
    let contentType: string
    let fileExtension: string
    let finalFilename: string

    // Préparer le fichier selon le format
    switch (format) {
      case 'markdown':
        fileContent = content // Déjà en string
        contentType = 'text/markdown; charset=utf-8'
        fileExtension = 'md'
        finalFilename = filename || `conversations-${new Date().toISOString().split('T')[0]}.md`
        break

      case 'pdf':
        // Pour l'instant, on gère le placeholder
        if (content.startsWith('PDF_PLACEHOLDER:')) {
          const markdownContent = atob(content.replace('PDF_PLACEHOLDER:', ''))
          fileContent = markdownContent
          contentType = 'text/markdown; charset=utf-8' // Temporaire
          fileExtension = 'md'
        } else {
          // Pour les vrais PDF plus tard
          fileContent = content
          contentType = 'application/pdf'
          fileExtension = 'pdf'
        }
        finalFilename = filename || `conversations-${new Date().toISOString().split('T')[0]}.${fileExtension}`
        break

      case 'docx':
        // Pour l'instant, on gère le placeholder  
        if (content.startsWith('DOCX_PLACEHOLDER:')) {
          const markdownContent = atob(content.replace('DOCX_PLACEHOLDER:', ''))
          fileContent = markdownContent
          contentType = 'text/markdown; charset=utf-8' // Temporaire
          fileExtension = 'md'
        } else {
          fileContent = content
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          fileExtension = 'docx'
        }
        finalFilename = filename || `conversations-${new Date().toISOString().split('T')[0]}.${fileExtension}`
        break

      default:
        return new Response(JSON.stringify({
          success: false,
          error: 'Format non supporté'
        }), { status: 400 })
    }

    // Headers pour le téléchargement
    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set('Content-Disposition', `attachment; filename="${finalFilename}"`)
    headers.set('Cache-Control', 'no-cache')

    // Pour markdown, on peut directement retourner la string
    if (typeof fileContent === 'string') {
      headers.set('Content-Length', Buffer.byteLength(fileContent, 'utf8').toString())
      return new Response(fileContent, { headers, status: 200 })
    }

    // Pour les binaires plus tard (PDF, DOCX)
    return new Response(fileContent, { headers, status: 200 })

  } catch (error) {
    console.error('❌ Erreur téléchargement:', error)
    return new Response(JSON.stringify({
      success: false,
      error: 'Erreur lors du téléchargement'
    }), { status: 500 })
  }
}