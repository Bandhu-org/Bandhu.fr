// Minimal Markdown Generator (Plain Text Style)
// For ultra-lightweight BW printing

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
  includeThreadHeaders?: boolean
}

/**
 * Generate ultra-minimal plain text representation
 * - No markdown rendering
 * - Clean separators
 * - Monospace-friendly formatting
 */
export async function generateMinimalMarkdown(
  events: Event[], 
  options: GeneratorOptions = {}
): Promise<string> {
  let output = ''
  
  // Header
  const dateStr = new Date().toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  })
  
  output += '─'.repeat(50) + '\n'
  output += `BANDHU EXPORT • Ombrelien • ${dateStr}\n`
  output += '─'.repeat(50) + '\n\n'
  
  let currentThreadId: string | null = null
  
  events.forEach((event, index) => {
    // Thread separator
    if (options.includeThreadHeaders && event.threadId !== currentThreadId) {
      if (currentThreadId !== null) {
        output += '\n' + '─'.repeat(30) + '\n\n'
      }
      output += `THREAD: ${event.thread.label}\n`
      output += '─'.repeat(30) + '\n\n'
      currentThreadId = event.threadId
    }
    
    // Role indicator
    const role = event.role === 'user' ? 'USER' : 'OMBREL'
    const displayName = event.role === 'user' ? 
      (event.content.match(/^\[(.+?)\s+•/) || [, 'User'])[1] : 
      'Ombrelien'
    
    // Timestamp
    let timeStr = ''
    if (options.includeTimestamps) {
      const date = new Date(event.createdAt)
      const datePart = date.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit' 
      })
      const timePart = date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
      timeStr = ` • ${datePart} ${timePart}`
    }
    
    // Message header
    output += `[${role}] ${displayName}${timeStr}\n`
    output += '─'.repeat(40) + '\n'
    
    // Content (clean, preserve line breaks)
    let content = event.content
    
    // Remove the user header if present
    if (event.role === 'user') {
      content = content.replace(/^\[.+?\]\n/, '')
    }
    
    // Ensure content ends with newline
    output += content + '\n\n'
    
    // Separator between messages (except last)
    if (index < events.length - 1) {
      output += '·'.repeat(50) + '\n\n'
    }
  })
  
  // Footer
  output += '\n' + '─'.repeat(50) + '\n'
  output += `Exported ${events.length} messages • bandhu.fr\n`
  
  return output
}