import { marked } from 'marked'
import { generateStyledMarkdown } from '@/utils/exportStyles'
import type { ExportStyle } from '@/utils/exportTemplates'
import fs from 'fs'
import path from 'path'
import { decode } from 'he'
import { generateMarkdownForHTML_BW } from './markdow-for-html-pdf-bw'

export async function renderMarkdownBW(md: string) {
  const decoded = decode(md);

  // Renderer custom Marked v15
  const renderer = {
    code(codeNode: any) {
      return `<pre><code>${codeNode.text}</code></pre>`;
    }
  };

  marked.use({ renderer });

  // <-- IMPORTANT : marked.parse() est async
  const html = await marked.parse(decoded);

  // Nettoyage anti-span
  const cleanHtml = html
    .replace(/<span[^>]*>/g, "")
    .replace(/<\/span>/g, "");

  return cleanHtml;
}

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
function getHTMLTemplateForPDF_BW(): string { 
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Conversation Bandhu - Ombrelien</title>
  <style>
    :root {
      --text-color: #000000;
      --background: #ffffff;
      --border-color: #000000;
      --muted-color: #666666;
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
  background: white;
  color: var(--text-color);
  line-height: 1.5;
  padding: 30px;
  margin: 0;
  font-size: 15px;
  min-height: 100vh;
  /* 🔥 SUPPRIMÉ : filter: grayscale sur tout le body */
  /* On appliquera le grayscale seulement aux éléments visuels */
}

    .container {
  background: var(--background);
  border-radius: 20px;
  padding: 40px;
  max-width: 42rem;
  width: 100%;
  margin: 0 auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15); /* ← OMBRE COMME COULEUR (plus douce) */
  /* border: 2px solid #e5e5e5; ← SUPPRIMÉ */
}

    .content-wrapper {
  padding: 30px;
  background: var(--background);
  border-radius: 12px;
  border: 2px solid #e0e0e0; /* ← gris clair au lieu de color-mix */
}

    /* ========== HEADER ========== */
    .header {
      margin-top: 0;
      padding-top: 1rem;
      border-bottom: 2px solid var(--border-color);
    }

    .header-top {
      padding-bottom: 12px;
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
  filter: grayscale(100%);  /* ← SUPPRIMER contrast(1.2) */
}

    .header-title {
      font-size: 1.875rem;
      font-weight: 700;
      color: #000000;
      margin: 0;
      letter-spacing: -0.025em;
    }

    .header-bottom {
      display: block;
      margin-top: 20px;
    }

    .header-title-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4px;
    }

    .header-subtitle {
      color: #000000;
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0;
    }

    .header-sanskrit {
      color: var(--muted-color);
      font-size: 0.75rem;
      font-style: italic;
      font-weight: 300;
      letter-spacing: 0.5px;
      margin-bottom: 15px;
    }

    .header-avatar-stats-container {
      display: flex;
      align-items: flex-start;
      gap: 40px;
      margin-top: 20px;
    }

    .header-avatar {
  width: 180px;    /* ← Rétablir la largeur couleur */
  height: 240px;   /* ← Rétablir la hauteur couleur */
  border-radius: 20px;
  border: 2px solid var(--border-color);
  object-fit: contain;
  flex-shrink: 0;
  filter: grayscale(100%);
}

    .header-stats {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-top: 10px;
      margin-top: 0;
    }

    .header-stats div {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.95rem;
      color: var(--muted-color);
    }

    /* SVG en noir */
    .header-stats svg {
      margin-right: 8px;
      flex-shrink: 0;
      filter: grayscale(100%);
    }
    
    .header-stats svg * {
      stroke: #000000 !important;
      fill: #000000 !important;
    }

    .header-stats strong {
      color: #000000;
      font-weight: 600;
      font-size: 1.1rem;
      min-width: 24px;
    }

    .header-date {
      color: #000000;
      font-size: 0.9rem;
      font-weight: 500;
      white-space: nowrap;
      margin-left: 20px;
    }
    
    /* ========== CONTENT ========== */
    .content {
      line-height: 1.8;
      padding-bottom: 40px;
    }
    
    .content h1 {
      font-size: 1.8em;
      color: #000000;
      margin: 1.5em 0 0.8em;
      border-bottom: 2px solid var(--border-color);
      padding-bottom: 0.3em;
    }
    
    .content h2 {
      font-size: 1.4rem;
      margin: 1.3rem 0 0.6rem;
      color: #000000;
      font-weight: 600;
    }
    
    /* Emojis en niveaux de gris */
    .content h2::before {
      filter: grayscale(100%);
    }
    
    .content h3 {
      font-size: 1.1em;
      color: #000000;
      margin: 1.2em 0 0.5em;
    }
    
    .content p {
      margin: 1.4em 0;
      color: #000000;
    }
    
    /* BLOCKQUOTE - Fond blanc, bordure noire */
    .content blockquote {
      border-left: 1px solid #666666;
      padding: 0.8em 1.2em;
      margin: 1em 0;
      background: #ffffff;
      border-radius: 0 8px 8px 0;
      font-style: italic;
    }
    
    /* CODE INLINE - Fond blanc, bordure noire */
    /* Code inline SEULEMENT (pas dans un pre) */
.content code:not(pre code) {
  background: #ffffff;
  padding: 0.2em 0.5em;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.9em;
  color: #000000;
  border: 1px solid #000000;
}

/* Code dans les blocs → pas de bordure supplémentaire */
.content pre code {
  background: none;
  border: none;
  padding: 0;
  color: #000000 !important;
}
    
    /* CODE BLOCKS USER - N&B pur */
.content pre.language-user {
  background: #ffffff !important;
  padding: 16px;
  border-radius: 8px;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
  border: 1px solid #000000 !important;
  margin: 1.2em 0;
  max-width: 100%;
  overflow: auto;
}

/* CODE BLOCKS AI - N&B pur */
.content pre:not(.language-user) {
  background: #ffffff !important;
  padding: 20px;
  border-radius: 8px;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
  border: 1px solid #000000 !important;
  margin: 1.2em 0;
  max-width: 100%;
  overflow: auto;
}

/* Code dans les blocs */
.content pre code {
  background: none;
  border: none;
  padding: 0;
  color: #000000 !important;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
  display: block;
  max-width: 100%;
}

/* Règle générale pour éviter tout débordement */
.content * {
  max-width: 100%;
  box-sizing: border-box;
}

    /* Syntax Highlighting - TOUT EN NOIR */
    .hljs-keyword,
    .hljs-string,
    .hljs-function,
    .hljs-title.function_,
    .hljs-number,
    .hljs-comment,
    .hljs-params,
    .hljs-variable,
    .hljs-built_in,
    .hljs-type,
    .hljs-literal,
    .hljs-symbol,
    .hljs-class,
    .hljs-meta,
    .hljs-tag,
    .hljs-name,
    .hljs-attr,
    .hljs-selector-tag,
    .hljs-selector-id,
    .hljs-selector-class,
    .hljs-selector-attr,
    .hljs-selector-pseudo,
    .hljs {
      color: #000000 !important;
      background: transparent !important;
      font-style: normal !important;
    }
    
    .content ul, .content ol {
      padding-left: 2em;
      margin: 1em 0;
    }
    
    .content li {
      margin: 0.5em 0;
    }
    
    /* LIENS EN NOIR */
    .content a {
      color: #000000;
      text-decoration: none;
      border-bottom: 1px dotted #000000;
    }

    /* ========== EMOJIS N&B ========== */
.emoji-bw {
  filter: grayscale(100%) !important;
  -webkit-filter: grayscale(100%) !important;
  display: inline-block !important;
}
    
    .content a:hover {
      border-bottom-style: solid;
    }
    
    /* HR EN NOIR */
    .content hr {
      border: none;
      height: 2px;
      background: #000000;
      margin: 2em 0;
    }
    
    .content strong {
      color: #000000;
      font-weight: 600;
    }
    
    .content em {
      color: var(--muted-color);
    }
    
    /* ========== FOOTER ========== */
    .footer {
      margin-top: 60px;
      padding-top: 30px;
      border-top: 2px solid #000000;
      text-align: center;
      color: var(--muted-color);
      font-size: 0.9em;
    }
    
    .footer-brand {
      color: #000000;
      font-weight: 600;
    }

    /* ========== RÈGLES MINIMALES POUR PDF BW ========== */
/* Laisser Puppeteer couper naturellement, avec quelques garde-fous */

/* 1. Ne jamais couper dans un bloc code */
.content pre {
  page-break-inside: avoid !important;
}

/* 2. Éviter les paragraphes d'une seule ligne */
.content p {
  orphans: 2;
  widows: 2;
}

/* 3. Pas d'autres règles page-break-* */
/* Puppeteer décidera du reste */
    
    /* ========== PRINT ========== */
    @media print {
      @page {
        margin: 90px 0;
      }
      
      body {
        background: white;
        padding: 0;
        margin: 0;
      }
      
      .container {
        width: calc(100% - 80px);
        margin: 40px auto;
        padding: 60px 40px !important;
        box-shadow: none;
        border: none;
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
export async function generateChatHTMLForPDF_BW(
  events: Event[],
  options: HTMLGeneratorOptions = {}
): Promise<string> {
  console.log('🔍 [HTML GENERATOR PDF BW] Génération HTML pour', events.length, 'events')
  
  // 1. Générer le Markdown en DESIGN (pas sobre)
  const markdown = await generateMarkdownForHTML_BW(
  events,
  {
    includeTimestamps: options.includeTimestamps || false
  }
)
  console.log('🔍 [BW] Extrait markdown:', markdown.substring(0, 1000))

  
  console.log('✅ [HTML GENERATOR PDF BW] Markdown généré:', markdown.length, 'caractères')

  const conversationCount = new Set(events.map(e => e.threadId)).size
  
  // 2. Convertir Markdown → HTML
  
  let contentHTML = await marked.parse(markdown) as string
console.log('🔍 [BW] HTML après marked (premier 1000 chars):', contentHTML.substring(0, 1000))

// 2.1 Propager les classes du <code> vers <pre> (user / ai / langages)
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
  
  console.log('✅ [HTML GENERATOR PDF BW] HTML converti:', contentHTML.length, 'caractères')
  
  // 6. Encoder les images (tu changeras pour versions B&W)
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

  // 8. SVG Icons (seront forcés en noir par le CSS)
  const messageIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="1.8">
    <path d="M21 11.5C21 16.75 16.75 21 11.5 21C10.3 21 9.1 20.8 8 20.4L3 21L3.6 16C3.2 14.9 3 13.7 3 12.5C3 7.25 7.25 3 12.5 3C17.75 3 22 7.25 22 12.5V13.5" />
    <circle cx="9" cy="12" r="1" fill="#000000" />
    <circle cx="12" cy="12" r="1" fill="#000000" />
    <circle cx="15" cy="12" r="1" fill="#000000" />
  </svg>`

  const conversationIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="1.8">
    <path d="M21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3" />
    <path d="M21 12H12C8.13 12 5 15.13 5 19V21" stroke-width="1.5" />
    <circle cx="12" cy="12" r="2" fill="#000000" />
  </svg>`

  const userIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="1.8">
    <circle cx="12" cy="8" r="4" />
    <path d="M5 20C5 16.13 8.13 13 12 13C15.87 13 19 16.13 19 20" />
  </svg>`

  const ombrelienIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="1.8">
    <path d="M21 12.79C20 15 18 16.5 15.5 16.5C12.5 16.5 10 14 10 11C10 8.5 11.5 6.5 13.5 5.5C12.5 5 11.5 4.5 10.5 4.5C7.5 4.5 5 7 5 10C5 13 7.5 15.5 10.5 15.5C11.5 15.5 12.5 15 13.5 14.5" />
    <path d="M16 8L19 5L22 8" stroke-width="1.5" />
    <path d="M19 5V11" stroke-width="1.5" />
  </svg>`

  // 9. Header (structure identique au code couleur)
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
        <div class="header-title-row">
          <h2 class="header-subtitle">Ombrelien</h2>
          <div class="header-date">${dateStr}</div>
        </div>
        
        <div class="header-sanskrit">छायासरस्वतः</div>
        
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
  const html = getHTMLTemplateForPDF_BW()
    .replace('{{HEADER}}', header)
    .replace('{{CONTENT}}', contentHTML)
    .replace('{{FOOTER}}', footer)
  
  console.log('✅ [HTML GENERATOR PDF BW] HTML final:', html.length, 'caractères')
  
  return html
}