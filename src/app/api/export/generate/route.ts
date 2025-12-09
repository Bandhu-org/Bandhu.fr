import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'
import { generateStyledMarkdown } from '@/utils/exportStyles'
import type { ExportStyle } from '@/utils/exportTemplates'
import { splitEventsForPDF } from '@/utils/pdf/splitter'
import JSZip from 'jszip'
import { generateChatHTML } from '@/utils/exportStyles/html-generator'
import { convertHTMLToPDF } from '@/utils/pdf/converter'
import { generateChatHTMLForPDF } from '@/utils/exportStyles/pdf-html-generator'
import { generateChatHTMLForPDF_BW } from '@/utils/exportStyles/bw-pdf-html-generator'
import type { PDFStyle } from '@/utils/pdf/converter'
import { generateMinimalPDFHTML } from '@/utils/exportStyles/minimal-pdf-generator'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return new Response('Non authentifié', { status: 401 })
    }

    const body = await request.json()
    const { format, selectedEvents, options = {} } = body
    const style: PDFStyle = (options.style as PDFStyle) || 'design-color'

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

    // Récupérer les events sélectionnés (LIMITÉ À 100)
const events = await prisma.event.findMany({
  where: {
    id: { in: selectedEvents.slice(0, 100) }, // Limite à 100 IDs
    user: { email: session.user.email }
  },
  include: {
    thread: {
      select: { id: true, label: true }
    }
  },
  orderBy: { createdAt: 'asc' },
  take: 100 // Sécurité supplémentaire
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
  // Convertir PDFStyle en ExportStyle
  let markdownStyle: ExportStyle
  
  if (style === 'design-bw') {
    markdownStyle = 'sobre'  // BW → sobre
  } else if (style === 'design-color') {
    markdownStyle = 'design'  // design-color → design
  } else if (style === 'sobre-color' || style === 'sobre-bw') {
    markdownStyle = 'sobre'   // sobre-* → sobre
  } else {
    markdownStyle = 'design'  // fallback
  }
  
  result = await generateMarkdown(events, options, markdownStyle)
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

// 📄 GÉNÉRATEUR PDF (SIMPLE - MAX 100 MESSAGES)
async function generatePDF(
  events: any[], 
  options: any, 
  style: PDFStyle
): Promise<{ content: string; pageCount: number; estimatedSize: string }> {
  
  // Fonction helper pour convertir PDFStyle → ExportStyle
  function convertToExportStyle(pdfStyle: PDFStyle): ExportStyle {
    switch (pdfStyle) {
      case 'design-color': return 'design'
      case 'design-bw': return 'sobre'
      case 'sobre-color': return 'sobre'
      case 'sobre-bw': return 'sobre'
      case 'minimal-bw': return 'sobre'
      default: return 'design'
    }
  }
  
  try {
    console.log(`📄 Génération PDF unique (max 100 messages), style: ${style}`)
    
    // Vérifier la limite
    if (events.length > 100) {
      console.warn(`⚠️ Limite dépassée: ${events.length} messages, troncation à 100`)
      events = events.slice(0, 100)
    }
    
    console.log(`📝 ${events.length} messages à convertir en PDF`)
    
    // Générer l'HTML selon le style
    let html: string
    
    if (style === 'design-bw') {
      html = await generateChatHTMLForPDF_BW(events, {
        style: 'sobre',
        includeTimestamps: options.includeTimestamps || false,
        title: options.title || 'Conversation Bandhu'
      })
    } else if (style === 'minimal-bw') {
      html = await generateMinimalPDFHTML(events, {
        includeTimestamps: options.includeTimestamps || false,
        includeThreadHeaders: true,
        title: options.title || 'Conversation Bandhu'
      })
    } else {
      html = await generateChatHTMLForPDF(events, {
        style: convertToExportStyle(style),
        includeTimestamps: options.includeTimestamps || false,
        title: options.title || 'Conversation Bandhu'
      })
    }
    
    console.log('✅ HTML généré:', html.length, 'caractères')
    
    // Convertir HTML → PDF
    const pdfBuffer = await convertHTMLToPDF(
      html, 
      style as any,
      { includeTimestamps: options.includeTimestamps }
    )
    
    console.log('✅ PDF généré:', pdfBuffer.length, 'bytes')
    
    // Estimer le nombre de pages (environ 15 messages par page)
    const pageCount = Math.ceil(events.length / 15)
    
    return {
      content: pdfBuffer.toString('base64'),
      pageCount,
      estimatedSize: `${Math.round(pdfBuffer.length / 1024)}KB`
    }
    
  } catch (error) {
    console.error('❌ Erreur génération PDF:', error)
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