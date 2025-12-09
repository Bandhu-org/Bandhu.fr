// Markdown Generator for HTML/PDF exports
// Version MINIMAL - No header/footer, all content in code blocks

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

/**
 * Generate minimal markdown for HTML/PDF exports
 * - No header/footer
 * - All AI content in code blocks to prevent unwanted parsing
 */
export async function generateMarkdownForHTML(
  events: Event[], 
  options: GeneratorOptions = {}
): Promise<string> {
  let markdown = ''
  
  let currentThreadId: string | null = null
  
  events.forEach((event) => {
    // Nouvelle section pour chaque thread
    if (event.threadId !== currentThreadId) {
      if (currentThreadId !== null) {
        markdown += '\n<div class="hr-spacer"></div>\n\n'

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
      
      // Header user
      markdown += `### 🔵 ${displayName}\n\n`

      
      // Timestamp
      if (options.includeTimestamps && displayTime) {
        const date = new Date(event.createdAt)
        const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        markdown += `${dateStr} à ${displayTime}\n\n`
      }
      
      // CONTENU EN BLOC CODE USER
      markdown += '```user\n'
      markdown += cleanContent
      markdown += '\n```\n\n'
      
    } else {
  // ====== OMBRELIEN ======
  markdown += `### 🟣 Ombrelien\n\n`

  if (options.includeTimestamps) {
    const date = new Date(event.createdAt)
    const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    markdown += `${dateStr} à ${timeStr}\n\n`
  }

  let content = event.content

  // ⚠️ STEP 1 : Protéger les backticks internes pour éviter qu’ils cassent un bloc parent
  content = content
    .replace(/```/g, '~~~BACKTICK~~~')

  // ⚠️ STEP 2 : On NE met PAS le texte entier dans un bloc code.
  // On écrit du markdown normal.
  markdown += content + '\n\n'

  // ⚠️ STEP 3 : Restore possible internal codeblocks
  markdown = markdown.replace(/~~~BACKTICK~~~+/g, '```')
  }
  
  markdown += '\n<div class="hr-spacer"></div>\n\n'
})

return markdown
}
