'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'

interface MessageItemProps {
  event: {
    id: string
    content: string
    role: 'user' | 'assistant' | null
    type: string
    createdAt: string
  }
  session: any
  isSelected: boolean
  isExpanded: boolean
  isCopied: boolean
  onToggleSelect: (id: string) => void
  onToggleExpand: (id: string, expanded: boolean) => void
  onCopy: (content: string, id: string) => void
  formatDiscordDate: (dateString: string) => string
  COLLAPSE_HEIGHT: string
}

const MessageItem = React.memo(({
  event,
  session,
  isSelected,
  isExpanded,
  isCopied,
  onToggleSelect,
  onToggleExpand,
  onCopy,
  formatDiscordDate,
  COLLAPSE_HEIGHT
}: MessageItemProps) => {
  
  const selectedMessageIds = new Set([event.id]) // Pour la compatibilité avec le code existant
  
  if (event.role === 'user') {
    return (
      <div className="max-w-[800px] relative" data-message-type="user" data-message-id={event.id}>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm">👤</span>
          <span className="font-semibold text-blue-300">{session?.user?.name || 'Vous'}</span>
          <span className="text-xs text-gray-500">{formatDiscordDate(event.createdAt)}</span>
        </div>
        
        <div className="relative">
          <div
            className={`px-5 py-3 rounded-xl bg-gradient-to-br from-gray-900/90 to-blue-800/50 border ${
              isSelected 
                ? 'border-bandhu-primary shadow-lg shadow-bandhu-primary/20 ring-1 ring-bandhu-primary/40 bg-gradient-to-r from-blue-900/10 to-bandhu-primary/5'
                : 'border-bandhu-secondary/30'
            } text-gray-100 shadow-lg overflow-hidden relative`}
            style={{
              maxHeight: isExpanded ? 'none' : COLLAPSE_HEIGHT,
            }}
          >
            <div className="text-base leading-relaxed" style={{ lineHeight: '1.6em' }}>
              <ReactMarkdown
                components={{
                  p: ({ children, ...props }: any) => (
                    <p className="my-2 leading-relaxed text-gray-100 break-words whitespace-pre-wrap" {...props}>
                      {children}
                    </p>
                  ),
                  code: ({ node, inline, className, children, ...props }: any) => {
                    const isInline = !className?.includes('language-')
                    return !isInline ? (
                      <pre className="bg-black/50 p-4 rounded-lg overflow-auto my-4 border border-blue-400/20 break-words whitespace-pre-wrap">
                        <code className={className} {...props}>{children}</code>
                      </pre>
                    ) : (
                      <code className="bg-blue-400/20 px-2 py-0.5 rounded text-sm text-blue-200 break-words whitespace-pre-wrap inline-block max-w-full" {...props}>
                        {children}
                      </code>
                    )
                  },
                  a: ({ children, href, ...props }: any) => (
                    <a href={href} className="text-blue-200 hover:text-blue-100 underline transition" target="_blank" rel="noopener noreferrer" {...props}>
                      {children}
                    </a>
                  ),
                  br: ({ ...props }: any) => <br {...props} />,
                }}
              >
                {event.content.replace(/^\[.+? • .+?\]\n/, '')}
              </ReactMarkdown>
            </div>

            {!isExpanded && (
              <div
                ref={(el) => {
                  if (el) {
                    const container = el.parentElement
                    if (container) {
                      const shouldShow = container.scrollHeight > container.clientHeight
                      el.style.display = shouldShow ? 'block' : 'none'
                    }
                  }
                }}
              >
                <div 
                  className="absolute bottom-12 left-0 right-0 h-16 pointer-events-none"
                  style={{
                    background: 'linear-gradient(to top, rgb(17, 24, 39), rgba(17, 24, 39, 0.8), transparent)',
                  }}
                />
                
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gray-900 flex items-center justify-center">
                  <button 
                    onClick={() => onToggleExpand(event.id, true)}
                    className="text-xs text-blue-300 hover:text-blue-100 transition flex items-center gap-1 px-3 py-1.5 rounded hover:bg-gray-800/50"
                  >
                    <span>Afficher plus</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {isExpanded && (
            <div
              ref={(el) => {
                if (el) {
                  const container = el.closest('[data-message-type="user"]')
                  const contentDiv = container?.querySelector('.overflow-hidden')
                  if (contentDiv) {
                    const wasCollapsible = contentDiv.scrollHeight > parseInt(COLLAPSE_HEIGHT)
                    el.style.display = wasCollapsible ? 'block' : 'none'
                  }
                }
              }}
              className="mt-3 flex justify-center"
            >
              <button 
                onClick={() => onToggleExpand(event.id, false)} 
                className="text-xs text-blue-300 hover:text-blue-100 transition flex items-center gap-1 px-3 py-1.5 rounded hover:bg-gray-800/50 border border-gray-700/50"
              >
                <span>↑</span>
                <span>Replier</span>
              </button>
            </div>
          )}

          <div className="mt-2 flex justify-end items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer group/checkbox">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(event.id)}
                className="peer sr-only"
              />
              <div className="w-5 h-5 flex items-center justify-center rounded-md bg-blue-400/10 border border-blue-400/30 group-hover/checkbox:border-blue-300/60 group-hover/checkbox:bg-blue-400/15 transition-all duration-200 peer-checked:bg-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-md peer-checked:shadow-blue-500/15">
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-blue-300">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </div>
              
              <div className="absolute -top-9 left-1/2 transform -translate-x-1/2 bg-gray-900/95 backdrop-blur-sm text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover/checkbox:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap border border-gray-700 shadow-lg">
                {isSelected ? 'Désélectionner' : 'Sélectionner'}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 w-1.5 h-1.5 bg-gray-900/95 rotate-45 border-b border-r border-gray-700"></div>
              </div>
            </label>
            
            <button onClick={() => onCopy(event.content, event.id)} className="group relative text-blue-300/60 hover:text-blue-200 transition-all p-2 rounded hover:bg-blue-800/40 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/20 border border-transparent hover:border-blue-400/30" title="Copier le message">
              {isCopied ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-green-400">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="group-hover:drop-shadow-[0_0_6px_rgba(59,130,246,0.4)]">
                  <rect x="9" y="9" width="13" height="13" rx="1" ry="1"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              )}
              <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900/95 backdrop-blur-sm text-white text-[11px] py-1.5 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-gray-700 shadow-xl">
                {isCopied ? 'Copié !' : 'Copier'}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 w-2 h-2 bg-gray-900/95 rotate-45 border-b border-r border-gray-700"></div>
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  // Message AI
  return (
    <div className="max-w-[800px] relative mb-8" data-message-id={event.id}>
      <div className={`bg-transparent rounded-2xl ${
        isSelected 
          ? 'ring-2 ring-bandhu-primary/50 shadow-lg shadow-bandhu-primary/15 bg-gradient-to-r from-purple-900/10 to-bandhu-primary/5' 
          : ''
      }`}>
        
        <div className="px-4 py-5 bg-transparent text-gray-100 relative break-words [word-break:break-word] overflow-hidden">
          <ReactMarkdown
            rehypePlugins={[rehypeHighlight]}
            components={{
              p: ({ children, ...props }: any) => (
                <p className="my-5 leading-9 text-gray-200 text-[16px] font-normal" {...props}>
                  {children}
                </p>
              ),
              code: ({ node, inline, className, children, ...props }: any) => {
                const isInline = !className?.includes('language-')
                return !isInline ? (
                  <pre className="bg-black/70 p-5 rounded-xl overflow-auto my-6 border border-bandhu-primary/30 font-mono text-[14px] leading-6">
                    <code className={className} {...props}>{children}</code>
                  </pre>
                ) : (
                  <code className="bg-bandhu-primary/30 px-2.5 py-1 rounded-md text-[15px] text-bandhu-primary font-mono border border-bandhu-primary/20 break-words whitespace-pre-wrap inline-block max-w-full" {...props}>
                    {children}
                  </code>
                )
              },
              h1: ({ children, ...props }: any) => (
                <h1 className="text-2xl font-bold mt-8 mb-5 text-bandhu-primary border-b border-bandhu-primary/30 pb-2" {...props}>
                  {children}
                </h1>
              ),
              h2: ({ children, ...props }: any) => (
                <h2 className="text-xl font-semibold mt-7 mb-4 text-bandhu-primary" {...props}>
                  {children}
                </h2>
              ),
              h3: ({ children, ...props }: any) => (
                <h3 className="text-lg font-medium mt-6 mb-3 text-bandhu-primary" {...props}>
                  {children}
                </h3>
              ),
              ul: ({ children, ...props }: any) => (
                <ul className="my-6 ml-10 list-disc space-y-3.5 text-gray-200" {...props}>
                  {children}
                </ul>
              ),
              ol: ({ children, ...props }: any) => (
                <ol className="my-6 ml-10 list-decimal space-y-3.5 text-gray-200" {...props}>
                  {children}
                </ol>
              ),
              li: ({ children, ...props }: any) => (
                <li className="leading-8 text-[16px] pl-2" {...props}>
                  {children}
                </li>
              ),
              blockquote: ({ children, ...props }: any) => (
                <blockquote className="border-l-4 border-bandhu-primary/50 pl-5 my-6 italic text-gray-300 bg-bandhu-primary/10 py-3 rounded-r text-[15px] leading-8" {...props}>
                  {children}
                </blockquote>
              ),
              hr: ({ ...props }: any) => (
                <hr className="my-8 border-bandhu-primary/20" {...props} />
              ),
              a: ({ children, href, ...props }: any) => (
                <a href={href} className="text-bandhu-primary hover:text-bandhu-secondary underline transition underline-offset-4 font-medium" target="_blank" rel="noopener noreferrer" {...props}>
                  {children}
                </a>
              ),
              strong: ({ children, ...props }: any) => (
                <strong className="font-semibold text-gray-100" {...props}>
                  {children}
                </strong>
              ),
              em: ({ children, ...props }: any) => (
                <em className="italic text-gray-300" {...props}>
                  {children}
                </em>
              ),
            }}
          >
            {event.content}
          </ReactMarkdown>
        </div>

        <div className="absolute bottom-4 right-4 flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer group/checkbox">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(event.id)}
              className="peer sr-only"
            />
            <div className="w-5 h-5 flex items-center justify-center rounded-md bg-bandhu-primary/10 border border-bandhu-primary/30 group-hover/checkbox:border-bandhu-primary/60 group-hover/checkbox:bg-bandhu-primary/15 transition-all duration-200 peer-checked:bg-bandhu-primary/20 peer-checked:border-bandhu-primary peer-checked:shadow-md peer-checked:shadow-bandhu-primary/15">
              {isSelected && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-bandhu-primary">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
            </div>
            
            <div className="absolute -top-9 left-1/2 transform -translate-x-1/2 bg-gray-900/95 backdrop-blur-sm text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover/checkbox:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap border border-gray-700 shadow-lg">
              {isSelected ? 'Désélectionner' : 'Sélectionner'}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 w-1.5 h-1.5 bg-gray-900/95 rotate-45 border-b border-r border-gray-700"></div>
            </div>
          </label>
          
          <button onClick={() => onCopy(event.content, event.id)} className="group relative text-gray-500 hover:text-bandhu-primary transition-all p-2 rounded hover:bg-bandhu-primary/15 hover:scale-110 hover:shadow-lg hover:shadow-bandhu-primary/20 border border-transparent hover:border-bandhu-primary/30" title="Copier le message">
            {isCopied ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-green-400">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="group-hover:drop-shadow-[0_0_6px_rgba(139,92,246,0.4)]">
                <rect x="9" y="9" width="13" height="13" rx="1" ry="1"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            )}
            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900/95 backdrop-blur-sm text-white text-[11px] py-1.5 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-gray-700 shadow-xl">
              {isCopied ? 'Copié !' : 'Copier'}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 w-2 h-2 bg-gray-900/95 rotate-45 border-b border-r border-gray-700"></div>
            </div>
          </button>
        </div>
        
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.event.id === nextProps.event.id &&
    prevProps.event.content === nextProps.event.content &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.isCopied === nextProps.isCopied
  )
})

MessageItem.displayName = 'MessageItem'

export default MessageItem