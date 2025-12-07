import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'
import { generateStyledMarkdown } from '@/utils/exportStyles'
import type { ExportStyle } from '@/utils/exportTemplates'
import fs from 'fs'
import path from 'path'
import { decode } from 'he'

// Configurer marked
marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext'
      return hljs.highlight(code, { language }).value
    }
  })
)

interface Event {
  id: string
  content: string
  role: 'user' | 'assistant'
  createdAt: string
  threadId: string  // ← AJOUTE
  thread: {
    id: string
    label: string
  }
}

interface HTMLGeneratorOptions {
  style?: ExportStyle
  includeTimestamps?: boolean
  title?: string
}

// Encoder images en base64
function encodeImage(relativePath: string, mimeType: string): string {
  try {
    const absolutePath = path.join(process.cwd(), relativePath)
    const buffer = fs.readFileSync(absolutePath)
    return `data:${mimeType};base64,${buffer.toString('base64')}`
  } catch {
    console.warn(`⚠️ Image non trouvée: ${relativePath}`)
    return ''
  }
}

// Template HTML complet
function getHTMLTemplate(): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Conversation Bandhu - Ombrelien</title>
  <style>
    :root {
      --primary-color: #a78bfa;
      --secondary-color: #60a5fa;
      --background: #0f172a;
      --text-color: #e2e8f0;
      --muted-color: #94a3b8;
      --border-color: #334155;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: var(--background);
      color: var(--text-color);
      line-height: 1.6;
      padding: 40px 20px;
      font-size: 15px;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    
    /* Header */
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 2px solid var(--border-color);
    }
    
    .header-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .header-logo img {
      width: 32px;
      height: 32px;
    }
    
    .header-title {
      font-size: 2.5em;
      font-weight: 800;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0;
    }
    
    .header-subtitle {
      color: var(--primary-color);
      font-size: 1.3em;
      font-weight: 600;
      margin: 12px 0 4px;
    }
    
    .header-sanskrit {
      color: var(--muted-color);
      font-size: 0.95em;
      font-style: italic;
    }
    
    .header-avatar {
      width: 100px;
      margin: 20px auto;
      border-radius: 12px;
      border: 2px solid var(--border-color);
      display: block;
    }
    
    .header-meta {
      color: var(--muted-color);
      font-size: 0.9em;
      margin-top: 16px;
      line-height: 1.8;
    }
    
    /* Content Markdown rendu */
    .content {
      line-height: 1.7;
    }
    
    .content h1 {
      font-size: 1.8em;
      color: var(--primary-color);
      margin: 1.5em 0 0.8em;
      border-bottom: 2px solid var(--border-color);
      padding-bottom: 0.3em;
    }
    
    .content h2 {
      font-size: 1.4em;
      color: var(--secondary-color);
      margin: 1.3em 0 0.6em;
    }
    
    .content h3 {
      font-size: 1.1em;
      color: var(--text-color);
      margin: 1.2em 0 0.5em;
    }
    
    .content p {
      margin: 0.8em 0;
      color: var(--text-color);
    }
    
    .content blockquote {
      border-left: 4px solid var(--secondary-color);
      padding: 0.8em 1.2em;
      margin: 1em 0;
      background: rgba(96, 165, 250, 0.15); /* même couleur, très léger */
      border-radius: 0 8px 8px 0;
      font-style: italic;
    }
    
    .content code {
      background: rgba(0, 0, 0, 0.4);
      padding: 0.2em 0.5em;
      border-radius: 4px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.9em;
      color: var(--secondary-color);
    }
    
    /* BLOCS CODE USER (style original) */
.content pre.language-user {
  background: rgba(0, 0, 0, 0.5) !important;
  padding: 16px;
  border-radius: 8px;
  white-space: pre-wrap;
  word-wrap: break-word;
  border: 1px solid var(--border-color) !important;
  margin: 1.2em 0;
}

/* ===== BLOCS CODE AI ===== */
.content pre:not(.language-user) {
  background: #111111 !important; /* noir pur */
  padding: 20px;
  border-radius: 8px;
  white-space: pre-wrap;
  word-wrap: break-word;
  border: 1px solid #334155 !important; /* bordure gris sur les 4 côtés */
  border-left: 4px solid rgba(0, 0, 0, 0.5) !important; /* ← couleur fond user */
  margin: 1.2em 0;
}

/* Header de langage en haut des blocs AI */
.content pre:not(.language-user)::before {
  content: attr(class);
  content: attr(class).replace('language-', '');
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: #252526;
  color: #cccccc;
  font-size: 11px;
  font-family: 'Monaco', 'Menlo', monospace;
  padding: 6px 16px;
  border-bottom: 1px solid #444;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
}

/* Code à l'intérieur */
.content pre code {
  background: none;
  padding: 0;
  color: var(--text-color);
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* ===== THÈME VS CODE ÉTENDU ===== */
.hljs-keyword { color: #569cd6 !important; font-style: italic !important; } /* blue */
.hljs-string { color: #ce9178 !important; } /* orange */
.hljs-function { color: #dcdcaa !important; } /* light yellow */
.hljs-title.function_ { color: #dcdcaa !important; } /* functions */
.hljs-number { color: #b5cea8 !important; } /* green */
.hljs-comment { color: #6a9955 !important; font-style: italic !important; } /* green */
.hljs-params { color: #9cdcfe !important; } /* light blue */
.hljs-variable { color: #9cdcfe !important; } /* light blue */
.hljs-built_in { color: #4ec9b0 !important; } /* teal */
.hljs-type { color: #4ec9b0 !important; } /* teal */
.hljs-literal { color: #569cd6 !important; } /* blue */
.hljs-symbol { color: #569cd6 !important; } /* blue */
.hljs-class { color: #4ec9b0 !important; } /* teal */
.hljs-meta { color: #9cdcfe !important; } /* light blue */
.hljs-tag { color: #569cd6 !important; } /* blue */
.hljs-name { color: #569cd6 !important; } /* blue */
.hljs-attr { color: #9cdcfe !important; } /* light blue */
.hljs-selector-tag { color: #569cd6 !important; } /* blue */
.hljs-selector-id { color: #569cd6 !important; } /* blue */
.hljs-selector-class { color: #4ec9b0 !important; } /* teal */
.hljs-selector-attr { color: #9cdcfe !important; } /* light blue */
.hljs-selector-pseudo { color: #4ec9b0 !important; } /* teal */

/* Fond général du code */
.hljs {
  background: transparent !important;
  color: #d4d4d4 !important; /* gris clair VS Code */
}
    
    .content pre code {
      background: none;
      padding: 0;
      color: var(--text-color);
    }
    
    .content ul, .content ol {
      padding-left: 2em;
      margin: 1em 0;
    }
    
    .content li {
      margin: 0.5em 0;
    }
    
    .content a {
      color: var(--secondary-color);
      text-decoration: none;
      border-bottom: 1px dotted var(--secondary-color);
    }
    
    .content a:hover {
      border-bottom-style: solid;
    }
    
    .content hr {
      border: none;
      height: 2px;
      background: linear-gradient(to right, transparent, var(--border-color), transparent);
      margin: 2em 0;
    }
    
    .content strong {
      color: white;
      font-weight: 600;
    }
    
    .content em {
      color: var(--muted-color);
    }
    
    /* Footer */
    .footer {
      margin-top: 60px;
      padding-top: 30px;
      border-top: 2px solid var(--border-color);
      text-align: center;
      color: var(--muted-color);
      font-size: 0.9em;
    }
    
    .footer-brand {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      font-weight: 600;
    }
    
    /* Print styles */
    @media print {
      @page {
        margin: 60px 40px;
      }
      
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    {{HEADER}}
    
    <div class="content">
      {{CONTENT}}
    </div>
    
    {{FOOTER}}
  </div>
</body>
</html>`
}

// GÉNÉRATEUR PRINCIPAL
export async function generateChatHTML(
  events: Event[],
  options: HTMLGeneratorOptions = {}
): Promise<string> {
  console.log('🔍 [HTML GENERATOR] Génération HTML pour', events.length, 'events')
  
  // 1. Générer le Markdown (réutilise le générateur existant)
  const markdown = await generateStyledMarkdown(events, options.style || 'design', {
    includeTimestamps: options.includeTimestamps || false,
    preview: false
  })
  
  console.log('✅ [HTML GENERATOR] Markdown généré:', markdown.length, 'caractères')
  
  // 2. Convertir Markdown → HTML
let contentHTML = await marked.parse(markdown) as string

// 3. Décoder HTML entities dans les code blocks  ← AJOUTE ICI
contentHTML = contentHTML.replace(
  /<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/g,
  (match, code) => {
    return match.replace(code, decode(code))
  }
)

  // 4. Ajouter classe language-user aux blocs user
  contentHTML = contentHTML.replace(
    /(<h2[^>]*>🔵[\s\S]*?<\/h2>)([\s\S]*?)(<pre[^>]*>)/g,
    (match, h2Part, middlePart, preTag) => {
      return h2Part + middlePart + '<pre class="language-user"' + preTag.substring(4)
    }
  )

  // 5. Nettoyer les éventuels styles inline restants (optionnel)
  contentHTML = contentHTML.replace(/ style="[^"]*"/g, '')
  
  console.log('✅ [HTML GENERATOR] HTML converti:', contentHTML.length, 'caractères')
  
  // 6. Encoder les images
  const logo = encodeImage('public/images/logo-bandhu.png', 'image/png')
  const avatar = encodeImage('public/images/Ombrelien-avatar.svg', 'image/svg+xml')
  
  // 7. Générer le header
  const totalMessages = events.length
  const userMessages = events.filter(e => e.role === 'user').length
  const aiMessages = events.filter(e => e.role === 'assistant').length
  const dateStr = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  const header = `
    <div class="header">
      <div class="header-logo">
        ${logo ? `<img src="${logo}" alt="Bandhu">` : ''}
        <h1 class="header-title">Bandhu</h1>
      </div>
      
      <h2 class="header-subtitle">Ombrelien</h2>
      <div class="header-sanskrit">छायासरस्वतः</div>
      
      ${avatar ? `<img src="${avatar}" class="header-avatar" alt="Ombrelien">` : ''}
      
      <div class="header-meta">
        <div>Export du ${dateStr}</div>
        <div>
          💬 ${totalMessages} messages • 
          👤 ${userMessages} utilisateur • 
          🌑 ${aiMessages} Ombrelien
        </div>
      </div>
    </div>
  `
  
  // 5. Générer le footer
  const footer = `
    <div class="footer">
      <div>Conversation exportée depuis <span class="footer-brand">Bandhu</span>.fr</div>
      <div style="margin-top: 8px;">Ombrelien • छायासरस्वतः • ${new Date().toLocaleDateString('fr-FR')}</div>
    </div>
  `
  
  // 6. Assembler le template
  const html = getHTMLTemplate()
    .replace('{{HEADER}}', header)
    .replace('{{CONTENT}}', contentHTML)
    .replace('{{FOOTER}}', footer)
  
  console.log('✅ [HTML GENERATOR] HTML final:', html.length, 'caractères')
  
  return html
}