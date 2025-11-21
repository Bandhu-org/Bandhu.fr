import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

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
  try {
    // Créer un nouveau document PDF
    const pdfDoc = await PDFDocument.create()
    
    // Ajouter une page
    let page = pdfDoc.addPage()
    const { width, height } = page.getSize()
    
    // Charger les polices
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    
    // Configurer les styles
    const margin = 50
    let yPosition = height - margin
    const lineHeight = 20
    const titleSize = 16
    const textSize = 10
    const smallTextSize = 8
    
    // Titre
    page.drawText('Export de conversations Bandhu', {
      x: margin,
      y: yPosition,
      size: titleSize,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    })
    yPosition -= lineHeight * 2
    
    // Date de génération
    page.drawText(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, {
      x: margin,
      y: yPosition,
      size: smallTextSize,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    })
    yPosition -= lineHeight * 1.5
    
    // Séparateur
    page.drawLine({
      start: { x: margin, y: yPosition },
      end: { x: width - margin, y: yPosition },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    })
    yPosition -= lineHeight
    
    let currentThreadId: string | null = null
    
    // Parcourir les events
    for (const event of events) {
      // Vérifier si on doit changer de page
      if (yPosition < margin + 100) {
        const newPage = pdfDoc.addPage()
        page = newPage
        yPosition = height - margin
      }
      
      // Nouveau thread = nouvelle section
      if (event.threadId !== currentThreadId) {
        if (currentThreadId !== null) {
          yPosition -= lineHeight // Espace entre les threads
        }
        
        page.drawText(event.thread.label, {
          x: margin,
          y: yPosition,
          size: textSize + 2,
          font: boldFont,
          color: rgb(0.1, 0.3, 0.6),
        })
        yPosition -= lineHeight * 1.2
        
        currentThreadId = event.threadId
      }
      
      // Afficher le rôle (Vous/Assistant)
      const role = event.role === 'user' ? 'Vous' : 'Assistant'
      const roleColor = event.role === 'user' ? rgb(0.2, 0.5, 0.8) : rgb(0.8, 0.4, 0.1)
      
      page.drawText(`${role}:`, {
        x: margin,
        y: yPosition,
        size: textSize,
        font: boldFont,
        color: roleColor,
      })
      yPosition -= lineHeight
      
      // Afficher le contenu (nettoyer le texte pour PDF)
      const content = cleanTextForPDF(event.content)
      const maxWidth = width - (margin * 2)
      
      // Découper le texte si trop long
      const lines = splitTextIntoLines(content, font, textSize, maxWidth)
      
      for (const line of lines) {
        if (yPosition < margin + 20) {
          const newPage = pdfDoc.addPage()
          page = newPage
          yPosition = height - margin
        }
        
        page.drawText(line, {
          x: margin + 10, // Indentation
          y: yPosition,
          size: textSize,
          font: font,
          color: rgb(0.1, 0.1, 0.1),
        })
        yPosition -= lineHeight
      }
      
      // Timestamp optionnel
      if (options.includeTimestamps) {
        const timestamp = new Date(event.createdAt).toLocaleString('fr-FR')
        page.drawText(timestamp, {
          x: margin + 10,
          y: yPosition,
          size: smallTextSize,
          font: font,
          color: rgb(0.6, 0.6, 0.6),
        })
        yPosition -= lineHeight
      }
      
      yPosition -= lineHeight / 2 // Espace entre les messages
    }
    
    // Pied de page sur la dernière page
    const pages = pdfDoc.getPages()
    const lastPage = pages[pages.length - 1]
    lastPage.drawText(`Bandhu - ${events.length} messages exportés`, {
      x: margin,
      y: 30,
      size: smallTextSize,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    })
    
    // Sauvegarder le PDF
    const pdfBytes = await pdfDoc.save()
    
    return {
      content: Buffer.from(pdfBytes).toString('base64'),
      pageCount: pdfDoc.getPageCount(),
      estimatedSize: `${Math.round(pdfBytes.length / 1024)}KB`
    }
    
  } catch (error) {
    console.error('Erreur génération PDF:', error)
    // Fallback vers Markdown en cas d'erreur
    const markdownResult = await generateMarkdown(events, options)
    return {
      content: Buffer.from(markdownResult.content).toString('base64'), // ← CORRECTION ICI
      pageCount: markdownResult.pageCount,
      estimatedSize: markdownResult.estimatedSize
    }
  }
}

// Nettoyer le texte pour PDF (supprimer caractères non supportés)
function cleanTextForPDF(text: string): string {
  return text
    .replace(/\n/g, ' ') // Remplacer les sauts de ligne par des espaces
    .replace(/[^\x20-\x7E\u00C0-\u00FF]/g, '') // Garder seulement ASCII étendu
    .replace(/\s+/g, ' ') // Normaliser les espaces
    .trim()
}

// Fonction utilitaire pour découper le texte
function splitTextIntoLines(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const lines: string[] = []
  const words = text.split(' ')
  let currentLine = ''
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const width = font.widthOfTextAtSize(testLine, fontSize)
    
    if (width <= maxWidth) {
      currentLine = testLine
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    }
  }
  
  if (currentLine) lines.push(currentLine)
  return lines
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