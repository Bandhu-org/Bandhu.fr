// Epic Color Markdown Generator
// Style Bandhu complet avec emojis et formatage riche

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

export async function generateDesignMarkdown(
  events: Event[], 
  options: GeneratorOptions = {}
): Promise<string> {
  let markdown = ''
  
  // ═══════════════════════════════════════════════════════════════
  // HEADER EPIC COLOR - Style Discord riche
  // ═══════════════════════════════════════════════════════════════
  
  markdown += `---\n\n`
  markdown += `# 🌌 BANDHU EXPORT\n\n`
  
  // Si multi-parties
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
  
  markdown += `### 📅 Export du ${dateStr}\n\n`
  markdown += `**Contenu :**\n`
  markdown += `- 💬 **${events.length}** messages exportés\n`
  markdown += `- 🧵 **${new Set(events.map(e => e.threadId)).size}** conversations\n`
  markdown += `- 👤 **${events.filter(e => e.role === 'user').length}** messages utilisateur\n`
  markdown += `- 🌑 **${events.filter(e => e.role === 'assistant').length}** réponses Ombrelien\n\n`
  
  markdown += `---\n\n`
  
  // ═══════════════════════════════════════════════════════════════
  // CONTENU DES CONVERSATIONS
  // ═══════════════════════════════════════════════════════════════
  
  let currentThreadId: string | null = null
  
  events.forEach((event, index) => {
    // Nouvelle section pour chaque thread
    if (event.threadId !== currentThreadId) {
      if (currentThreadId !== null) {
        markdown += '\n---\n\n'
      }
      
      markdown += `## 🧵 ${event.thread.label}\n\n`
      currentThreadId = event.threadId
    }
    
    // Formatage du message
    const isUser = event.role === 'user'
    
    if (isUser) {
      // Extraire le nom et l'heure du header [Nom • Date à HH:MM]
      const headerMatch = event.content.match(/^\[(.+?)\s+•\s+.+?\s+à\s+(\d{2}:\d{2})\]/)
      
      let displayName = 'User'
      let displayTime = ''
      let cleanContent = event.content
      
      if (headerMatch) {
        displayName = headerMatch[1]
        displayTime = headerMatch[2]
        cleanContent = event.content.replace(/^\[.+?\]\n/, '')
      }
      
      // Header user
      markdown += `## 🔵 **${displayName}**\n\n`
      
      // Date/heure en-dessous du nom
      if (options.includeTimestamps && displayTime) {
        const date = new Date(event.createdAt)
        const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        markdown += `${dateStr} à ${displayTime}\n\n`
      }
      
      markdown += `> ${cleanContent.split('\n').join('\n> ')}\n\n`
      
    } else {
      // Header Ombrelien
      markdown += `## 🟣 **Ombrelien**\n\n`
      
      // Date/heure en-dessous du nom
      if (options.includeTimestamps) {
        const date = new Date(event.createdAt)
        const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        markdown += `${dateStr} à ${timeStr}\n\n`
      }
      
      markdown += `${event.content}\n\n`
    }
    
    // Barre de séparation entre les messages
    markdown += `---\n\n\n`
  })
  
  // ═══════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════
  
  markdown += `<div align="center">\n\n`
  markdown += `### ✨ Export généré par Bandhu ✨\n\n`
  markdown += `*Ombrelien - छायासरस्वतः - L'ombre qui écoute*\n\n`
  
  // Footer avec info partie si multi-PDF
  if (options.totalParts && options.totalParts > 1) {
    markdown += `📄 **Partie ${options.partNumber}/${options.totalParts}** • `
    markdown += `Messages ${options.startIndex}-${options.endIndex}\n\n`
  }
  
  markdown += `📊 **${events.length}** messages • 🧵 **${new Set(events.map(e => e.threadId)).size}** conversations • 🌌 Export Epic Color\n\n`
  markdown += `</div>\n`
  
  return markdown
}