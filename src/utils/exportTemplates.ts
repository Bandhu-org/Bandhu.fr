// Export Templates - Définitions des styles d'export

export type ExportStyle = 'design' | 'sobre'

export interface ExportTemplate {
  id: ExportStyle
  name: string
  description: string
  icon: string
}

export const EXPORT_TEMPLATES: Record<ExportStyle, ExportTemplate> = {
  'design': {
    id: 'design',
    name: 'Design',
    description: 'Style Bandhu riche avec emojis et couleurs',
    icon: '🌌'
  },
  'sobre': {
    id: 'sobre',
    name: 'Sobre',
    description: 'Style professionnel minimaliste',
    icon: '📄'
  }
}

// Helper pour obtenir un template
export const getTemplate = (style: ExportStyle): ExportTemplate => {
  return EXPORT_TEMPLATES[style]
}

// Helper pour lister tous les templates
export const getAllTemplates = (): ExportTemplate[] => {
  return Object.values(EXPORT_TEMPLATES)
}