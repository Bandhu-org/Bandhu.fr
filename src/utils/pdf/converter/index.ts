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
  
  async convert(
    markdown: string,
    style: PDFStyle,
    options: PDFOptions = {}
  ): Promise<Buffer> {
    await this.initialize()
    
    console.log('🔍 [DEBUG CONVERTER] Début conversion:')
    console.log('Style:', style)
    console.log('Longueur markdown:', markdown.length)
    
    const page = await this.browser.newPage()
    
    try {
      // 1. Convertir Markdown en HTML
      console.log('🔍 [DEBUG CONVERTER] Conversion Markdown → HTML...')
      const htmlContent = await marked.parse(markdown) as string
      console.log('🔍 [DEBUG CONVERTER] HTML généré:', htmlContent.length, 'caractères')
      console.log('Extrait HTML (200 chars):', htmlContent.substring(0, 200))
      
      if (htmlContent.length === 0) {
        console.error('❌ [DEBUG CONVERTER] HTML VIDE !')
        console.error('Markdown source:', markdown)
      }
      
      // 2. Charger le template de base
      const templatePath = path.join(
        process.cwd(),
        'src',
        'utils',
        'pdf',
        'converter',
        'templates',
        'base.html'
      )
      console.log('🔍 [DEBUG CONVERTER] Chemin template:', templatePath)
      
      let template = fs.readFileSync(templatePath, 'utf-8')
      console.log('🔍 [DEBUG CONVERTER] Template chargé:', template.length, 'caractères')
      
      // 3. Injecter le style spécifique
      const stylePath = path.join(
        process.cwd(),
        'src',
        'utils',
        'pdf',
        'converter',
        'styles',
        `${style}.css`
      )
      console.log('🔍 [DEBUG CONVERTER] Chemin CSS:', stylePath)
      
      const styleContent = fs.readFileSync(stylePath, 'utf-8')
      // 4. Injecter le contenu
      template = template.replace(
        '<!-- Le contenu Markdown converti en HTML sera injecté ici -->',
        htmlContent
      )
      
      console.log('🔍 [DEBUG] Content injecté, template length:', template.length)
      
      // 4. Injecter le contenu
      template = template.replace(
        '<div id="content"></div>',
        `<div id="content">${htmlContent}</div>`
      )
      
      console.log('🔍 [DEBUG CONVERTER] Template final (début 300 chars):')
      console.log(template.substring(0, 300))

      // Sauvegarder le HTML pour inspection
// Sauvegarder le HTML pour inspection
try {
  const debugPath = path.join(process.cwd(), 'debug-output.html')
  console.log('💾 [DEBUG] Tentative écriture dans:', debugPath)
  fs.writeFileSync(debugPath, template)
  console.log('✅ [DEBUG] Fichier créé avec succès')
} catch (error) {
  console.error('❌ [DEBUG] Erreur écriture fichier:', error)
}
      
      // 5. Définir le contenu HTML
      console.log('🔍 [DEBUG CONVERTER] Chargement dans Puppeteer...')
      await page.setContent(template, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      })
      
      // Attendre le rendu CSS
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 6. Générer le PDF
      console.log('🔍 [DEBUG CONVERTER] Génération PDF...')
      const pdfBytes = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '40px',
          right: '40px',
          bottom: '40px',
          left: '40px'
        },
        displayHeaderFooter: false
      })
      
      console.log('✅ [DEBUG CONVERTER] PDF généré:', pdfBytes.length, 'bytes')
      
      // Convertir en Buffer
      return Buffer.from(pdfBytes)
      
    } catch (error) {
      console.error('❌ [DEBUG CONVERTER] Erreur:', error)
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

// Singleton pour réutiliser le browser
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