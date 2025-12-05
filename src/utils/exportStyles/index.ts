import { generateDesignMarkdown } from './designMarkdown'
import { generateSobreMarkdown } from './sobreMarkdown'
import type { ExportStyle } from '../exportTemplates'

// Interface commune pour tous les générateurs
interface Event {
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

interface GeneratorOptions {
  includeTimestamps?: boolean
  preview?: boolean
}

// Type du générateur
type StyleGenerator = (events: Event[], options: GeneratorOptions) => Promise<string>

// Map des générateurs par style
const MARKDOWN_GENERATORS: Record<ExportStyle, StyleGenerator> = {
  'design': generateDesignMarkdown,
  'sobre': generateSobreMarkdown,
}

// Fonction principale pour générer du Markdown stylé
export async function generateStyledMarkdown(
  events: Event[],
  style: ExportStyle,
  options: GeneratorOptions = {}
): Promise<string> {
  const generator = MARKDOWN_GENERATORS[style]
  
  if (!generator) {
    throw new Error(`Style ${style} not implemented`)
  }
  
  return generator(events, options)
}