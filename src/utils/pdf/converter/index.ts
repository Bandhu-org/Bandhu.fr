import fs from 'fs'
import path from 'path'
import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'

// Types
export type PDFStyle = 'design-color' | 'design-bw' | 'sobre-color' | 'sobre-bw'

interface PDFOptions {
  includeTimestamps?: boolean
  title?: string
  author?: string
}

// Configurer marked avec syntax highlighting
marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext'
      return hljs.highlight(code, { language }).value
    }
  })
)

export class MarkdownToPDFConverter {
  private browser: any = null
  private puppeteer: any = null
  
  async initialize() {
    if (!this.puppeteer) {
      this.puppeteer = await import('puppeteer')
    }
    
    if (!this.browser) {
      this.browser = await this.puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
    }
  }
  
  // ==================== POST-PROCESSING HTML ====================
 private transformHtmlForPDF(html: string): string {
  console.log('🔍 [HTML TRANSFORM] Début transformation...')
  
  // Étape 1 : ENLEVER les <blockquote> autour du user
  html = html.replace(/<blockquote>/g, '<div class="user-content">').replace(/<\/blockquote>/g, '</div>')
  
  // Étape 2 : Capturer chaque paire user+ai AVEC leur contenu
  const pairRegex = /<h2[^>]*>🔵\s*<strong>([^<]+)<\/strong><\/h2>([\s\S]*?)<h2[^>]*>🟣\s*<strong>([^<]+)<\/strong><\/h2>([\s\S]*?)(?=<h2[^>]*>🔵|$)/g
  
  const transformed = html.replace(pairRegex, (match, userName, userContent, aiName, aiContent) => {
    // Nettoyer les contenus (garder TOUT, y compris les <hr> à l'intérieur)
    userContent = userContent.toString().trim()
    aiContent = aiContent.toString().trim()
    
    return `
<div class="message-pair">
  <div class="message message-user">
    <div class="message-header">
      <svg class="message-author-icon"><use href="#icon-user"></use></svg>
      ${userName}
    </div>
    <div class="message-content">
      ${userContent}
    </div>
  </div>
  
  <div class="message message-ai">
    <div class="message-header">
      <svg class="message-author-icon"><use href="#icon-ai"></use></svg>
      ${aiName}
    </div>
    <div class="message-content">
      ${aiContent}
    </div>
  </div>
</div>
`
  })
  
  // Étape 3 : Supprimer les <hr> qui sont ENTRE les paires (pas dans .message-content)
  // On cherche les <hr> qui ne sont pas entre des balises de contenu
  let cleaned = transformed
  
  // Supprimer les <hr> isolés entre les paires
  cleaned = cleaned.replace(/(<\/div>\s*)<hr[^>]*>(\s*<div)/g, '$1$2')
  
  // Supprimer les <hr> en début/fin de #content
  cleaned = cleaned.replace(/(<div id="content">\s*)<hr[^>]*>/g, '$1')
  cleaned = cleaned.replace(/<hr[^>]*>(\s*<\/div>\s*$)/g, '$1')
  
  console.log('🔍 [HTML TRANSFORM] Transformation terminée.')
  return cleaned
}
  
  // ==================== ENCODAGE IMAGES ====================
  private encodeImages(): { logo: string; avatar: string } {
    const encode = (relativePath: string, mimeType: string): string => {
      try {
        const absolutePath = path.join(process.cwd(), relativePath)
        const buffer = fs.readFileSync(absolutePath)
        return `data:${mimeType};base64,${buffer.toString('base64')}`
      } catch {
        console.warn(`⚠️ Image non trouvée: ${relativePath}`)
        return ''
      }
    }
    
    return {
      logo: encode('public/images/logo-bandhu.png', 'image/png'),
      avatar: encode('public/images/Ombrelien-avatar.svg', 'image/svg+xml')
    }
  }
  
  // ==================== CONVERSION PRINCIPALE ====================
  async convert(
    markdown: string,
    style: PDFStyle,
    options: PDFOptions = {}
  ): Promise<Buffer> {
    await this.initialize()
    
    console.log('🔍 [PDF CONVERTER] Début conversion, style:', style)
    
    const page = await this.browser.newPage()
    
    try {
      // 1. Convertir Markdown → HTML
      console.log('🔍 [PDF CONVERTER] Conversion Markdown → HTML...')
      const rawHtml = await marked.parse(markdown) as string
      
      // 2. Post-processing pour structure PDF
      console.log('🔍 [PDF CONVERTER] Post-processing HTML...')
      const processedHtml = this.transformHtmlForPDF(rawHtml)
      
      // 3. Charger le template
      const templatePath = path.join(
        process.cwd(),
        'src',
        'utils',
        'pdf',
        'converter',
        'templates',
        'base.html'
      )
      let template = fs.readFileSync(templatePath, 'utf-8')
      
      // 4. Encoder les images
      console.log('🔍 [PDF CONVERTER] Encodage images...')
      const images = this.encodeImages()
      
      // 5. Injecter les images base64 dans le template
      if (images.logo) {
        template = template.replace(
          /src="[^"]*logo-bandhu[^"]*"/g,
          `src="${images.logo}"`
        )
      }
      if (images.avatar) {
        template = template.replace(
          /src="[^"]*Ombrelien-avatar[^"]*"/g,
          `src="${images.avatar}"`
        )
      }
      
      // 6. Injecter le style CSS (si fichier existe)
      try {
        const stylePath = path.join(
          process.cwd(),
          'src',
          'utils',
          'pdf',
          'converter',
          'styles',
          `${style}.css`
        )
        if (fs.existsSync(stylePath)) {
          const styleContent = fs.readFileSync(stylePath, 'utf-8')
          template = template.replace(
            '<style id="theme-style"></style>',
            `<style id="theme-style">\n${styleContent}\n</style>`
          )
        }
      } catch (styleError) {
        console.warn('⚠️ Style CSS non chargé:', styleError)
      }
      
      // 7. Injecter le contenu HTML
      template = template.replace(
  '<!-- Le contenu Markdown converti en HTML sera injecté ici -->',
  processedHtml
      )
      
      // 8. Sauvegarde debug
      const debugPath = path.join(process.cwd(), 'debug-pdf-output.html')
      fs.writeFileSync(debugPath, template)
      console.log('💾 [DEBUG] HTML généré sauvegardé:', debugPath)
      
      // 9. Charger dans Puppeteer
      console.log('🔍 [PDF CONVERTER] Chargement dans Puppeteer...')
      await page.setContent(template, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      })
      
      // Attendre le rendu
      await new Promise(resolve => setTimeout(resolve, 500))

            // 10. Générer le PDF avec marges augmentées
      console.log('🔍 [PDF CONVERTER] Génération PDF...')
      const pdfBytes = await page.pdf({
  format: 'A4',
  printBackground: true,
  margin: {
    top: '0px',     // réduit car plus de header Puppeteer
    right: '0px',
    bottom: '0px',  // réduit car plus de footer Puppeteer
    left: '0px'
  },
  displayHeaderFooter: false,  // ← DÉSACTIVÉ
  preferCSSPageSize: false
})
      
      console.log('✅ [PDF CONVERTER] PDF généré:', pdfBytes.length, 'bytes')
      return Buffer.from(pdfBytes)
      
    } catch (error) {
      console.error('❌ [PDF CONVERTER] Erreur:', error)
      throw error
    } finally {
      await page.close()
    }
  }
  
  async close() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.puppeteer = null
    }
  }
}

// Singleton
let converter: MarkdownToPDFConverter | null = null

export async function convertMarkdownToPDF(
  markdown: string,
  style: PDFStyle,
  options: PDFOptions = {}
): Promise<Buffer> {
  if (!converter) {
    converter = new MarkdownToPDFConverter()
  }
  return converter.convert(markdown, style, options)
}