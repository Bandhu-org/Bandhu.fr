// Template HTML standalone pour export chat
export function getHTMLTemplate(style: 'design' | 'sobre'): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Conversation Bandhu - Ombrelien</title>
  <style>
    /* ========== VARIABLES ========== */
    :root {
      --primary-color: #a78bfa;
      --secondary-color: #60a5fa;
      --background: #0f172a;
      --text-color: #e2e8f0;
      --muted-color: #94a3b8;
      --border-color: #334155;
      --user-bubble: rgba(59, 130, 246, 0.1);
      --ai-bubble: rgba(139, 92, 246, 0.1);
    }
    
    /* ========== RESET & BASE ========== */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', system-ui, sans-serif;
      background: var(--background);
      color: var(--text-color);
      line-height: 1.6;
      font-size: 15px;
      padding: 40px 20px;
    }
    
    /* ========== CONTAINER ========== */
    .chat-container {
      max-width: 800px;
      margin: 0 auto;
    }
    
    /* ========== HEADER ========== */
    .chat-header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 1px solid var(--border-color);
    }
    
    .header-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .logo-icon {
      width: 32px;
      height: 32px;
    }
    
    .logo-text {
      font-size: 2em;
      font-weight: 800;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .header-subtitle {
      color: var(--primary-color);
      font-size: 1.2em;
      font-weight: 600;
      margin: 8px 0;
    }
    
    .header-sanskrit {
      color: var(--muted-color);
      font-size: 0.9em;
      font-style: italic;
    }
    
    .header-avatar {
      width: 100px;
      height: 100px;
      margin: 20px auto;
      border-radius: 12px;
      border: 2px solid var(--border-color);
      display: block;
    }
    
    .header-meta {
      color: var(--muted-color);
      font-size: 0.9em;
      margin-top: 16px;
    }
    
    /* ========== MESSAGES ========== */
    .message-pair {
      margin-bottom: 24px;
    }
    
    .message {
      margin: 12px 0;
      padding: 16px 20px;
      border-radius: 12px;
      border-left: 3px solid;
    }
    
    .message-user {
      background: var(--user-bubble);
      border-left-color: var(--secondary-color);
      margin-right: 60px;
    }
    
    .message-ai {
      background: transparent;
      border-left-color: var(--primary-color);
      margin-left: 60px;
    }
    
    .message-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    
    .message-icon {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }
    
    .message-author {
      font-weight: 700;
      font-size: 0.95em;
    }
    
    .message-user .message-author {
      color: var(--secondary-color);
    }
    
    .message-ai .message-author {
      color: var(--primary-color);
    }
    
    .message-time {
      color: var(--muted-color);
      font-size: 0.85em;
      margin-left: auto;
    }
    
    .message-content {
      color: var(--text-color);
      line-height: 1.6;
    }
    
    /* ========== MARKDOWN DANS MESSAGES ========== */
    .message-content p {
      margin: 0.8em 0;
    }
    
    .message-content p:first-child {
      margin-top: 0;
    }
    
    .message-content p:last-child {
      margin-bottom: 0;
    }
    
    .message-content h1,
    .message-content h2,
    .message-content h3 {
      margin: 1.2em 0 0.6em;
      line-height: 1.3;
    }
    
    .message-content h1 { font-size: 1.6em; }
    .message-content h2 { font-size: 1.3em; }
    .message-content h3 { font-size: 1.1em; }
    
    .message-content code {
      background: rgba(0, 0, 0, 0.4);
      padding: 0.2em 0.4em;
      border-radius: 4px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.9em;
    }
    
    .message-content pre {
      background: rgba(0, 0, 0, 0.4);
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      border: 1px solid var(--border-color);
      margin: 1em 0;
    }
    
    .message-content pre code {
      background: none;
      padding: 0;
    }
    
    .message-content ul,
    .message-content ol {
      padding-left: 1.8em;
      margin: 0.8em 0;
    }
    
    .message-content li {
      margin: 0.4em 0;
    }
    
    .message-content a {
      color: var(--secondary-color);
      text-decoration: none;
      border-bottom: 1px dotted var(--secondary-color);
    }
    
    .message-content a:hover {
      border-bottom-style: solid;
    }
    
    .message-content blockquote {
      border-left: 4px solid var(--primary-color);
      padding: 0.8em 1.2em;
      margin: 1em 0;
      background: rgba(167, 139, 250, 0.1);
      border-radius: 0 8px 8px 0;
    }
    
    /* ========== FOOTER ========== */
    .chat-footer {
      margin-top: 60px;
      padding-top: 30px;
      border-top: 1px solid var(--border-color);
      text-align: center;
      color: var(--muted-color);
      font-size: 0.9em;
    }
    
    .footer-logo {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      font-weight: 600;
    }
    
    /* ========== PRINT STYLES ========== */
    @media print {
      @page {
        margin: 60px 40px;
      }
      
      body {
        padding: 0;
      }
      
      .message-pair {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="chat-container">
    {{HEADER}}
    
    <div class="messages">
      {{MESSAGES}}
    </div>
    
    {{FOOTER}}
  </div>
</body>
</html>`
}