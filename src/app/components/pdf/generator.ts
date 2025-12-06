import { convertMarkdownToPDF } from '@/utils/pdf/converter'
import type { PDFEvent, PDFOptions, PDFResult } from './types'

export async function generateReactPDF(
  events: PDFEvent[],
  options: PDFOptions = {}
): Promise<PDFResult> {
  const style = (options.style || 'design-color') as any
  
  console.log(`📄 Génération PDF depuis Markdown - style: ${style}, ${events.length} messages`)
  
  try {
    // 1. Générer le Markdown (utilise l'existant)
    const { generateStyledMarkdown } = await import('@/utils/exportStyles')
    
    // Convertir style PDF → style Markdown
    const markdownStyle = style.includes('sobre') ? 'sobre' : 'design'
    const markdown = await generateStyledMarkdown(events, markdownStyle, {
      includeTimestamps: options.includeTimestamps
    })

    console.log('🔍 [DEBUG] Markdown généré:')
console.log('Longueur:', markdown.length)
console.log('Premiers 300 caractères:', markdown.substring(0, 300))
console.log('Derniers 100 caractères:', markdown.substring(markdown.length - 100))
    
    // 2. Convertir Markdown → PDF avec notre nouveau convertisseur
    const pdfBuffer = await convertMarkdownToPDF(markdown, style, {
      includeTimestamps: options.includeTimestamps,
      title: `Bandhu Export - ${events.length} messages`
    })
    
    // 3. Retourner résultat
    return {
      content: pdfBuffer.toString('base64'),
      pageCount: Math.ceil(pdfBuffer.length / 5000), // Estimation
      estimatedSize: `${Math.round(pdfBuffer.length / 1024)}KB`
    }
    
  } catch (error) {
    console.error('❌ Erreur conversion Markdown → PDF:', error)
    throw new Error(`Échec génération PDF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
  }
}