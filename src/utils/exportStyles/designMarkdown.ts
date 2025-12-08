// Epic Color Markdown Generator
// Version BULLETPROOF - Neutralise les éléments markdown problématiques

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
  partNumber?: number
  totalParts?: number
  startIndex?: number
  endIndex?: number
}

/**
 * Neutralise les éléments markdown dangereux (headers, HR, code blocks)
 */
function neutralizeMarkdown(content: string): string {
  return content
    // Headers ## → HTML comment
    .replace(/^(#{1,6}\s)/gm, '<!-- $1 -->')
    // HR --- → HTML comment
    //.replace(/^(---+)$/gm, '<!-- $1 -->')
    // Code blocks ``` → HTML comment
    .replace(/^(```)$/gm, '<!-- $1 -->')
}

/**
 * Détecte si le contenu contient un export collé via timestamps
 */
function detectPastedExport(content: string, userTimestamp: string | null): {
  isPasted: boolean
  userStart: number
  ombrelienStart: number
} {
  if (!userTimestamp) {
    return { isPasted: false, userStart: -1, ombrelienStart: -1 }
  }
  
  // Chercher timestamp Ombrelien
  const ombrelienMatch = content.match(/\[Ombrelien.*?à\s+(\d{2}:\d{2})\]/)
  
  if (!ombrelienMatch) {
    return { isPasted: false, userStart: -1, ombrelienStart: -1 }
  }
  
  // Vérifier proximité temporelle (±2 minutes)
  const [uh, um] = userTimestamp.split(':').map(Number)
  const [oh, om] = ombrelienMatch[1].split(':').map(Number)
  
  const userMinutes = uh * 60 + um
  const ombrelienMinutes = oh * 60 + om
  
  const diff = Math.abs(userMinutes - ombrelienMinutes)
  
  if (diff <= 2) {
    // C'est un export collé - trouver les positions
    const userPos = content.search(/\[.+?\s+•\s+.+?\s+à\s+\d{2}:\d{2}\]/)
    const ombrelienPos = content.indexOf(ombrelienMatch[0])
    
    return {
      isPasted: true,
      userStart: userPos,
      ombrelienStart: ombrelienPos
    }
  }
  
  return { isPasted: false, userStart: -1, ombrelienStart: -1 }
}

/**
 * Quote intelligent avec neutralisation des exports collés
 */
function smartQuote(content: string, userTimestamp: string | null): string {
  const detection = detectPastedExport(content, userTimestamp)
  
  if (detection.isPasted) {
    // EXPORT COLLÉ DÉTECTÉ
    
    // Partie avant l'export (si existe)
    const before = content.substring(0, detection.userStart).trim()
    
    // Export collé (entre les deux timestamps)
    const pastedPart = content.substring(detection.userStart).trim()
    
    // Neutraliser l'export collé
    const neutralized = neutralizeMarkdown(pastedPart)
    
    let result = ''
    
    // Quote la partie avant (si existe)
    if (before) {
      result += before.split('\n').map(line => `> ${line}`).join('\n') + '\n>\n'
    }
    
    // Quote l'export neutralisé avec marqueur visuel
    result += '> **📋 Export collé :**\n>\n'
    result += neutralized.split('\n').map(line => `> ${line}`).join('\n')
    
    return result + '\n\n'
  }
  
  // PAS D'EXPORT COLLÉ - Quote normal avec extraction des code blocks
  const codeBlockRegex = /```[\s\S]*?```/g
  const codeBlocks: string[] = []
  const placeholder = '___CODEBLOCK___'
  
  // Extraire les code blocks
  let processed = content.replace(codeBlockRegex, (match) => {
    codeBlocks.push(match)
    return `${placeholder}${codeBlocks.length - 1}`
  })
  
  // Quoter le texte
  processed = processed.split('\n').map(line => `> ${line}`).join('\n')
  
  // Réinjecter les code blocks HORS quote
  codeBlocks.forEach((block, i) => {
    processed = processed.replace(
      `> ${placeholder}${i}`,
      `\n${block}\n>`
    )
  })
  
  // Nettoyer les > vides finaux
  processed = processed.replace(/>\s*$/g, '')
  
  return processed + '\n\n'
}

export async function generateDesignMarkdown(
  events: Event[], 
  options: GeneratorOptions = {}
): Promise<string> {
  let markdown = ''
  
  // ═══════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════
  
  markdown += `---\n\n`
  markdown += `# 🌌 BANDHU EXPORT\n\n`
  
  if (options.totalParts && options.totalParts > 1) {
    markdown += `## Partie ${options.partNumber} sur ${options.totalParts}\n\n`
    markdown += `> 📄 Messages ${options.startIndex}-${options.endIndex}\n\n`
  }
  
  markdown += `## Ombrelien - छायासरस्वतः\n\n`
  markdown += `> *Conversations sauvegardées depuis l'ombre numérique*\n\n`
  markdown += `---\n\n`
  
  const dateStr = new Date().toLocaleDateString('fr-FR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  
  markdown += `### Export du ${dateStr}\n\n`
  markdown += `**Contenu :**\n`
  markdown += `- 💬 **${events.length}** messages exportés\n`
  markdown += `- ✨ **${new Set(events.map(e => e.threadId)).size}** conversations\n`
  markdown += `- 👤 **${events.filter(e => e.role === 'user').length}** messages utilisateur\n`
  markdown += `- 🌑 **${events.filter(e => e.role === 'assistant').length}** réponses Ombrelien\n\n`
  
  markdown += `---\n\n`
  
  // ═══════════════════════════════════════════════════════════════
  // CONTENU
  // ═══════════════════════════════════════════════════════════════
  
  let currentThreadId: string | null = null
  
  events.forEach((event) => {
    // Nouvelle section pour chaque thread
    if (event.threadId !== currentThreadId) {
      if (currentThreadId !== null) {
        markdown += '\n---\n\n'
      }
      
      markdown += `## बन्धु : ${event.thread.label}\n\n`
      currentThreadId = event.threadId
    }
    
    const isUser = event.role === 'user'
    
    if (isUser) {
      // Extraire header
      const headerMatch = event.content.match(/^\[(.+?)\s+•\s+.+?\s+à\s+(\d{2}:\d{2})\]/)
      
      let displayName = 'User'
      let displayTime: string | null = null
      let cleanContent = event.content
      
      if (headerMatch) {
        displayName = headerMatch[1]
        displayTime = headerMatch[2]
        cleanContent = event.content.replace(/^\[.+?\]\n/, '')
      }
      
      // Header user
      markdown += `## 🔵 **${displayName}**\n\n`
      
      // Timestamp
      if (options.includeTimestamps && displayTime) {
        const date = new Date(event.createdAt)
        const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        markdown += `${dateStr} à ${displayTime}\n\n`
      }
      
      // CONTENU EN BLOC CODE USER (avec marqueur spécial)
markdown += '```user\n'  // ← "user" comme langage fictif
markdown += cleanContent
markdown += '\n```\n\n'
      
    } else {
      // Ombrelien
      markdown += `## 🟣 **Ombrelien**\n\n`
      
      if (options.includeTimestamps) {
        const date = new Date(event.createdAt)
        const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        markdown += `${dateStr} à ${timeStr}\n\n`
      }
      
      markdown += `${event.content}\n\n`
    }
    
    markdown += `---\n\n\n`
  })
  
  // ═══════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════
  
  markdown += `<div align="center">\n\n`
  markdown += `### 🟣 Export généré par Bandhu 🟣\n\n`
  markdown += `*Ombrelien - छायासरस्वतः - L'ombre qui écoute*\n\n`
  
  if (options.totalParts && options.totalParts > 1) {
    markdown += `📄 **Partie ${options.partNumber}/${options.totalParts}** • `
    markdown += `Messages ${options.startIndex}-${options.endIndex}\n\n`
  }
  
  markdown += `💬 **${events.length}** messages • ✨ **${new Set(events.map(e => e.threadId)).size}** conversations • 🌌 Export Design\n\n`
  markdown += `</div>\n`
  
  return markdown
}