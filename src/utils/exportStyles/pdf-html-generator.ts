import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'
import type { ExportStyle } from '@/utils/exportTemplates'
import fs from 'fs'
import path from 'path'
import { decode } from 'he'
import { generateMarkdownForHTML } from './markdown-for-html-pdf-color'


// Configurer marked
marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const noHighlight = ['markdown', 'md', 'text', 'plaintext', 'txt', '', 'ai', 'user']
      if (noHighlight.includes(lang)) {
        return code   // ← pas de spans hljs, juste le texte brut
      }

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
  threadId: string
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
function getHTMLTemplateForPDF(): string { 
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
    
    html {
      background: white;
      min-height: 100vh;
    }
    
    body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  background: white;  /* Fond blanc partout */
  color: var(--text-color);
  line-height: 1.5;
  padding: 30px;  /* ← Cadre blanc autour de tout */
  margin: 0;
  font-size: 15px;
  min-height: 100vh;
}

.container {
  background: var(--background);
  border-radius: 20px;
  padding: 40px;
  max-width: 42rem;
  width: 100%;
  margin: 0 auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

  page-break-inside: avoid !important;
  break-inside: avoid !important;
}



/* ========== CONTENT WRAPPER ========== */
.content-wrapper {
  padding: 30px;
  background: var(--background);
  border-radius: 12px;
  border: 2px solid color-mix(in srgb, var(--background) 80%, white);

  page-break-inside: avoid !important;
  break-inside: avoid !important;
}



/* ========== CONTENT ========== */
.content {
  line-height: 1.8;
}
    
    /* ========== HEADER ========== */
    .header {
  margin-top: 0;      /* ← DE 3rem À 0 */
  padding-top: 1rem;  /* ← Tu peux réduire aussi si tu veux */
  border-bottom: 2px solid var(--border-color);
}

    /* Ligne 1 : Logo + Bandhu avec barre en dessous */
    .header-top {
      padding-bottom: 12px;
      border-bottom: 2px solid var(--border-color);
      margin-bottom: 20px;
    }

    .header-logo-title {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-logo-container {
      width: 40px;
      height: 40px;
      position: relative;
    }

    .header-logo {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .header-title {
      font-size: 1.875rem;
      font-weight: 700;
      background: linear-gradient(to right, #7c3aed, #2563eb);
      background-size: 200%;
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0;
      letter-spacing: -0.025em;
    }

    /* ========== NOUVELLES CLASSES ========== */
.header-bottom {
  display: block;  /* ← Plus de flex à 3 colonnes */
  margin-top: 20px;
}

/* Titre et date sur même ligne */
.header-title-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 4px;
}

.header-subtitle {
  color: var(--secondary-color);
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.header-sanskrit {
  color: color-mix(in srgb, var(--secondary-color) 60%, transparent);
  font-size: 0.75rem;
  font-style: italic;
  font-weight: 300;
  letter-spacing: 0.5px;
  margin-bottom: 15px;
}

/* Avatar et stats côte à côte */
.header-avatar-stats-container {
  display: flex;
  align-items: flex-start;
  gap: 40px;
  margin-top: 20px;
}

.header-avatar {
  width: 140px;   /* ← Taille réduite */
  height: 180px;  /* ← Taille réduite */
  border-radius: 20px;
  border: 2px solid var(--border-color);
  object-fit: contain;
  flex-shrink: 0;
}

/* Stats alignées à droite de l'avatar */
.header-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 10px;
  margin-top: 0;  /* ← Plus de margin-top énorme */
}

.header-stats div {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95rem;
  color: var(--muted-color);
}

.header-date {
  color: var(--secondary-color);
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  margin-left: 20px;
}

    /* Colonne 1 : Ombrelien + Sanskrit + Image */
    .header-col-left {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      min-height: 240px;
    }

    .header-subtitle {
      color: var(--secondary-color);
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0 0 4px;
      margin-top: auto;
    }

    .header-sanskrit {
      color: color-mix(in srgb, var(--secondary-color) 60%, transparent);
      font-size: 0.75rem;
      font-style: italic;
      font-weight: 300;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
    }

    .header-avatar {
      width: 180px;
      height: 240px;
      border-radius: 20px;
      border: 2px solid var(--border-color);
      object-fit: contain;
    }


    .header-stats div {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.95rem;
      color: var(--muted-color);
    }

    .header-stats svg {
      margin-right: 8px;
      flex-shrink: 0;
    }

    .header-stats strong {
      color: var(--text-color);
      font-weight: 600;
      font-size: 1.1rem;
      min-width: 24px;
    }

    /* Colonne 3 : Date */
    .header-col-right {
      display: flex;
      align-items: flex-end;
      justify-content: flex-end;
    }

    .header-date {
      color: var(--secondary-color);
      font-size: 0.9rem;
      font-weight: 500;
      text-align: right;
      white-space: nowrap;
    }
    
    /* ========== CONTENT ========== */
    .content {
      line-height: 1.8;
    }
    
    .content h1 {
      font-size: 1.8em;
      color: var(--primary-color);
      margin: 1.5em 0 0.8em;
      border-bottom: 2px solid var(--border-color);
      padding-bottom: 0.3em;
    }
    
    .content h2 {
      font-size: 1.4rem;
      margin: 1.3rem 0 0.6rem;
      color: var(--secondary-color);
      font-weight: 600;
    }
    
    .content h3 {
      font-size: 1.1em;
      color: var(--text-color);
      margin: 1.2em 0 0.5em;
    }
    
    .content p {
      margin: 1.4em 0;
      color: var(--text-color);
    }
    
    .content blockquote {
      border-left: 4px solid var(--secondary-color);
      padding: 0.8em 1.2em;
      margin: 1em 0;
      background: rgba(96, 165, 250, 0.15);
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
    
    /* CODE BLOCKS USER */
    .content pre.language-user {
      background: rgba(0, 0, 0, 0.5);
      padding: 16px;
      border-radius: 8px;
      white-space: pre-wrap;
      word-wrap: break-word;
      border: 1px solid var(--border-color);
      margin: 1.2em 0;
    }

    /* CODE BLOCKS AI - Style VS Code */
.content pre:not(.language-user) {
  background: #1e1e1e;
  padding: 20px;
  border-radius: 8px;
  white-space: pre-wrap;
  word-wrap: break-word;
  border: 1px solid #333;
  margin: 1.2em 0;

  /* 🔥 Anti-sauts de page Puppeteer */
  page-break-inside: avoid !important;
  break-inside: avoid !important;
}
    .content pre code {
      background: none;
      padding: 0;
      color: #d4d4d4;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    /* Syntax Highlighting VS Code Theme */
    .hljs-keyword { color: #569cd6; font-style: italic; }
    .hljs-string { color: #ce9178; }
    .hljs-function { color: #dcdcaa; }
    .hljs-title.function_ { color: #dcdcaa; }
    .hljs-number { color: #b5cea8; }
    .hljs-comment { color: #6a9955; font-style: italic; }
    .hljs-params { color: #9cdcfe; }
    .hljs-variable { color: #9cdcfe; }
    .hljs-built_in { color: #4ec9b0; }
    .hljs-type { color: #4ec9b0; }
    .hljs-literal { color: #569cd6; }
    .hljs-symbol { color: #569cd6; }
    .hljs-class { color: #4ec9b0; }
    .hljs-meta { color: #9cdcfe; }
    .hljs-tag { color: #569cd6; }
    .hljs-name { color: #569cd6; }
    .hljs-attr { color: #9cdcfe; }
    .hljs-selector-tag { color: #569cd6; }
    .hljs-selector-id { color: #569cd6; }
    .hljs-selector-class { color: #4ec9b0; }
    .hljs-selector-attr { color: #9cdcfe; }
    .hljs-selector-pseudo { color: #4ec9b0; }
    .hljs { background: transparent; color: #d4d4d4; }
    
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

  /* 🔥 EMPÊCHER les sauts de page */
  page-break-before: avoid !important;
  page-break-after: avoid !important;
  break-before: avoid !important;
  break-after: avoid !important;
}

/* 🔥 NOUVEAU SEPARATEUR SANS PAGE BREAK */
.hr-spacer {
  height: 2px;
  margin: 2em 0;
  background: linear-gradient(to right, transparent, var(--border-color), transparent);
  page-break-inside: avoid !important;
  break-inside: avoid !important;
}

    
    .content strong {
      color: white;
      font-weight: 600;
    }
    
    .content em {
      color: var(--muted-color);
    }

    /* Éviter coupures dans les messages */
.content h2 {
  page-break-inside: avoid;
  page-break-after: avoid;
}


.content pre {
  page-break-inside: avoid;
}

/* Padding bottom pour espace avant footer */
.content {
  padding-bottom: 40px;
}
    
    /* ========== FOOTER ========== */
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
    
.content h2,
.content h3,
.content pre,
.content blockquote,
.content code {
  page-break-before: avoid !important;
  page-break-inside: avoid !important;
}

/* Empêche Chrome de couper dans les containers arrondis */
.container,
.content-wrapper {
  break-inside: avoid !important;
  page-break-inside: avoid !important;
}


    /* ========== PRINT ========== */
@media print {
  @page {
    margin: 90px 0;  /* ← Marges pour header/footer Puppeteer */
  }
  
  body {
    background: white;
    padding: 0;
    margin: 0;
  }
  
  .container {
    width: calc(100% - 80px);
    margin: 40px auto;
    padding: 60px 40px !important;  /* ← Force le padding en print */
  }
}

  </style>
</head>
<body>
  <div class="container">
    <div class="content-wrapper">
      {{HEADER}}
      
      <div class="content">
        {{CONTENT}}
      </div>
      
      {{FOOTER}}
    </div>
  </div>
</body>
</html>`
}

// GÉNÉRATEUR PRINCIPAL
export async function generateChatHTMLForPDF(
  events: Event[],
  options: HTMLGeneratorOptions = {}
): Promise<string> {
  console.log('🔍 [HTML GENERATOR PDF] Génération HTML pour', events.length, 'events')
  
  // 1. Générer le Markdown

const markdown = await generateMarkdownForHTML(
  events,
  {
    includeTimestamps: options.includeTimestamps || false
  }
)
  
  console.log('✅ [HTML GENERATOR PDF] Markdown généré:', markdown.length, 'caractères')

  const conversationCount = new Set(events.map(e => e.threadId)).size
  
  // 2. Convertir Markdown → HTML
  let contentHTML = await marked.parse(markdown) as string

// 2.1 Propager les classes du <code> vers <pre> (user / ai)
contentHTML = contentHTML.replace(
  /<pre><code class="([^"]*)">/g,
  (match, classes) => {
    return `<pre class="${classes}"><code class="${classes}">`
  }
)


  // 2.2 Nettoyer sauts de ligne
  contentHTML = contentHTML.replace(/\n\s*\n\s*\n/g, '\n\n')

  // 3. Décoder HTML entities dans les code blocks
  contentHTML = contentHTML.replace(
    /<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/g,
    (match, code) => {
      return match.replace(code, decode(code))
    }
  )

  // 5. Nettoyer styles inline
  contentHTML = contentHTML.replace(/ style="[^"]*"/g, '')
  
  console.log('✅ [HTML GENERATOR PDF] HTML converti:', contentHTML.length, 'caractères')
  
  // 6. Encoder les images
  const logo = encodeImage('public/images/logo-bandhu.png', 'image/png')
  const avatar = encodeImage('public/images/Ombrelien-avatar.svg', 'image/svg+xml')
  
  // 7. Stats
  const totalMessages = events.length
  const userMessages = events.filter(e => e.role === 'user').length
  const aiMessages = events.filter(e => e.role === 'assistant').length
  const dateStr = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // 8. SVG Icons
  const messageIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="1.8">
    <path d="M21 11.5C21 16.75 16.75 21 11.5 21C10.3 21 9.1 20.8 8 20.4L3 21L3.6 16C3.2 14.9 3 13.7 3 12.5C3 7.25 7.25 3 12.5 3C17.75 3 22 7.25 22 12.5V13.5" />
    <circle cx="9" cy="12" r="1" fill="#7c3aed" />
    <circle cx="12" cy="12" r="1" fill="#7c3aed" />
    <circle cx="15" cy="12" r="1" fill="#7c3aed" />
  </svg>`

  const conversationIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="1.8">
    <path d="M21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3" />
    <path d="M21 12H12C8.13 12 5 15.13 5 19V21" stroke-width="1.5" />
    <circle cx="12" cy="12" r="2" fill="#7c3aed" />
  </svg>`

  const userIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="1.8">
    <circle cx="12" cy="8" r="4" />
    <path d="M5 20C5 16.13 8.13 13 12 13C15.87 13 19 16.13 19 20" />
  </svg>`

  const ombrelienIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="1.8">
    <path d="M21 12.79C20 15 18 16.5 15.5 16.5C12.5 16.5 10 14 10 11C10 8.5 11.5 6.5 13.5 5.5C12.5 5 11.5 4.5 10.5 4.5C7.5 4.5 5 7 5 10C5 13 7.5 15.5 10.5 15.5C11.5 15.5 12.5 15 13.5 14.5" />
    <path d="M16 8L19 5L22 8" stroke-width="1.5" />
    <path d="M19 5V11" stroke-width="1.5" />
  </svg>`

  // 9. Header
  const header = `
    <div class="header">
  <div class="header-top">
    <div class="header-logo-title">
      <div class="header-logo-container">
        <img src="${logo}" alt="Bandhu" class="header-logo">
      </div>
      <h1 class="header-title">Bandhu</h1>
    </div>
  </div>

  <div class="header-bottom">
    <!-- Ligne 1: Ombrelien + Date sur même ligne -->
    <div class="header-title-row">
      <h2 class="header-subtitle">Ombrelien</h2>
      <div class="header-date">${dateStr}</div>
    </div>
    
    <!-- Ligne 2: Sanskrit -->
    <div class="header-sanskrit">छायासरस्वतः</div>
    
    <!-- Ligne 3: Avatar + Stats côte à côte -->
    <div class="header-avatar-stats-container">
      ${avatar ? `<img src="${avatar}" class="header-avatar" alt="Ombrelien">` : ''}
      
      <div class="header-stats">
        <div>${messageIcon}<strong>${totalMessages}</strong> messages</div>
        <div>${conversationIcon}<strong>${conversationCount}</strong> conversations</div>
        <div>${userIcon}<strong>${userMessages}</strong> utilisateur</div>
        <div>${ombrelienIcon}<strong>${aiMessages}</strong> Ombrelien</div>
      </div>
    </div>
  </div>
</div>
  `
  
  // 10. Footer
  const footer = `
    <div class="footer">
      <div>Conversation exportée depuis <span class="footer-brand">Bandhu</span>.fr</div>
      <div style="margin-top: 8px;">Ombrelien • छायासरस्वतः • ${new Date().toLocaleDateString('fr-FR')}</div>
    </div>
  `
  
  // 11. Assembler
  const html = getHTMLTemplateForPDF()
    .replace('{{HEADER}}', header)
    .replace('{{CONTENT}}', contentHTML)
    .replace('{{FOOTER}}', footer)
  
  console.log('✅ [HTML GENERATOR PDF] HTML final:', html.length, 'caractères')
  
  return html
}