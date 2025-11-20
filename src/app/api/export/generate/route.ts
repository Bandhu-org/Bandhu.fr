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
    const { format, selectedEvents, options = {} } = body

    console.log('🔄 Génération demandée:', { format, selectedEventsCount: selectedEvents?.length })

    // Validation
    if (!format || !selectedEvents || !Array.isArray(selectedEvents)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Format ou sélection invalide'
      }), { status: 400 })
    }

    // Récupérer les events sélectionnés avec leurs threads
    const events = await prisma.event.findMany({
      where: {
        id: { in: selectedEvents },
        user: { email: session.user.email }
      },
      include: {
        thread: true
      },
      orderBy: { createdAt: 'asc' }
    })

    if (events.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Aucun événement sélectionné'
      }), { status: 400 })
    }

    console.log(`📝 ${events.length} events à exporter`)

    // Router vers le bon générateur
    let result
    switch (format) {
      case 'markdown':
        result = await generateMarkdown(events, options)
        break
      case 'pdf':
        result = await generatePDF(events, options)
        break
      case 'docx':
        result = await generateDOCX(events, options)
        break
      default:
        return new Response(JSON.stringify({
          success: false,
          error: 'Format non supporté'
        }), { status: 400 })
    }

    return new Response(JSON.stringify({
      success: true,
      format,
      content: result.content,
      metadata: {
        eventCount: events.length,
        pageCount: result.pageCount,
        estimatedSize: result.estimatedSize,
        generatedAt: new Date().toISOString()
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Erreur génération:', error)
    return new Response(JSON.stringify({
      success: false,
      error: 'Erreur lors de la génération'
    }), { status: 500 })
  }
}

// ============================================================================
// GÉNÉRATEURS
// ============================================================================

// 🎯 GÉNÉRATEUR MARKDOWN (le plus simple)
async function generateMarkdown(events: any[], options: any) {
  let markdown = `# Export de conversations\n\n`
  markdown += `*Généré le ${new Date().toLocaleDateString('fr-FR')}*\n\n`
  markdown += `---\n\n`

  let currentThreadId: string | null = null

  events.forEach(event => {
    // Nouvelle section pour chaque thread
    if (event.threadId !== currentThreadId) {
      if (currentThreadId !== null) {
        markdown += '\n---\n\n'
      }
      markdown += `## ${event.thread.label}\n\n`
      currentThreadId = event.threadId
    }

    // Ajouter le message
    const timestamp = options.includeTimestamps 
      ? ` *(${new Date(event.createdAt).toLocaleString('fr-FR')})*` 
      : ''

    const prefix = event.role === 'user' ? '**Vous**' : '**Assistant**'
    markdown += `${prefix}: ${event.content}${timestamp}\n\n`
  })

  const estimatedSize = `${Math.round(Buffer.byteLength(markdown, 'utf8') / 1024)}KB`
  const pageCount = Math.ceil(markdown.length / 2000) // Estimation grossière

  return {
    content: markdown,
    pageCount,
    estimatedSize
  }
}

// 📄 GÉNÉRATEUR PDF (placeholder pour l'instant)
async function generatePDF(events: any[], options: any) {
  // Pour l'instant, on retourne du markdown
  // On implémentera pdf-lib après
  const markdownResult = await generateMarkdown(events, options)
  return {
    content: `PDF_PLACEHOLDER:${btoa(markdownResult.content)}`,
    pageCount: markdownResult.pageCount,
    estimatedSize: markdownResult.estimatedSize
  }
}

// 📝 GÉNÉRATEUR DOCX (placeholder pour l'instant)
async function generateDOCX(events: any[], options: any) {
  const markdownResult = await generateMarkdown(events, options)
  return {
    content: `DOCX_PLACEHOLDER:${btoa(markdownResult.content)}`,
    pageCount: markdownResult.pageCount,
    estimatedSize: markdownResult.estimatedSize
  }
}