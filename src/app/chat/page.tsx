'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'
import { useState, useEffect, useRef } from 'react'

interface Event {
  id: string
  content: string
  role: 'user' | 'assistant' | null
  type: 'USER_MESSAGE' | 'AI_MESSAGE' | 'SYSTEM_NOTE' | 'FRESH_CHAT'
  createdAt: string
}

interface DayTape {
  id: string
  date: string
  eventCount?: number
  createdAt: string
}

interface Thread {
  id: string
  label: string
  messageCount: number
  lastActivity: string
  activeDates: string[]
}

// ========== CONSTANTE ==========
const BOTTOM_SPACER = 755 // Marge fixe confortable

export default function ChatPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  // ========== ÉTATS ==========
  const [dayTapes, setDayTapes] = useState<DayTape[]>([])
  const [threads, setThreads] = useState<Thread[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState<string>('')
  const [events, setEvents] = useState<Event[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({})

  // ========== REFS ==========
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // ========== AUTO-RESIZE TEXTAREA ==========
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return

    el.style.height = 'auto'
    const min = 42
    const max = 500
    const newHeight = Math.max(min, Math.min(max, el.scrollHeight))
    el.style.height = `${newHeight}px`
  }, [input])

  // ========== DÉTECTER SI ON EST EN BAS (pour afficher le bouton) ==========
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      setShowScrollButton(!isNearBottom)
    }

    container.addEventListener('scroll', handleScroll)
    handleScroll() // Check initial state

    return () => container.removeEventListener('scroll', handleScroll)
  }, [events])

  // ========== REDIRECTION SI PAS CONNECTÉ ==========
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  // ========== CHARGER DAYTAPES + THREADS AU DÉMARRAGE ==========
  useEffect(() => {
    if (session?.user) {
      loadDayTapes()
      loadThreads()
      setEvents([])
      setCurrentDate('')
      setActiveThreadId(null)
    }
  }, [session])

  // ========== FONCTIONS API ==========
  const loadDayTapes = async () => {
    try {
      const response = await fetch('/api/daytapes')
      if (response.ok) {
        const data = await response.json()
        setDayTapes(data.dayTapes || [])
      }
    } catch (error) {
      console.error('Erreur chargement DayTapes:', error)
    }
  }

  const loadThreads = async () => {
    try {
      const response = await fetch('/api/threads')
      if (response.ok) {
        const data = await response.json()
        setThreads(data.threads || [])
      }
    } catch (error) {
      console.error('Erreur chargement threads:', error)
    }
  }

  const loadThread = async (threadId: string) => {
    try {
      const response = await fetch(`/api/threads/${threadId}`)
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events || [])
        setActiveThreadId(threadId)
        setCurrentDate('')
        setIsSending(false)
      }
    } catch (error) {
      console.error('Erreur chargement thread:', error)
    }
  }

  const renameThread = async (threadId: string, newLabel: string) => {
    try {
      const response = await fetch('/api/threads/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, newLabel }),
      })

      if (response.ok) {
        await loadThreads()
      }
    } catch (error) {
      console.error('Erreur renommage thread:', error)
    }
  }

  const deleteThread = async (threadId: string) => {
    try {
      const response = await fetch('/api/threads/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId }),
      })

      if (response.ok) {
        if (activeThreadId === threadId) {
          setActiveThreadId(null)
          setEvents([])
        }
        await loadThreads()
        await loadDayTapes()
      }
    } catch (error) {
      console.error('Erreur suppression thread:', error)
    }
  }

  // ========== SCROLL TO BOTTOM (sur clic bouton uniquement) ==========
  const scrollToBottom = () => {
    const container = scrollContainerRef.current
    if (!container) return

    // Trouver tous les messages user
    const allUserMessages = container.querySelectorAll('[data-message-type="user"]')
    const lastUserMessage = allUserMessages[allUserMessages.length - 1] as HTMLElement

    if (!lastUserMessage) {
      // Fallback : scroll tout en bas
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      })
      return
    }

    // Forcer un reflow
    lastUserMessage.getBoundingClientRect()

    const messageTop = lastUserMessage.offsetTop
    const messageHeight = lastUserMessage.offsetHeight
    const messageBottom = messageTop + messageHeight
    const containerHeight = container.clientHeight

    // Position cible : bas du message au milieu de l'écran
    const targetScroll = messageBottom - containerHeight * 0.5

    container.scrollTo({
      top: Math.max(0, targetScroll),
      behavior: 'smooth',
    })
  }

  // ========== SEND MESSAGE (SANS auto-scroll) ==========
  const sendMessage = async () => {
    if (!input.trim() || isSending) return

    setIsSending(true)
    const userMessage = input.trim()
    setInput('')

    // Replier la barre visuellement
    if (textareaRef.current) {
      textareaRef.current.style.height = '42px'
    }

    // Si pas de thread actif, en créer un automatiquement
    let threadToUse = activeThreadId

    if (!threadToUse) {
      const newThreadId = `thread-${Date.now()}`
      const today = new Date().toISOString().split('T')[0]
      const autoLabel = `Conversation ${new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`

      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'new_thread',
          threadId: newThreadId,
          threadLabel: autoLabel,
          date: today,
          message: '',
        }),
      })

      threadToUse = newThreadId
      setActiveThreadId(newThreadId)
    }

    // Optimistic update
const tempEvent: Event = {
  id: 'temp-' + Date.now(),
  content: userMessage,
  role: 'user',
  type: 'USER_MESSAGE',
  createdAt: new Date().toISOString(),
}
setEvents(prev => [...prev, tempEvent])

// Auto-scroll uniquement AU MOMENT DU SEND
setTimeout(() => {
  scrollToBottom()
}, 50)

try {
  const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          date: new Date().toISOString().split('T')[0],
          threadId: threadToUse,
        }),
      })

      if (response.ok) {
        await loadThread(threadToUse!)
        await loadThreads()
        await loadDayTapes()
      } else {
        setEvents(prev => prev.filter(e => e.id !== tempEvent.id))
      }
    } catch (error) {
      console.error('Erreur envoi message:', error)
      setEvents(prev => prev.filter(e => e.id !== tempEvent.id))
    } finally {
      setIsSending(false)
    }
  }

  // ========== FORMAT DATE ==========
  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.getTime() === today.getTime()) return "Aujourd'hui"
    if (date.getTime() === yesterday.getTime()) return 'Hier'

    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    })
  }

  // ========== ÉTATS TRANSITOIRES ==========
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-bandhu-dark via-gray-900 to-bandhu-dark text-white">
        Chargement...
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  // ========== RENDER ==========
  return (
    <div className="flex h-screen bg-gradient-to-br from-bandhu-dark via-gray-900 to-bandhu-dark text-white">
      {/* ========== SIDEBAR ========== */}
      <div className="w-80 bg-gray-900/50 backdrop-blur-sm p-5 border-r border-gray-800 flex flex-col">
        {/* INFO USER */}
        <div className="mb-5 border-b border-gray-800 pb-4">
          <p className="text-xs text-gray-500 mb-1">Connecté en tant que</p>
          <p className="font-bold text-sm">{session?.user?.email}</p>
        </div>

        {/* HEADER */}
        <div className="mb-5">
          <h2 className="mb-4 text-lg text-bandhu-primary font-semibold">
            Chat avec Ombrelien
          </h2>

          <button
            onClick={() => {
              setActiveThreadId(null)
              setEvents([])
              setCurrentDate('')
            }}
            className="w-full px-4 py-2.5 bg-gradient-to-br from-green-900/90 to-green-700/90 hover:scale-105 text-white rounded-lg text-sm font-medium transition-transform"
          >
            ➕ Nouvelle conversation
          </button>
        </div>

        {/* THREADS GROUPÉS PAR JOUR */}
        <div className="flex-1 overflow-y-auto scrollbar-bandhu">
          {isLoading ? (
            <div className="text-center text-gray-500 p-5 text-sm">
              Chargement...
            </div>
          ) : threads.length === 0 ? (
            <div className="text-center text-gray-500 p-5 text-sm">
              Commencez une conversation !
            </div>
          ) : (
            (() => {
              const threadsByDate = new Map<string, Thread[]>()

              threads.forEach(thread => {
                thread.activeDates.forEach(date => {
                  if (!threadsByDate.has(date)) {
                    threadsByDate.set(date, [])
                  }
                  if (!threadsByDate.get(date)!.find(t => t.id === thread.id)) {
                    threadsByDate.get(date)!.push(thread)
                  }
                })
              })

              const sortedDates = Array.from(threadsByDate.keys()).sort(
                (a, b) => new Date(b).getTime() - new Date(a).getTime(),
              )

              return sortedDates.map(date => (
                <div key={date} className="mb-5">
                  <div className="text-xs font-medium text-gray-500 mb-2 pb-2 border-b border-gray-800">
                    📅 {formatDate(date)}
                  </div>

                  {threadsByDate.get(date)!.map(thread => (
                    <div
                      key={thread.id}
                      className={`mb-2 p-3 rounded-lg transition group relative ${
                        activeThreadId === thread.id
                          ? 'bg-green-900/30 border border-green-600'
                          : 'hover:bg-gray-800/50 border border-transparent'
                      }`}
                    >
                      <div
                        onClick={() => loadThread(thread.id)}
                        className="cursor-pointer"
                      >
                        <div
                          className={`text-sm font-medium mb-1 flex items-center gap-2 ${
                            activeThreadId === thread.id
                              ? 'text-green-400'
                              : 'text-gray-300'
                          }`}
                        >
                          <span>🧵</span>
                          <span className="flex-1 truncate">{thread.label}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {thread.messageCount} msg
                          {thread.activeDates.length > 1 && (
                            <span className="ml-2">
                              • {thread.activeDates.length} jours
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Boutons actions */}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            const newLabel = prompt('Nouveau nom :', thread.label)
                            if (newLabel && newLabel !== thread.label) {
                              renameThread(thread.id, newLabel)
                            }
                          }}
                          className="p-1.5 hover:bg-gray-700 rounded text-xs"
                          title="Renommer"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            if (confirm('Supprimer ce thread ?')) {
                              deleteThread(thread.id)
                            }
                          }}
                          className="p-1.5 hover:bg-red-900 rounded text-xs"
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            })()
          )}
        </div>
      </div>

      {/* ========== CHAT AREA ========== */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <div className="p-5 border-b border-gray-800 bg-gray-900/30">
          <h3 className="text-bandhu-primary font-medium">
            {activeThreadId
              ? `🧵 ${threads.find(t => t.id === activeThreadId)?.label || 'Thread'}`
              : '💬 Nouvelle conversation'}
          </h3>
        </div>

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          className="flex-1 p-5 overflow-y-auto bg-bandhu-dark scrollbar-bandhu"
        >
          {events.length === 0 && !isSending ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-base">
              Commencez votre journée avec Ombrelien...
            </div>
          ) : (
            <>
              {events
                .filter(
                  event =>
                    event.type === 'USER_MESSAGE' || event.type === 'AI_MESSAGE',
                )
                .map(event => (
                  <div key={event.id} className="mb-5 flex justify-center">
                    <div className="w-full max-w-4xl">
                      {event.role === 'user' ? (
                        <div className="max-w-md relative" data-message-type="user">
                          <div className="text-xs text-bandhu-primary mb-1.5 font-medium">
                            Vous
                          </div>
                          
                          <div className="relative">
                            <div
                              className="px-5 py-3 rounded-xl bg-gradient-to-br from-blue-900/90 to-blue-700/90 border border-bandhu-primary/30 text-gray-100 shadow-lg overflow-hidden relative"
                              style={{
                                maxHeight: expandedMessages[event.id] ? 'none' : (event.content.length > 1000 ? '14.4em' : 'none'),
                              }}
                            >
                              <div className="text-base leading-relaxed" style={{ lineHeight: '1.6em' }}>
                                <ReactMarkdown
                                  rehypePlugins={[rehypeHighlight]}
                                  components={{
                                    code: ({ node, inline, className, children, ...props }: any) => {
                                      const isInline = !className?.includes('language-')
                                      return !isInline ? (
                                        <pre className="bg-black/50 p-4 rounded-lg overflow-auto my-4 border border-blue-400/20">
                                          <code className={className} {...props}>
                                            {children}
                                          </code>
                                        </pre>
                                      ) : (
                                        <code
                                          className="bg-blue-400/20 px-2 py-0.5 rounded text-sm text-blue-200"
                                          {...props}
                                        >
                                          {children}
                                        </code>
                                      )
                                    },
                                    a: ({ children, href, ...props }: any) => (
                                      <a
                                        href={href}
                                        className="text-blue-200 hover:text-blue-100 underline transition"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        {...props}
                                      >
                                        {children}
                                      </a>
                                    ),
                                    p: ({ children, ...props }: any) => (
                                      <p className="my-2 leading-relaxed text-gray-100" {...props}>
                                        {children}
                                      </p>
                                    ),
                                  }}
                                >
                                  {event.content}
                                </ReactMarkdown>
                              </div>
                              
                              {!expandedMessages[event.id] && event.content.length > 1000 && (
                                <div 
                                  className="absolute bottom-0 left-0 right-0 pointer-events-none"
                                  style={{ 
                                    height: '3.2em',
                                    background: 'linear-gradient(to top, rgb(30, 58, 138), rgba(30, 58, 138, 0.8), transparent)'
                                  }}
                                />
                              )}
                            </div>
                            
                            {!expandedMessages[event.id] && event.content.length > 1000 && (
                              <button
                                onClick={() =>
                                  setExpandedMessages(prev => ({ ...prev, [event.id]: true }))
                                }
                                className="mt-2 text-xs text-blue-300 hover:text-blue-100 underline transition"
                              >
                                Afficher plus
                              </button>
                            )}

                            {expandedMessages[event.id] && event.content.length > 1000 && (
                              <button
                                onClick={() =>
                                  setExpandedMessages(prev => ({ ...prev, [event.id]: false }))
                                }
                                className="mt-2 text-xs text-blue-300 hover:text-blue-100 underline transition"
                              >
                                Replier
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-xs text-bandhu-secondary mb-2 font-medium flex items-center gap-2">
                            <span className="text-lg">🌑</span> Ombrelien
                          </div>

                          <div className="px-6 py-5 bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-bandhu-primary/30 rounded-2xl text-gray-100 shadow-lg">
                            <ReactMarkdown
                              rehypePlugins={[rehypeHighlight]}
                              components={{
                                code: ({ node, inline, className, children, ...props }: any) => {
                                  const isInline = !className?.includes('language-')
                                  return !isInline ? (
                                    <pre className="bg-black/50 p-4 rounded-lg overflow-auto my-4 border border-bandhu-primary/20">
                                      <code className={className} {...props}>
                                        {children}
                                      </code>
                                    </pre>
                                  ) : (
                                    <code
                                      className="bg-bandhu-primary/20 px-2 py-0.5 rounded text-sm text-bandhu-primary"
                                      {...props}
                                    >
                                      {children}
                                    </code>
                                  )
                                },
                                a: ({ children, href, ...props }: any) => (
                                  <a
                                    href={href}
                                    className="text-bandhu-primary hover:text-bandhu-secondary underline transition"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    {...props}
                                  >
                                    {children}
                                  </a>
                                ),
                                p: ({ children, ...props }: any) => (
                                  <p className="my-2 leading-7 text-gray-200" {...props}>
                                    {children}
                                  </p>
                                ),
                              }}
                            >
                              {event.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

              {/* Typing indicator */}
              {isSending && (
                <div className="mb-5 flex justify-center animate-fadeIn">
                  <div className="w-full max-w-4xl">
                    <div className="text-xs text-bandhu-secondary mb-2 font-medium flex items-center gap-2">
                      <span className="text-lg">🌑</span> Ombrelien
                    </div>
                    <div className="px-6 py-5 bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-bandhu-primary/30 rounded-2xl">
                      <div className="flex items-center gap-2 text-gray-400">
                        <div className="flex gap-1">
                          <span
                            className="w-2 h-2 bg-bandhu-primary rounded-full animate-bounce"
                            style={{ animationDelay: '0ms' }}
                          ></span>
                          <span
                            className="w-2 h-2 bg-bandhu-primary rounded-full animate-bounce"
                            style={{ animationDelay: '150ms' }}
                          ></span>
                          <span
                            className="w-2 h-2 bg-bandhu-primary rounded-full animate-bounce"
                            style={{ animationDelay: '300ms' }}
                          ></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom spacer FIXE */}
              <div style={{ height: BOTTOM_SPACER }} />
            </>
          )}
        </div>

        {/* ========== BOUTON SCROLL TO BOTTOM ========== */}
        {showScrollButton && events.length > 0 && (
          <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 pointer-events-none">
            <button
              onClick={scrollToBottom}
              className="pointer-events-auto px-4 py-2 bg-bandhu-primary/90 hover:bg-bandhu-primary text-white rounded-full shadow-lg text-sm font-medium flex items-center gap-2 transition-all hover:scale-105"
            >
              <span>⬇</span>
              Revenir au dernier échange
            </button>
          </div>
        )}

        {/* ========== INPUT FLOTTANT ========== */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none">
          <div className="w-full max-w-3xl px-5 pointer-events-auto">
            <div className="flex gap-3 items-end bg-blue-800/95 backdrop-blur-sm p-3 rounded-2xl shadow-2xl border border-blue-600">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Parlez à Ombrelien..."
                className="scrollbar-bandhu flex-1 px-4 py-2.5 bg-gray-900/80 text-white border border-gray-600 rounded-xl text-sm leading-tight resize-none overflow-y-auto focus:outline-none focus:ring-2 focus:ring-bandhu-primary focus:border-transparent placeholder-gray-500"
                style={{ minHeight: '42px', maxHeight: '500px' }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                disabled={isSending}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isSending}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium min-h-[42px] transition-transform ${
                  input.trim() && !isSending
                    ? 'bg-gradient-to-r from-bandhu-primary to-bandhu-secondary text-white hover:scale-105 cursor-pointer shadow-lg'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSending ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}