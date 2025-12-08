import fs from 'fs'
import path from 'path'

// Types
export type PDFStyle = 'design-color' | 'design-bw' | 'sobre-color' | 'sobre-bw'

interface PDFOptions {
  includeTimestamps?: boolean
  title?: string
  author?: string
  fileNumber?: number      // ← AJOUTER
  totalFiles?: number      // ← AJOUTER
}

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
  
  // ==================== CONVERSION MARKDOWN (KEEP FOR BACKWARD COMPAT) ====================
  async convert(
    markdown: string,
    style: PDFStyle,
    options: PDFOptions = {}
  ): Promise<Buffer> {
    await this.initialize()
    
    const page = await this.browser.newPage()
    
    try {
      console.log('🔍 [PDF CONVERTER] Début conversion (legacy), style:', style)
      
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
      
      template = template.replace(
        '<!-- Le contenu Markdown converti en HTML sera injecté ici -->',
        markdown
      )
      
      const debugPath = path.join(process.cwd(), 'debug-pdf-legacy.html')
      fs.writeFileSync(debugPath, template)
      
      await page.setContent(template, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      })
      
      await new Promise(resolve => setTimeout(resolve, 500))

      const pdfBytes = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
        displayHeaderFooter: false,
        preferCSSPageSize: true
      })
      
      console.log('✅ [PDF CONVERTER] PDF généré (legacy):', pdfBytes.length, 'bytes')
      return Buffer.from(pdfBytes)
      
    } catch (error) {
      console.error('❌ [PDF CONVERTER] Erreur:', error)
      throw error
    } finally {
      await page.close()
    }
  }
  
  // ==================== CONVERSION HTML (NOUVEAU) ====================
  async convertHTML(
    fullHtml: string,
    style: PDFStyle,
    options: PDFOptions = {}
  ): Promise<Buffer> {
    await this.initialize()
    
    const page = await this.browser.newPage()
    
    try {
      console.log('🔍 [PDF CONVERTER] Génération PDF depuis HTML complet...')
      
      // Debug
      const debugPath = path.join(process.cwd(), 'debug-pdf-final.html')
      fs.writeFileSync(debugPath, fullHtml)
      console.log('💾 [DEBUG] HTML final sauvegardé:', debugPath)
      
      await page.setContent(fullHtml, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      })
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const pdfBytes = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { 
          top: '100px',
          right: '40px',
          bottom: '100px',
          left: '40px'
        },
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="
            width: 100%;
            font-size: 12px;
            color: #6b7280;
            text-align: left;
            padding: 20px 40px;
            font-family: -apple-system, sans-serif;
          ">
            <span style="font-weight: 600;">Bandhu export</span>
          </div>
        `,
        footerTemplate: `
          <div style="
            width: 100%;
            font-size: 11px;
            color: #6b7280;
            text-align: center;
            padding: 20px;
            font-family: -apple-system, sans-serif;
          ">
            ${options.fileNumber && options.totalFiles 
              ? `Fichier ${options.fileNumber}/${options.totalFiles} • ` 
              : ''
            }
            Page <span class="pageNumber"></span>/<span class="totalPages"></span>
          </div>
        `,
        preferCSSPageSize: true
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

export async function convertHTMLToPDF(
  html: string,
  style: PDFStyle,
  options: PDFOptions = {}
): Promise<Buffer> {
  if (!converter) {
    converter = new MarkdownToPDFConverter()
  }
  return converter.convertHTML(html, style, options)
}