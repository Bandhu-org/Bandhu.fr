// Markdown Generator for HTML/PDF exports - BW VERSION
// Version MINIMAL - AI content in normal markdown (not code blocks)

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
}

export async function generateMarkdownForHTML_BW(
  events: Event[], 
  options: GeneratorOptions = {}
): Promise<string> {
  let markdown = ''
  
  let currentThreadId: string | null = null
  
  events.forEach((event) => {
    // Nouvelle section pour chaque thread
    if (event.threadId !== currentThreadId) {
      if (currentThreadId !== null) {
        markdown += '\n---\n\n'  // Séparateur simple
      }
      
      markdown += `## ${event.thread.label}\n\n`
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
      
      // Header user (peut-être changer 🔵 en ○ pour N&B)
      markdown += `### ○ ${displayName}\n\n`
      
      // Timestamp
      if (options.includeTimestamps && displayTime) {
        const date = new Date(event.createdAt)
        const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        markdown += `${dateStr} à ${displayTime}\n\n`
      }
      
      // CONTENU EN BLOC CODE USER (gardé)
      markdown += '```user\n'
      markdown += cleanContent
      markdown += '\n```\n\n'
      
    } else {
      // ====== OMBRELIEN - MARKDOWN NORMAL ======
      markdown += `### ● Ombrelien\n\n`  // Symbole N&B

      if (options.includeTimestamps) {
        const date = new Date(event.createdAt)
        const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        markdown += `${dateStr} à ${timeStr}\n\n`
      }

      // MARKDOWN NORMAL (pas de code block) - comme l'ancienne version
      markdown += event.content + '\n\n'
    }
    
    markdown += '---\n\n'
  })

  return markdown
}