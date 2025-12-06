const MAX_MESSAGES_PER_PDF = 200

export interface PDFChunk {
  events: any[]
  partNumber: number
  totalParts: number
  startIndex: number
  endIndex: number
}

export function splitEventsForPDF(events: any[]): PDFChunk[] {
  const totalEvents = events.length
  const totalParts = Math.ceil(totalEvents / MAX_MESSAGES_PER_PDF)
  
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
    const start = i * MAX_MESSAGES_PER_PDF
    const end = Math.min(start + MAX_MESSAGES_PER_PDF, totalEvents)
    
    chunks.push({
      events: events.slice(start, end),
      partNumber: i + 1,
      totalParts,
      startIndex: start + 1,
      endIndex: end
    })
  }
  
  return chunks
}