// Minimal Markdown Generator (Plain Text Style)
// For ultra-lightweight BW printing
// WITH DEBUG LOGS TO FIND THE ISSUE

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
  console.log('🔍 [MINIMAL] Starting generation for', events.length, 'events')
  
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
    // DEBUG: Log the event
    console.log(`🔍 [MINIMAL] Event ${index + 1}/${events.length}:`, {
      role: event.role,
      contentPreview: event.content.substring(0, 80) + '...',
      hasBracket: event.content.startsWith('[')
    })
    
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
    
    // NAME EXTRACTION WITH DEBUG
let displayName = event.role === 'user' ? 'User' : 'Ombrelien'

if (event.role === 'user') {
    console.log('🔍 [MINIMAL] Trying to extract name from:', event.content.substring(0, 100))
    
    // SINGLE ROBUST REGEX: capture tout avant le • (sans inclure le •)
    // Supporte les formats:
    // - [Sounil • 01/12/2025 à 06:48]
    // - [Sounil • 21/11 16:46]
    // - [Sounil • ...]
    const nameMatch = event.content.match(/^\[([^•]+?)\s*•/)
    console.log('🔍 [MINIMAL] Name regex match:', nameMatch)
    
    if (nameMatch) {
        displayName = nameMatch[1].trim()
        console.log('✅ [MINIMAL] Extracted name:', displayName)
    } else {
        console.log('❌ [MINIMAL] NO HEADER FOUND, using fallback:', displayName)
    }
}
    
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
    console.log(`🔍 [MINIMAL] Writing header: [${role}] ${displayName}${timeStr}`)
    output += `[${role}] ${displayName}${timeStr}\n`
    output += '─'.repeat(40) + '\n'
    
    // Content
    let content = event.content
    
    // Only remove header if we detected one
    if (event.role === 'user' && (event.content.match(/^\[.+?\]\n/) || event.content.match(/^\[.+?\s+•/))) {
      content = content.replace(/^\[.+?\]\n/, '')
      console.log('🔍 [MINIMAL] Removed header from content')
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
  
  console.log('✅ [MINIMAL] Generation complete, output length:', output.length)

  // DEBUG CRITIQUE : Montre un extrait avec le nom
  const sample = output.substring(0, 1000)
  console.log('🔍 [MINIMAL] OUTPUT SAMPLE (first 1000 chars):')
  console.log(sample)
  console.log('🔍 [MINIMAL] Contains "Sounil"?', sample.includes('Sounil'))
  console.log('🔍 [MINIMAL] Contains "User"?', sample.includes('User'))
  
  return output
}