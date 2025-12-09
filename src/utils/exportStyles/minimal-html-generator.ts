// Minimal HTML Generator for BW printing
// Ultra-lightweight, monospace, printer-friendly

interface HTMLGeneratorOptions {
  includeTimestamps?: boolean
  title?: string
}

// Template HTML minimal
function getMinimalHTMLTemplate(): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bandhu Minimal Export</title>
  <style>
    /* RESET & BASICS */
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
      font-family: 'Courier New', Courier, 'Monaco', monospace;
      background: white;
      color: #000000;
      line-height: 1.4;
      padding: 20px;
      margin: 0;
      font-size: 13px;
      min-height: 100vh;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    /* CONTAINER */
    .container {
      max-width: 70ch;
      margin: 0 auto;
      padding: 10px;
    }
    
    /* CONTENT - Plain text styling */
    .content {
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: inherit;
    }
    
    /* Minimal separators */
    .separator {
      border-bottom: 1px solid #000000;
      margin: 1em 0;
    }
    
    .dotted-separator {
      border-bottom: 1px dotted #888;
      margin: 0.5em 0;
    }
    
    /* PRINT OPTIMIZATION */
    @media print {
      @page {
        margin: 15mm;
        size: A4;
      }
      
      body {
        padding: 0;
        font-size: 11px;
      }
      
      .container {
        max-width: 100%;
        padding: 0;
      }
      
      /* Avoid page breaks inside messages */
      .message-block {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }
    
    /* DARK MODE FOR SCREEN (optional) */
    @media screen {
      body {
        background: #f9f9f9;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
{{CONTENT}}
    </div>
  </div>
</body>
</html>`
}

// Main generator
export async function generateMinimalHTML(
  plainTextContent: string,
  options: HTMLGeneratorOptions = {}
): Promise<string> {
  console.log('🔍 [MINIMAL HTML] Generating HTML for', plainTextContent.length, 'chars')
  
  // DEBUG : Check what we're receiving
  console.log('🔍 [MINIMAL HTML] First 500 chars of input:')
  console.log(plainTextContent.substring(0, 500))
  console.log('🔍 [MINIMAL HTML] Contains "Sounil"?', plainTextContent.includes('Sounil'))
  console.log('🔍 [MINIMAL HTML] Contains "User"?', plainTextContent.includes('User'))

  // Simple replacement
  const html = getMinimalHTMLTemplate()
    .replace('{{CONTENT}}', plainTextContent)
  
  return html
}