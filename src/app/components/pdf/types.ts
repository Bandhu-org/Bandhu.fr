import type { ExportStyle } from '@/utils/exportTemplates'

export interface PDFEvent {
  id: string
  content: string
  role: string
  createdAt: string
  threadId: string
  thread: {
    id: string
    label: string
  }
}

export interface PDFOptions {
  includeTimestamps?: boolean
  preview?: boolean
  style?: ExportStyle
}

export type PDFStyle = 'design-color' | 'design-bw' | 'sobre-color' | 'sobre-bw'

export interface PDFResult {
  content: string // base64
  pageCount: number
  estimatedSize: string
}