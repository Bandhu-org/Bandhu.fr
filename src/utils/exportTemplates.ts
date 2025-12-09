// Export Templates - Définitions des styles d'export

// Style de base (pour Markdown et DOCX)
export type ExportStyle = 'design' | 'sobre'

// Style étendu (pour PDF)
export type PDFExportStyle = 'design-color' | 'design-bw' | 'sobre-color' | 'sobre-bw'

export interface ExportTemplate {
  id: ExportStyle | PDFExportStyle
  name: string
  description: string
  icon: string
}

export const EXPORT_TEMPLATES: Record<ExportStyle | PDFExportStyle, ExportTemplate> = {
  // Styles pour Markdown/DOCX
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
  },
  
  // Styles pour PDF
  'design-color': {
    id: 'design-color',
    name: 'Design Couleur',
    description: 'Style Bandhu riche avec couleurs et gradients',
    icon: '🎨'
  },
  'design-bw': {
    id: 'design-bw',
    name: 'Design N&B',
    description: 'Style riche en noir et blanc',
    icon: '⚫'
  },
  'sobre-color': {
    id: 'sobre-color',
    name: 'Sobre Couleur',
    description: 'Minimaliste avec touches de couleur',
    icon: '📄'
  },
  'sobre-bw': {
    id: 'sobre-bw',
    name: 'Sobre N&B',
    description: 'Ultra clean, optimisé pour impression',
    icon: '📋'
  }
}

// Helper pour obtenir les styles selon le format
export const getAvailableStyles = (format: 'markdown' | 'pdf' | 'docx'): Array<ExportStyle | PDFExportStyle> => {
  switch (format) {
    case 'markdown':
    case 'docx':
      return ['design', 'sobre']
    case 'pdf':
      return ['design-color', 'design-bw', 'sobre-color', 'sobre-bw']
    default:
      return ['design']
  }
}

// Helper pour obtenir un template
export const getTemplate = (style: ExportStyle | PDFExportStyle): ExportTemplate => {
  return EXPORT_TEMPLATES[style]
}

// Helper pour lister tous les templates
export const getAllTemplates = (): ExportTemplate[] => {
  return Object.values(EXPORT_TEMPLATES)
}

// Mapper un style de base vers un style PDF (pour l'API)
export const mapToPDFStyle = (style: ExportStyle): PDFExportStyle => {
  return style === 'design' ? 'design-color' : 'sobre-color'
}