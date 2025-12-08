import type { PDFStyle } from '@/utils/pdf/converter'  // Assure-toi que le type existe

const LIMITS_BY_STYLE: Record<PDFStyle, number> = {
  'design-color': 100,
  'design-bw': 100,
  'sobre-color': 200,     // si tu gardes sobre
  'sobre-bw': 200,        // si tu gardes sobre
  'minimal-bw': 1000,     // ← LIMITE HAUTE POUR MINIMAL
}

export interface PDFChunk {
  events: any[]
  partNumber: number
  totalParts: number
  startIndex: number
  endIndex: number
}

export function splitEventsForPDF(
  events: any[], 
  style: PDFStyle = 'design-color'
): PDFChunk[] {
  // Récupérer la limite pour ce style (fallback 100)
  const maxPerPDF = LIMITS_BY_STYLE[style] || 100
  
  console.log(`🔪 [SPLITTER] Style: ${style}, limite: ${maxPerPDF} messages/PDF`)
  
  const totalEvents = events.length
  const totalParts = Math.ceil(totalEvents / maxPerPDF)
  
  console.log(`🔪 [SPLITTER] ${totalEvents} messages → ${totalParts} PDF(s)`)
  
  if (totalParts === 1) {
    return [{
      events,
      partNumber: 1,
      totalParts: 1,
      startIndex: 1,
      endIndex: totalEvents
    }]
  }
  
  const chunks: PDFChunk[] = []
  
  for (let i = 0; i < totalParts; i++) {
    const start = i * maxPerPDF
    const end = Math.min(start + maxPerPDF, totalEvents)
    
    chunks.push({
      events: events.slice(start, end),
      partNumber: i + 1,
      totalParts,
      startIndex: start + 1,
      endIndex: end
    })
    
    console.log(`🔪 [SPLITTER] Chunk ${i + 1}: messages ${start + 1}-${end}`)
  }
  
  return chunks
}