// Minimal PDF Generator - Orchestrator
// Combines markdown generation + HTML template

import { generateMinimalMarkdown } from './minimal-markdown-generator'
import { generateMinimalHTML } from './minimal-html-generator'

interface Event {
  id: string
  content: string
  role: 'user' | 'assistant'
  createdAt: string
  threadId: string
  thread: {
    id: string
    label: string
  }
}

interface PDFGeneratorOptions {
  includeTimestamps?: boolean
  includeThreadHeaders?: boolean
  title?: string
}

/**
 * Main orchestrator for minimal BW PDF generation
 */
export async function generateMinimalPDFHTML(
  events: Event[],
  options: PDFGeneratorOptions = {}
): Promise<string> {
  console.log('📄 [MINIMAL PDF] Generating for', events.length, 'events')
  
  // 1. Generate plain text markdown
  const plainText = await generateMinimalMarkdown(events, {
    includeTimestamps: options.includeTimestamps ?? true,
    includeThreadHeaders: options.includeThreadHeaders ?? true
  })
  
  console.log('✅ [MINIMAL PDF] Plain text generated:', plainText.length, 'chars')
  
  // 2. Wrap in minimal HTML template
  const html = await generateMinimalHTML(plainText, {
    includeTimestamps: options.includeTimestamps,
    title: options.title
  })
  
  console.log('✅ [MINIMAL PDF] HTML generated:', html.length, 'chars')
  
  return html
}