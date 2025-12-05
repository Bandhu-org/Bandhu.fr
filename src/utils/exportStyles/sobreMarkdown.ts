// Sobre Markdown Generator
// Style professionnel minimaliste sans fioritures

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

export async function generateSobreMarkdown(
  events: Event[], 
  options: GeneratorOptions = {}
): Promise<string> {
  let markdown = ''
  
  // ═══════════════════════════════════════════════════════════════
  // HEADER SOBRE
  // ═══════════════════════════════════════════════════════════════
  
  markdown += `# Bandhu Export\n\n`
  
  const dateStr = new Date().toLocaleDateString('fr-FR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  
  markdown += `**Date :** ${dateStr}\n`
  markdown += `**Messages :** ${events.length}\n`
  markdown += `**Conversations :** ${new Set(events.map(e => e.threadId)).size}\n\n`
  
  markdown += `---\n\n`
  
  // ═══════════════════════════════════════════════════════════════
  // CONTENU DES CONVERSATIONS
  // ═══════════════════════════════════════════════════════════════
  
  let currentThreadId: string | null = null
  
  events.forEach((event) => {
    // Nouvelle section pour chaque thread
    if (event.threadId !== currentThreadId) {
      if (currentThreadId !== null) {
        markdown += '\n---\n\n'
      }
      
      markdown += `## ${event.thread.label}\n\n`
      currentThreadId = event.threadId
    }
    
    // Nettoyage du contenu user
    let cleanContent = event.content
    
    if (event.role === 'user') {
      // Enlever le header [Nom • Date] si présent
      cleanContent = event.content.replace(/^\[.+?\]\n/, '')
    }
    
    // Header simple User/Assistant
    const displayName = event.role === 'user' ? 'User' : 'Assistant'
    markdown += `## ${displayName}\n\n`
    
    // Date/heure en-dessous
    if (options.includeTimestamps) {
      const date = new Date(event.createdAt)
      const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      markdown += `${dateStr} à ${timeStr}\n\n`
    }
    
    // Contenu
    if (event.role === 'user') {
      markdown += `> ${cleanContent.split('\n').join('\n> ')}\n\n`
    } else {
      markdown += `${event.content}\n\n`
    }
    
    // Barre de séparation
    markdown += `---\n\n`
  })
  
  // ═══════════════════════════════════════════════════════════════
  // FOOTER SOBRE
  // ═══════════════════════════════════════════════════════════════
  
  markdown += `\n*Export généré par Bandhu*\n`
  
  return markdown
}