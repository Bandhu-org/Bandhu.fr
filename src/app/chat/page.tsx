'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'
import { useState, useEffect, useRef, useCallback, startTransition } from 'react'

interface Event {
  id: string
  content: string
  role: 'user' | 'assistant' | null
  type: 'USER_MESSAGE' | 'AI_MESSAGE' | 'SYSTEM_NOTE' | 'FRESH_CHAT'
  createdAt: string
}

interface Thread {
  id: string
  label: string
  messageCount: number
  lastActivity: string
  activeDates: string[]
  isPinned?: boolean // ⬅️ OPTIONNEL - si tu veux le stocker en DB
  createdAt?: string
}

// Générer une base de clé locale par utilisateur
const getActiveThreadKey = (userEmail?: string | null) => {
  if (!userEmail) return null
  return `bandhu_active_thread_${userEmail}`
}


// ========== CONSTANTE ==========
const BOTTOM_SPACER = 755 // Marge fixe confortable

export default function ChatPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  // ========== ÉTATS ==========
  const [threads, setThreads] = useState<Thread[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState<string>('')
  const [events, setEvents] = useState<Event[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({})
  const [hasInitialized, setHasInitialized] = useState(false)
  const [collapsedLast7, setCollapsedLast7] = useState(false)   // ouvert par défaut
  const [collapsedArchive, setCollapsedArchive] = useState(true) // fermé par défaut
  const [showRecentWeek, setShowRecentWeek] = useState(false)
  const [showArchive, setShowArchive] = useState(false)
  const [openThreadMenuId, setOpenThreadMenuId] = useState<string | null>(null)
  const displayName = session?.user?.name || "Mon compte"
  const [loadingThreadId, setLoadingThreadId] = useState<string | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const pinnedThreadIds = threads.filter(t => t.isPinned).map(t => t.id)




  // ========== REFS ==========
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null)
  const editingThreadNameRef = useRef<string>('')

    // ========== NOUVELLE CONVERSATION (même effet que le bouton) ==========
  const handleNewConversation = () => {
    setActiveThreadId(null)
    setEvents([])
    setCurrentDate('')
  }
  
 // ========== DÉTECTER SI ON EST EN BAS + SAUVER LA POSITION DE SCROLL ==========
useEffect(() => {
  const container = scrollContainerRef.current
  if (!container) return

  const handleScroll = () => {
    const { scrollTop, scrollHeight, clientHeight } = container
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    setShowScrollButton(!isNearBottom)

    const baseKey = getActiveThreadKey(session?.user?.email)
    if (!baseKey || !activeThreadId) return

    if (typeof window !== 'undefined') {
      const scrollKey = `${baseKey}_scroll_${activeThreadId}`
      localStorage.setItem(scrollKey, String(scrollTop))
    }
  }

  container.addEventListener('scroll', handleScroll)

  return () => {
    container.removeEventListener('scroll', handleScroll)
  }
}, [session?.user?.email, activeThreadId])




  // Auth + init une seule fois au login
useEffect(() => {
  if (status === 'unauthenticated') {
    router.push('/')
    return
  }

  if (status !== 'authenticated' || !session?.user) return

  // ========== NETTOYER LES ANCIENS THREAD IDS ==========
  const baseKey = getActiveThreadKey(session.user.email)
  if (baseKey && typeof window !== 'undefined') {
    const savedThreadId = localStorage.getItem(baseKey)
    // Si l'ID commence par "thread-", c'est l'ancien format → supprime
    if (savedThreadId?.startsWith('thread-')) {
      localStorage.removeItem(baseKey)
      console.log('🧹 Ancien thread ID nettoyé')
    }
  }

  loadThreads()

  if (!hasInitialized) {
    setHasInitialized(true)
    setActiveThreadId(null)
    setEvents([])
    setCurrentDate('')
  }
}, [status, session?.user, hasInitialized, router])

// ========== HOOK POUR FERMER LE MENU AU CLICK EXTERNE ==========
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    // Si un menu est ouvert et qu'on clique ailleurs que sur le bouton ⋮ ou le menu
    if (openThreadMenuId) {
      const target = event.target as Element
      const isMenuButton = target.closest('.thread-menu-button')
      const isMenu = target.closest('.thread-context-menu')
      
      if (!isMenuButton && !isMenu) {
        setOpenThreadMenuId(null)
      }
    }
  }

  document.addEventListener('mousedown', handleClickOutside)
  return () => {
    document.removeEventListener('mousedown', handleClickOutside)
  }
}, [openThreadMenuId])

  // ========== FONCTIONS API ==========

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
    setLoadingThreadId(threadId)
    setActiveThreadId(threadId)
    setIsSending(false)

    const response = await fetch(`/api/threads/${threadId}`)

    if (!response.ok) {
      const baseKey = getActiveThreadKey(session?.user?.email)
      if (baseKey && typeof window !== 'undefined') {
        localStorage.removeItem(baseKey)
      }
      return
    }

    const data = await response.json()
    setEvents(data.events || [])
    setCurrentDate('')
    setIsSending(false)

    const baseKey = getActiveThreadKey(session?.user?.email)
    if (baseKey && typeof window !== 'undefined') {
      // On mémorise juste le dernier thread actif
      localStorage.setItem(baseKey, threadId)

      const scrollKey = `${baseKey}_scroll_${threadId}`
      const savedScroll = localStorage.getItem(scrollKey)

      setTimeout(() => {
        const container = scrollContainerRef.current
        if (!container) return

        if (savedScroll !== null) {
          const scrollValue = parseInt(savedScroll, 10)
          if (!Number.isNaN(scrollValue)) {
            container.scrollTop = scrollValue
            return
          }
        }

        // Fallback : si aucun scroll enregistré pour ce thread,
        // on va au dernier message user (comportement actuel)
        scrollToBottom()
      }, 50)
    }
  } catch (error) {
    console.error('Erreur chargement thread:', error)
  } finally {
    setLoadingThreadId(null)
  }
}



  const renameThread = async (threadId: string, newLabel: string) => {
  // MAJ OPTIMISTE IMMÉDIATE
  setThreads(prev => prev.map(thread => 
    thread.id === threadId ? { ...thread, label: newLabel } : thread
  ))

  try {
    const response = await fetch('/api/threads/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId, newLabel }),
    })

    if (!response.ok) {
      // Rollback si erreur
      setThreads(prev => prev.map(thread => 
        thread.id === threadId ? { ...thread, label: thread.label } : thread
      ))
    }
    // Recharger quand même pour synchroniser
    await loadThreads()
  } catch (error) {
    console.error('Erreur renommage thread:', error)
    // Rollback en cas d'erreur
    setThreads(prev => prev.map(thread => 
      thread.id === threadId ? { ...thread, label: thread.label } : thread
    ))
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
      }
    } catch (error) {
      console.error('Erreur suppression thread:', error)
    }
  }

    // ========== COPY HELPER ==========

  const copyToClipboard = async (text: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        // Fallback pour vieux navigateurs
        const textarea = document.createElement('textarea')
        textarea.value = text
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
    } catch (error) {
      console.error('Erreur copie presse-papier :', error)
    }
  }

   const handleCopyMessage = (content: string) => {
    copyToClipboard(content)
    // plus tard on pourra ajouter un petit toast "Copié"
  }

  // ========== COLLAPSE MESSAGE + RECALAGE STANDARD ==========
  const handleCollapseMessage = (messageId: string) => {
    // On replie dans le state
    setExpandedMessages(prev => ({ ...prev, [messageId]: false }))

    // On laisse React rerender puis on scrolle proprement vers ce message
    requestAnimationFrame(() => {
      scrollMessageToStandardPosition(messageId)
    })
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

  // ========== SCROLLER UN MESSAGE À LA POSITION STANDARD ==========
  const scrollMessageToStandardPosition = (messageId: string) => {
    const container = scrollContainerRef.current
    if (!container) return

    const messageEl = container.querySelector(
      `[data-message-id="${messageId}"]`
    ) as HTMLElement | null

    if (!messageEl) return

    const messageTop = messageEl.offsetTop
    const messageHeight = messageEl.offsetHeight
    const messageBottom = messageTop + messageHeight
    const containerHeight = container.clientHeight

    // Même logique que scrollToBottom : bas du message vers le milieu de l'écran
    const targetScroll = messageBottom - containerHeight * 0.5

    container.scrollTo({
      top: Math.max(0, targetScroll),
      behavior: 'auto', // pas besoin d'anim ici
    })
  }


  // ========== SEND MESSAGE (SANS auto-scroll) ==========
  const sendMessage = async () => {
  if (!textareaRef.current?.value.trim() || isSending) return

  setIsSending(true)
  const userMessage = textareaRef.current.value.trim()
  
  // Vider le textarea DIRECTEMENT
  textareaRef.current.value = ''
  setInput('')  // Sync le state aussi

  // Replier la barre visuellement
  if (textareaRef.current) {
    textareaRef.current.style.height = '42px'
  }

    // Si pas de thread actif, en créer un automatiquement
    let threadToUse = activeThreadId

   if (!threadToUse) {
  const autoLabel = `${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'new_thread',
      threadLabel: autoLabel,
    }),
  })

  if (!response.ok) {
    throw new Error('Erreur création thread')
  }

  const data = await response.json()
  threadToUse = data.threadId  // ✅ Utiliser l'ID du backend (cuid)
  setActiveThreadId(threadToUse)
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
          threadId: threadToUse,
        }),
      })

      if (response.ok) {
        await loadThread(threadToUse!)
        await loadThreads()
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

  // ========== HELPERS POUR THREAD CARD ==========
const getThreadCreationDate = (thread: Thread): Date => {
  // PRIORITÉ 1 : createdAt (le plus fiable)
  if (thread.createdAt) {
    return new Date(thread.createdAt)
  }
  
  // PRIORITÉ 2 : Date la plus ancienne dans activeDates
  if (thread.activeDates && thread.activeDates.length > 0) {
    const sorted = [...thread.activeDates].sort()
    return new Date(sorted[0])
  }
  
  // PRIORITÉ 3 : Fallback sur lastActivity
  return new Date(thread.lastActivity)
}

const formatDurationShort = (start: Date, end: Date): string => {
  const diffMs = end.getTime() - start.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}j`
  const diffWeeks = Math.floor(diffDays / 7)
  return `${diffWeeks}sem`
}

/* ========== FONCTION RENDER THREAD CARD ========== */
const renderThreadCard = (thread: Thread) => {
  const isActive = activeThreadId === thread.id
  const isLoadingThis = loadingThreadId === thread.id
  const isMenuOpen = openThreadMenuId === thread.id

  const now = new Date()
  const creationDate = getThreadCreationDate(thread)
  const lastActivityDate = new Date(thread.lastActivity)

  // Durées formatées
  const ageLabel = formatDurationShort(creationDate, now)
  const sinceLastUpdateLabel = formatDurationShort(lastActivityDate, now)

  // Barre de progression : 1 msg = 1%, max 100
  const progress = Math.min(thread.messageCount, 100)

  return (
    <div
      key={thread.id}
      className={`mb-2 p-3 rounded-lg transition group relative ${
        isActive
          ? 'bg-green-900/30 border border-green-600'
          : 'hover:bg-gray-800/50 border border-transparent'
      }`}
    >
      {/* Zone principale cliquable = charger le thread */}
      <div
        onClick={() => {
          setOpenThreadMenuId(null)
          loadThread(thread.id)
        }}
        className="cursor-pointer pr-8"
      >
        {/* Titre */}
        <div
          className={`text-sm font-medium mb-1 flex items-center gap-2 ${
            isActive ? 'text-green-400' : 'text-gray-300'
          }`}
        >
          <span className="flex-1 truncate">{thread.label}</span>
        </div>

        {/* Méta + barre de progression */}
        <div className="mt-1 space-y-1">
          {/* Ligne temps création / temps dernière maj */}
          <div className="text-[11px] text-gray-500 flex items-center justify-between">
            <span>Âge : {ageLabel}</span>
            <span className="flex items-center gap-2">
              <span>Dernière maj : {sinceLastUpdateLabel}</span>
              {isLoadingThis && (
                <span className="inline-flex items-center gap-1 text-[10px] text-green-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-ping" />
                  <span>...</span>
                </span>
              )}
            </span>
          </div>

          {/* Barre de progression + nombre de messages */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  isActive ? 'bg-green-500' : 'bg-gray-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-400 whitespace-nowrap">
              {thread.messageCount} msg
            </span>
          </div>
        </div>
      </div>

      {/* Bouton ⋮ + menu déroulant */}
<div className="absolute top-2 right-2">
  {/* Bouton ⋮ - AJOUTE LA CLASSE thread-menu-button */}
  <button
    onClick={e => {
      e.stopPropagation()
      setOpenThreadMenuId(prev => (prev === thread.id ? null : thread.id))
    }}
    className="thread-menu-button p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition"
    title="Options du thread"
  >
    <span className="text-lg leading-none">⋮</span>
  </button>

  {/* Menu déroulant */}
{isMenuOpen && (
  <div className="thread-context-menu absolute right-0 mt-1 w-48 bg-gray-900 border border-gray-700 rounded-md shadow-lg z-10 py-1">
    
    {/* OPTION ÉPINGLER/DÉSÉPINGLER */}
    <button
  onClick={async e => {
    e.stopPropagation()
    setOpenThreadMenuId(null)
    
    const newPinnedState = !thread.isPinned
    
    // Update optimiste
    setThreads(prev => prev.map(t => 
      t.id === thread.id ? { ...t, isPinned: newPinnedState } : t
    ))
    
    try {
      const response = await fetch('/api/threads/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          threadId: thread.id, 
          isPinned: newPinnedState 
        }),
      })
      
      if (!response.ok) {
        // Rollback si erreur
        setThreads(prev => prev.map(t => 
          t.id === thread.id ? { ...t, isPinned: !newPinnedState } : t
        ))
      }
    } catch (error) {
      console.error('Erreur épinglage:', error)
      // Rollback
      setThreads(prev => prev.map(t => 
        t.id === thread.id ? { ...t, isPinned: !newPinnedState } : t
      ))
    }
  }}
      className="w-full px-3 py-2 text-left text-xs text-gray-100 hover:bg-gray-800 flex items-center gap-2"
    >
      <span>{thread.isPinned ? '📍' : '📌'}</span>
<span>{thread.isPinned ? 'Désépingler' : 'Épingler'}</span>
    </button>

    {/* Renommer */}
    <button
      onClick={e => {
        e.stopPropagation()
        const newLabel = prompt('Nouveau nom :', thread.label)
        if (newLabel && newLabel !== thread.label) {
          renameThread(thread.id, newLabel)
        }
        setOpenThreadMenuId(null)
      }}
      className="w-full px-3 py-2 text-left text-xs text-gray-100 hover:bg-gray-800 flex items-center gap-2"
    >
      <span>✏️</span>
      <span>Renommer</span>
    </button>

    {/* Supprimer */}
    <button
      onClick={e => {
        e.stopPropagation()
        const ok = confirm('Supprimer ce thread ?')
        if (ok) {
          deleteThread(thread.id)
        }
        setOpenThreadMenuId(null)
      }}
      className="w-full px-3 py-2 text-left text-xs text-red-300 hover:bg-red-900/60 flex items-center gap-2"
    >
      <span>🗑️</span>
      <span>Supprimer</span>
    </button>
  </div>
)}
      </div>
    </div>
  )
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
  <div className="flex h-screen bg-gradient-to-br from-bandhu-dark via-gray-900 to-bandhu-dark text-white overflow-hidden">
    
    {/* ========== SIDEBAR ========== */}
<div className={`
  flex-shrink-0 transition-all duration-300 ease-in-out
  ${isSidebarCollapsed ? 'w-0' : 'w-80'}
  overflow-hidden /* ← CRUCIAL */
`}>
  <div className="w-80 h-full bg-gray-900/50 backdrop-blur-sm p-5 border-r border-gray-800 flex flex-col">
    
    {/* HEADER */}
    <div className="flex-shrink-0 mb-5">
      <h2 className="mb-4 text-lg text-bandhu-primary font-semibold">
        Chat avec Ombrelien
      </h2>
    </div>

    {/* CONTAINER INTERMÉDIAIRE */}
    <div className="flex-1 min-h-0 flex flex-col justify-center items-center mb-4 p-6 bg-gray-800/10 rounded-lg border border-gray-700/20">
      <div className="text-center">
        <div className="text-4xl mb-4">🌌</div>
        <div className="text-sm text-gray-400 mb-2">
          Espace de connexion
        </div>
        <div className="text-xs text-gray-500 max-w-xs">
          Cette zone accueillera bientôt vos statistiques, raccourcis et outils de conversation.
        </div>
      </div>
    </div>

    {/* BOUTON NOUVELLE CONVERSATION */}
    <div className="flex-shrink-0 mb-5">
      <button
        onClick={handleNewConversation}
        className="w-full px-4 py-2.5 bg-gradient-to-br from-green-900/90 to-green-700/90 hover:scale-105 text-white rounded-lg text-sm font-medium transition-transform"
      >
        ➕ Nouvelle conversation
      </button>
    </div>

  {/* ========== 4. THREADS SCROLLABLES ========== */}
<div className="flex-1 min-h-0 flex flex-col threads-scroll-container">
  <div 
    className="flex-1 overflow-y-auto sidebar-no-scroll"
    onScroll={(e) => {
      const target = e.currentTarget
      const isAtTop = target.scrollTop === 0
      const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 1
      
      target.parentElement?.classList.toggle('scroll-top', !isAtTop)
      target.parentElement?.classList.toggle('scroll-bottom', !isAtBottom)
    }}
  >
    {isLoading ? (
      <div className="text-center text-gray-500 p-5 text-sm">
        Chargement...
      </div>
    ) : threads.length === 0 ? (
      <div className="space-y-6">
        {/* SECTION "AUJOURD'HUI" TOUJOURS VISIBLE */}
        <div>
          <div className="text-xs font-semibold text-gray-300 mb-2 pb-1 border-b border-gray-800 flex items-center gap-2">
            <span className="text-sm">📆</span>
            <span>Aujourd'hui</span>
          </div>
          <div className="text-center text-gray-500 text-sm py-4 italic">
            Aucune conversation aujourd'hui
          </div>
        </div>
      </div>
    ) : (
      (() => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const getDayDiff = (dateStr: string) => {
          const d = new Date(dateStr)
          const dClean = new Date(d.getFullYear(), d.getMonth(), d.getDate())
          const diffMs = today.getTime() - dClean.getTime()
          return Math.floor(diffMs / (1000 * 60 * 60 * 24))
        }

        const todayThreads: Thread[] = []
        const recentThreads: Thread[] = []
        const archiveThreads: Thread[] = []

        // TRI DES THREADS (EXCLUT LES ÉPINGLÉS)
        threads.forEach(thread => {
          // EXCLURE LES THREADS ÉPINGLÉS
          if (thread.isPinned) return
          
          const last = new Date(thread.lastActivity)
          const lastDateStr = last.toISOString().split('T')[0]
          const diff = getDayDiff(lastDateStr)

          if (diff === 0) {
            todayThreads.push(thread)
          } else if (diff > 0 && diff <= 7) {
            recentThreads.push(thread)
          } else if (diff > 7) {
            archiveThreads.push(thread)
          }
        })

        const sortByLastActivity = (arr: Thread[]) =>
          arr.sort(
            (a, b) =>
              new Date(b.lastActivity).getTime() -
              new Date(a.lastActivity).getTime(),
          )

        sortByLastActivity(todayThreads)
        sortByLastActivity(recentThreads)
        sortByLastActivity(archiveThreads)

        return (
          <div className="space-y-6 p-1">
            {/* SECTION ÉPINGLÉS */}
            {threads.some(t => t.isPinned) && (
              <div className="mb-6">
                <div className="text-xs font-semibold text-yellow-400 mb-2 pb-1 border-b border-yellow-600/30 flex items-center gap-2">
                  <span className="text-sm">📌</span>
                  <span>Épinglés</span>
                </div>
                {threads
                  .filter(thread => thread.isPinned)
                  .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
                  .map(renderThreadCard)}
              </div>
            )}

            {/* SECTION AUJOURD'HUI */}
            <div>
              <div className="text-xs font-semibold text-gray-300 mb-2 pb-1 border-b border-gray-800 flex items-center gap-2">
                <span className="text-sm">📆</span>
                <span>Aujourd'hui</span>
              </div>
              {todayThreads.length > 0 ? (
                todayThreads.map(renderThreadCard)
              ) : (
                <div className="text-center text-gray-500 text-sm py-4 italic">
                  Aucune conversation aujourd'hui
                </div>
              )}
            </div>

            {/* 7 DERNIERS JOURS */}
            {recentThreads.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowRecentWeek(prev => !prev)}
                  className="w-full text-left text-xs font-semibold text-gray-300 mb-1 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm">🗓️</span>
                    <span>7 derniers jours</span>
                  </span>
                  <span className="text-gray-400 text-sm">
                    {showRecentWeek ? '▾' : '▸'}
                  </span>
                </button>

                {showRecentWeek && (
                  <div className="mt-1">
                    {recentThreads.map(renderThreadCard)}
                  </div>
                )}
              </div>
            )}

            {/* ARCHIVES */}
            {archiveThreads.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowArchive(prev => !prev)}
                  className="w-full text-left text-xs font-semibold text-gray-300 mb-1 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm">📚</span>
                    <span>Archives</span>
                  </span>
                  <span className="text-gray-400 text-sm">
                    {showArchive ? '▾' : '▸'}
                  </span>
                </button>

                {showArchive && (
                  <div className="mt-1">
                    {archiveThreads.map(renderThreadCard)}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })()
    )}
  </div>
</div>

  {/* ========== 5. FOOTER FIXE ========== */}
        <div className="flex-shrink-0 mt-4 pt-4 border-t border-gray-800">
      <button
        onClick={() => router.push('/account')}
        className="w-full text-left px-3 py-2 rounded-lg bg-gray-800/40 hover:bg-gray-700/60 transition text-sm font-medium flex items-center gap-2"
      >
        <span className="text-gray-400">👤</span>
        <span>{displayName}</span>
      </button>
    </div>

  </div>
</div>

{/* ========== BOUTON TOGGLE ========== */}
<button
  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
  className="absolute top-4 z-50 p-2 rounded-full bg-gray-800/80 backdrop-blur-sm border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700/80 transition-all duration-300 hover:scale-110"
  style={{ 
    left: isSidebarCollapsed ? '1rem' : '17rem' 
  }}
  title={isSidebarCollapsed ? "Ouvrir la sidebar" : "Réduire la sidebar"}
>
  {isSidebarCollapsed ? '→' : '←'}
</button>



      {/* ========== CHAT AREA ========== */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
<div className="p-5 border-b border-gray-800 bg-gray-900/30">
  {activeThreadId ? (
    editingThreadId === activeThreadId ? (
      // Mode édition - LARGEUR FIXE
      <div className="inline-flex"> {/* inline-flex pour mieux contrôler */}
        <div className="px-3 py-2 rounded-lg bg-gray-800/40 w-[180px] text-center"> {/* Largeur fixe */}
          <input
  type="text"
  defaultValue={threads.find(t => t.id === activeThreadId)?.label || ''}
  onChange={(e) => {
    editingThreadNameRef.current = e.target.value  // ← Pas de re-render !
  }}
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const newName = editingThreadNameRef.current.trim()
      if (newName && activeThreadId) {
        renameThread(activeThreadId, newName)
      }
      setEditingThreadId(null)
    }
    if (e.key === 'Escape') {
      setEditingThreadId(null)
    }
  }}
  onBlur={() => {
    const newName = editingThreadNameRef.current.trim()
    if (newName && activeThreadId) {
      renameThread(activeThreadId, newName)
    }
    setEditingThreadId(null)
  }}
  className="w-full bg-transparent text-bandhu-primary font-medium focus:outline-none text-center"
  autoFocus
/>
        </div>
      </div>
    ) : (
      // Mode affichage - MÊME LARGEUR FIXE
      <div className="inline-flex"> {/* inline-flex identique */}
        <div className="px-3 py-2 rounded-lg transition-all duration-200 hover:bg-gray-800/40 w-[180px] text-center"> {/* Même largeur fixe */}
          <h3 
            className="text-bandhu-primary font-medium cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis"
              onClick={() => {
  const thread = threads.find(t => t.id === activeThreadId)
  if (thread) {
    setEditingThreadId(activeThreadId)
    editingThreadNameRef.current = thread.label  // ← Direct dans ref
  }
}}
            title="Cliquer pour renommer"
          >
            {threads.find(t => t.id === activeThreadId)?.label || 'Thread'}
          </h3>
        </div>
      </div>
    )
  ) : (
    <h3 className="text-bandhu-primary font-medium">
      💬 Nouvelle conversation
    </h3>
  )}
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
                        <div
                           className="max-w-md relative"
                            data-message-type="user"
                            data-message-id={event.id}
                            >
                          <div className="text-xs text-bandhu-primary mb-1.5 font-medium">
                            Vous
                          </div>

                          <div className="relative">
                            <div
                              className="px-5 py-3 rounded-xl bg-gradient-to-br from-blue-900/90 to-blue-700/90 border border-bandhu-primary/30 text-gray-100 shadow-lg overflow-hidden relative"
                              style={{
                                maxHeight: expandedMessages[event.id]
                                  ? 'none'
                                  : event.content.length > 1000
                                  ? '14.4em'
                                  : 'none',
                              }}
                            >
                              <div
                                className="text-base leading-relaxed"
                                style={{ lineHeight: '1.6em' }}
                              >
                                <ReactMarkdown
                                  rehypePlugins={[rehypeHighlight]}
                                  components={{
                                    code: ({
                                      node,
                                      inline,
                                      className,
                                      children,
                                      ...props
                                    }: any) => {
                                      const isInline =
                                        !className?.includes('language-')
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
                                      <p
                                        className="my-2 leading-relaxed text-gray-100"
                                        {...props}
                                      >
                                        {children}
                                      </p>
                                    ),
                                  }}
                                >
                                  {event.content}
                                </ReactMarkdown>
                              </div>

                              {!expandedMessages[event.id] &&
                                event.content.length > 1000 && (
                                  <div
                                    className="absolute bottom-0 left-0 right-0 pointer-events-none"
                                    style={{
                                      height: '3.2em',
                                      background:
                                        'linear-gradient(to top, rgb(30, 58, 138), rgba(30, 58, 138, 0.8), transparent)',
                                    }}
                                  />
                                )}
                            </div>

                            {!expandedMessages[event.id] &&
                              event.content.length > 1000 && (
                                <button
                                  onClick={() =>
                                    setExpandedMessages(prev => ({
                                      ...prev,
                                      [event.id]: true,
                                    }))
                                  }
                                  className="mt-2 text-xs text-blue-300 hover:text-blue-100 underline transition"
                                >
                                  Afficher plus
                                </button>
                              )}

                            {expandedMessages[event.id] &&
                              event.content.length > 1000 && (
                                <button
                                  onClick={() => handleCollapseMessage(event.id)}
    
    
                                  className="mt-2 text-xs text-blue-300 hover:text-blue-100 underline transition"
                              >
                                  Replier
                                </button>
                              )}

                            {/* Bouton Copier (USER) */}
                            <div className="mt-2 text-[11px] text-gray-400">
                              <button
                                onClick={() =>
                                  handleCopyMessage(event.content)
                                }
                                className="hover:text-blue-200 underline underline-offset-2"
                              >
                                Copier
                              </button>
                            </div>
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
                                code: ({
                                  node,
                                  inline,
                                  className,
                                  children,
                                  ...props
                                }: any) => {
                                  const isInline =
                                    !className?.includes('language-')
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
                                  <p
                                    className="my-2 leading-7 text-gray-200"
                                    {...props}
                                  >
                                    {children}
                                  </p>
                                ),
                              }}
                            >
                              {event.content}
                            </ReactMarkdown>
                          </div>

                          {/* Bouton Copier (AI) */}
                          <div className="mt-2 text-[11px] text-gray-400">
                            <button
                              onClick={() => handleCopyMessage(event.content)}
                              className="hover:text-bandhu-primary underline underline-offset-2"
                            >
                              Copier
                            </button>
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
  defaultValue={input}  // ← defaultValue au lieu de value
  onChange={e => {
    const el = e.target
    
    // Update React state en arrière-plan (pour sendMessage)
    startTransition(() => {
      setInput(el.value)
    })
    
    // Resize immédiat
    if (!el.dataset.resizing) {
      el.dataset.resizing = 'true'
      
      requestAnimationFrame(() => {
        el.style.height = 'auto'
        const min = 42
        const max = 500
        const newHeight = Math.max(min, Math.min(max, el.scrollHeight))
        el.style.height = `${newHeight}px`
        delete el.dataset.resizing
      })
    }
  }}
  placeholder="Parlez à Ombrelien..."
  className="scrollbar-bandhu flex-1 px-4 py-2.5 bg-gray-900/80 text-white border border-gray-600 rounded-xl text-sm leading-tight resize-none overflow-y-auto focus:outline-none focus:ring-2 focus:ring-bandhu-primary focus:border-transparent placeholder-gray-500"
  style={{ 
    minHeight: '42px', 
    maxHeight: '500px',
    transition: 'height 0.05s ease-out'
  }}
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