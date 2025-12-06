import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'
import { generateStyledMarkdown } from '@/utils/exportStyles'
import type { ExportStyle } from '@/utils/exportTemplates'
import { generateReactPDF } from '@/app/components/pdf/generator'
import { splitEventsForPDF } from '@/utils/pdf/splitter'
import JSZip from 'jszip'
import { generateChatHTML } from '@/utils/exportStyles/html-generator'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return new Response('Non authentifié', { status: 401 })
    }

    const body = await request.json()
    const { format, selectedEvents, options = {} } = body
    const style: ExportStyle = options.style || 'design-color'

    console.log('🔄 Génération demandée:', { 
      format, 
      style,
      selectedEventsCount: selectedEvents?.length 
    })

    // Validation
    if (!format || !selectedEvents || !Array.isArray(selectedEvents)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Format ou sélection invalide'
      }), { status: 400 })
    }

    // Récupérer les events sélectionnés avec leurs threads (OPTIMISÉ)
    const events = await prisma.event.findMany({
  where: {
    id: { in: selectedEvents }, // ← Enlève slice(0, 100)
    user: { email: session.user.email }
  },
  include: {
    thread: {
      select: { id: true, label: true }
    }
  },
  orderBy: { createdAt: 'asc' }
  // ← Enlève take: 100
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
    result = await generateMarkdown(events, options, style)
    break
  case 'pdf':
    result = await generatePDF(events, options, style)
    break
  case 'docx':
    result = await generateDOCX(events, options)
    break
  case 'html':  // ← AJOUTE
    result = await generateHTML(events, options)
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
// GÉNÉRATEURS (le reste du code reste identique)
// ============================================================================

// 🎯 GÉNÉRATEUR MARKDOWN (avec support des styles)
async function generateMarkdown(events: any[], options: any, style: ExportStyle) {
  // Utiliser le générateur de style
  const markdown = await generateStyledMarkdown(events, style, {
    includeTimestamps: options.includeTimestamps,
    preview: options.preview
  })

  const estimatedSize = `${Math.round(Buffer.byteLength(markdown, 'utf8') / 1024)}KB`
  const pageCount = Math.ceil(markdown.length / 2000) // Estimation grossière

  return {
    content: markdown,
    pageCount,
    estimatedSize
  }
}

// 📄 GÉNÉRATEUR PDF (React-PDF)
async function generatePDF(
  events: any[], 
  options: any, 
  style: ExportStyle
): Promise<{ content: string; pageCount: number; estimatedSize: string }> {
  try {
    console.log(`📄 Génération PDF avec style: ${style}`)
    
    // Split en chunks si > 200 messages
    const chunks = splitEventsForPDF(events)
    
    if (chunks.length === 1) {
      // Un seul PDF
      const result = await generateReactPDF(chunks[0].events, { 
        ...options, 
        style 
      })
      
      return {
        content: result.content,
        pageCount: result.pageCount,
        estimatedSize: result.estimatedSize
      }
      
    } else {
  // Multiple PDFs → ZIP
  console.log(`📦 ${chunks.length} PDFs à générer`)
  
  const pdfs = await Promise.all(
    chunks.map(chunk => {
      console.log(`🔧 Génération chunk ${chunk.partNumber}/${chunk.totalParts}`)
      console.log(`📊 Events: ${chunk.events.length}`)
      return generateReactPDF(chunk.events, {
        ...options,
        style,
        partNumber: chunk.partNumber,
        totalParts: chunk.totalParts,
        startIndex: chunk.startIndex,
        endIndex: chunk.endIndex
      })
    })
  )
  
  console.log(`✅ ${pdfs.length} PDFs générés`)
  
  // Créer ZIP
  const zip = new JSZip()
  
  chunks.forEach((chunk, index) => {
    const filename = `conversation-partie-${chunk.partNumber}-sur-${chunk.totalParts}.pdf`
    const pdfBuffer = Buffer.from(pdfs[index].content, 'base64')
    console.log(`📦 Ajout au ZIP: ${filename} (${pdfBuffer.length} bytes)`)
    zip.file(filename, pdfBuffer)
  })
  
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
  console.log(`✅ ZIP généré: ${zipBuffer.length} bytes`)
  console.log(`🔍 ZIP signature: ${zipBuffer.toString('base64').substring(0, 10)}`)
  
  return {
    content: zipBuffer.toString('base64'),
    pageCount: pdfs.reduce((sum, pdf) => sum + pdf.pageCount, 0),
    estimatedSize: `${Math.round(zipBuffer.length / 1024)}KB`
  }
}
    
  } catch (error) {
    console.error('❌ Erreur génération PDF (React-PDF):', error)
    throw new Error(`Échec génération PDF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
  }
}

// 📝 GÉNÉRATEUR DOCX
async function generateDOCX(events: any[], options: any) {
  try {
    console.log('🔄 Début génération DOCX...')

    // Préparer les sections du document
    const sections = [
      {
        properties: {},
        children: [
          // Titre principal
          new Paragraph({
            text: "Export de conversations Bandhu",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),

          // Date de génération
          new Paragraph({
            children: [
              new TextRun({
                text: `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
                color: "666666",
                size: 20
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 }
          }),

          // Ligne séparatrice
          new Paragraph({
            children: [
              new TextRun({
                text: "―".repeat(50),
                color: "CCCCCC",
                size: 16
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          })
        ]
      }
    ]

    let currentThreadId: string | null = null

    // Parcourir les events
    for (const event of events) {
      // Nouvelle section pour chaque thread
      if (event.threadId !== currentThreadId) {
        if (currentThreadId !== null) {
          // Espace entre les threads
          sections[0].children.push(
            new Paragraph({
              text: "",
              spacing: { after: 200 }
            })
          )
        }

        // Titre du thread
        sections[0].children.push(
          new Paragraph({
            text: event.thread.label,
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 }
          })
        )

        currentThreadId = event.threadId
      }

      // Message utilisateur/assistant
      const role = event.role === 'user' ? 'Vous' : 'Assistant'
      const roleColor = event.role === 'user' ? '2E5C8A' : '8A4B2E'

      sections[0].children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${role}: `,
              bold: true,
              color: roleColor,
              size: 22
            }),
            new TextRun({
              text: event.content,
              size: 20
            })
          ],
          spacing: { after: 150 }
        })
      )

      // Timestamp optionnel
      if (options.includeTimestamps) {
        const timestamp = new Date(event.createdAt).toLocaleString('fr-FR')
        sections[0].children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: timestamp,
                color: "888888",
                italics: true,
                size: 16
              })
            ],
            indent: { left: 400 },
            spacing: { after: 200 }
          })
        )
      }
    }

    // Pied de page
    sections[0].children.push(
      new Paragraph({
        text: "",
        spacing: { after: 400 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "―".repeat(50),
            color: "CCCCCC",
            size: 16
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Bandhu - ${events.length} messages exportés`,
            color: "666666",
            size: 16
          })
        ],
        alignment: AlignmentType.CENTER
      })
    )

    // Créer le document
    const doc = new Document({
      sections: sections,
      styles: {
        paragraphStyles: [
          {
            id: "Normal",
            name: "Normal",
            basedOn: "Normal",
            next: "Normal",
            run: {
              size: 20,
              font: "Calibri"
            },
            paragraph: {
              spacing: { line: 276 }
            }
          }
        ]
      }
    })

    // Générer le fichier DOCX
    const buffer = await Packer.toBuffer(doc)

    console.log('✅ DOCX généré avec succès:', {
      bytes: buffer.length,
      events: events.length
    })

    return {
      content: buffer.toString('base64'),
      pageCount: Math.ceil(events.length / 10), // Estimation
      estimatedSize: `${Math.round(buffer.length / 1024)}KB`
    }

  } catch (error) {
    console.error('❌ Erreur génération DOCX:', error)
    // Fallback vers Markdown
    const markdownResult = await generateMarkdown(events, options, 'sobre')
    return {
      content: `DOCX_PLACEHOLDER:${Buffer.from(markdownResult.content).toString('base64')}`,
      pageCount: markdownResult.pageCount,
      estimatedSize: markdownResult.estimatedSize
    }
  }
}

// 🌐 GÉNÉRATEUR HTML
async function generateHTML(events: any[], options: any) {
  try {
    console.log('🔄 Début génération HTML...')
    
    const html = await generateChatHTML(events, {
      style: options.style === 'sobre' ? 'sobre' : 'design',
      includeTimestamps: options.includeTimestamps
    })
    
    console.log('✅ HTML généré:', html.length, 'caractères')
    
    return {
      content: html,
      pageCount: 1,
      estimatedSize: `${Math.round(Buffer.byteLength(html, 'utf8') / 1024)}KB`
    }
  } catch (error) {
    console.error('❌ Erreur génération HTML:', error)
    throw error
  }
}