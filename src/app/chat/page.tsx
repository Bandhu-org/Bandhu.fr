'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'

interface Folder {
  id: string;
  name: string;
  createdAt: string;
}

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  createdAt: string
}

interface Conversation {
  folderId: string
  id: string
  title: string | null
  createdAt: string
  updatedAt: string
  messages?: Message[]
}

export default function ChatPage() {
  const [folders, setFolders] = useState<Folder[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)

  const router = useRouter()
  const { data: session, status } = useSession()
  
  // États
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // États pour la gestion des conversations
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'date' | 'name'>('date')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  
  const editInputRef = useRef<HTMLInputElement>(null)

  // Redirection si pas connecté
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  // Charger les conversations au démarrage
  useEffect(() => {
    if (session?.user) {
      loadFolders();
      loadConversations()
    }
  }, [session])

  // Focus sur l'input d'édition
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  const loadFolders = async () => {
    try {
      const res = await fetch('/api/folder');
      if (res.ok) {
        const data = await res.json();
        setFolders(data.folders);
      }
    } catch (err) {
      console.error('Erreur chargement folders', err);
    }
  };

  // Charger la liste des conversations
  const loadConversations = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/conversations')
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations)
        
        if (data.conversations.length > 0) {
          loadConversation(data.conversations[0].id)
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des conversations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Charger une conversation spécifique
  const loadConversation = async (conversationId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/conversations/${conversationId}`)
      if (response.ok) {
        const data = await response.json()
        setCurrentConversation(data.conversation)
        setMessages(data.conversation.messages || [])
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la conversation:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Créer une nouvelle conversation
  const createNewConversation = async () => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: 'Nouvelle conversation',
          folderId: selectedFolderId 
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setCurrentConversation(data.conversation)
        setMessages([])
        setConversations(prev => [data.conversation, ...prev])
      }
    } catch (error) {
      console.error('Erreur lors de la création de la conversation:', error)
    }
  }

  // Supprimer une conversation
  const deleteConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setConversations(prev => prev.filter(conv => conv.id !== conversationId))
        
        if (currentConversation?.id === conversationId) {
          const remaining = conversations.filter(conv => conv.id !== conversationId)
          if (remaining.length > 0) {
            loadConversation(remaining[0].id)
          } else {
            setCurrentConversation(null)
            setMessages([])
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
    } finally {
      setDeleteConfirm(null)
    }
  }

  // Renommer une conversation
  const renameConversation = async (conversationId: string, newTitle: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      })
      
      if (response.ok) {
        setConversations(prev => 
          prev.map(conv => 
            conv.id === conversationId 
              ? { ...conv, title: newTitle }
              : conv
          )
        )
        
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(prev => prev ? { ...prev, title: newTitle } : null)
        }
      }
    } catch (error) {
      console.error('Erreur lors du renommage:', error)
    } finally {
      setEditingId(null)
    }
  }

  // Commencer l'édition du titre
  const startEditing = (conv: Conversation) => {
    setEditingId(conv.id)
    setEditingTitle(conv.title || 'Conversation sans titre')
    setOpenMenuId(null)
  }

  // Confirmer l'édition
  const confirmEdit = () => {
    if (editingId && editingTitle.trim()) {
      renameConversation(editingId, editingTitle.trim())
    } else {
      setEditingId(null)
    }
  }

  // Annuler l'édition
  const cancelEdit = () => {
    setEditingId(null)
    setEditingTitle('')
  }

  // Trier les conversations
  const filteredConversations = conversations.filter(conv =>
    selectedFolderId ? conv.folderId === selectedFolderId : true
  );

  const sortedConversations = conversations ? [...conversations].sort((a, b) => {
    if (sortOrder === 'date') {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    } else {
      return (a.title || 'Conversation sans titre').localeCompare(b.title || 'Conversation sans titre')
    }
  }) : []

  // Envoyer un message
  const sendMessage = async () => {
    if (!input.trim() || isSending) return
    
    setIsSending(true)
    const userMessage = input.trim()
    setInput('')

    try {
      let conversationId = currentConversation?.id
      if (!conversationId) {
        const newConvResponse = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: userMessage.substring(0, 50) + '...' })
        })
        
        if (newConvResponse.ok) {
          const newConvData = await newConvResponse.json()
          conversationId = newConvData.conversation.id
          setCurrentConversation(newConvData.conversation)
          setConversations(prev => [newConvData.conversation, ...prev])
        }
      }

      const tempUserMessage: Message = {
        id: 'temp-user-' + Date.now(),
        content: userMessage,
        role: 'user',
        createdAt: new Date().toISOString()
      }
      setMessages(prev => [...prev, tempUserMessage])

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          conversationId: conversationId
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages)
        
        if (data.conversation) {
          setCurrentConversation(data.conversation)
          setConversations(prev => 
            prev.map(conv => 
              conv.id === data.conversation.id 
                ? { ...conv, title: data.conversation.title, updatedAt: data.conversation.updatedAt }
                : conv
            )
          )
        }
      }
      
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error)
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')))
    } finally {
      setIsSending(false)
    }
  }

  // Formater la date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return 'Aujourd\'hui'
    if (diffDays === 2) return 'Hier'
    if (diffDays <= 7) return `Il y a ${diffDays - 1} jours`
    return date.toLocaleDateString('fr-FR')
  }

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

  return (
    <div className="flex h-screen bg-gradient-to-br from-bandhu-dark via-gray-900 to-bandhu-dark">
      
      {/* Sidebar */}
      <div className="w-80 bg-gray-900/50 backdrop-blur-sm p-5 text-white border-r border-gray-800 flex flex-col">
        
        {/* INFO USER */}
        <div className="mb-5 border-b border-gray-800 pb-4">
          <p className="text-xs text-gray-500 mb-1">Connecté en tant que</p>
          <p className="font-bold text-sm">{session?.user?.email}</p>
        </div>

        {/* HEADER */}
        <div className="mb-5">
          <h2 className="mb-4 text-lg text-bandhu-primary font-semibold">Chat avec Ombrelien</h2>
          
          {/* Bouton nouveau dossier */}
          <button
            onClick={async () => {
              const name = prompt('Nom du dossier ?');
              if (!name) return;
              const res = await fetch('/api/folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
              });

              if (res.ok) {
                const data = await res.json();
                setFolders(prev => [data.folder, ...(prev || [])]);
              }
            }}
            className="w-full px-4 py-2.5 bg-gradient-to-br from-purple-900/90 to-ble-700/90 text-white rounded-lg text-sm font-medium mb-2 transition"
          >
            + Dossier
          </button>

          {/* Boutons d'action */}
          <div className="flex gap-2 mb-4">
            <button 
              onClick={createNewConversation}
              className="flex-1 px-4 py-2.5 bg-gradient-to-br from-purple-900/90 to-ble-700/90 hover:scale-105 text-white rounded-lg text-sm font-medium transition-transform"
            >
              + Nouvelle conversation
            </button>
          </div>
        </div>

        {/* LISTE DES CONVERSATIONS */}

        <div style={{ marginBottom: '15px' }}>
  <h4 style={{ fontSize: '13px', color: '#aaa', marginBottom: '6px' }}>Dossiers</h4>
  {(folders || []).filter(f => f && f.id).map(folder => (
    <div
      key={folder.id}
      onClick={() => setSelectedFolderId(folder.id)}
      style={{
        padding: '8px 12px',
        background: (selectedFolderId === folder?.id) ? '#2563eb' : 'transparent',
        color: (selectedFolderId === folder?.id) ? 'white' : '#ccc',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        marginBottom: '4px'
      }}
    >
      {folder?.name}
    </div>
  ))}
  {(!folders || folders.length === 0) && (
    <div style={{ fontSize: '12px', color: '#666' }}>Aucun dossier</div>
  )}
</div>

        
        {/* LISTE DES CONVERSATIONS */}
        <div className="flex-1 overflow-y-auto overflow-x-visible">
          {isLoading ? (
            <div className="text-center text-gray-500 p-5">
              Chargement...
            </div>
          ) : sortedConversations.length === 0 ? (
            <div className="text-center text-gray-500 p-5 text-sm">
              Aucune conversation
            </div>
          ) : (
            sortedConversations.map(conv => (
              <div
                key={conv.id}
                className={`relative mb-2 rounded-lg overflow-visible ${
                  currentConversation?.id === conv.id 
                    ? 'bg-bandhu-primary/20 border border-bandhu-primary' 
                    : 'border border-transparent'
                }`}
              >
                {editingId === conv.id ? (
                  // Mode édition
                  <div className="p-3">
                    <input
                      ref={editInputRef}
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') confirmEdit()
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      onBlur={confirmEdit}
                      className="w-full px-2 py-1.5 bg-gray-700 text-white border border-bandhu-primary rounded text-sm font-medium"
                    />
                  </div>
                ) : deleteConfirm === conv.id ? (
                  // Mode confirmation suppression
                  <div className="p-3 bg-red-600 rounded-lg">
                    <div className="text-sm mb-2 text-white">
                      Supprimer cette conversation ?
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteConversation(conv.id)}
                        className="flex-1 px-2 py-1 bg-white text-red-600 rounded text-xs font-medium"
                      >
                        Confirmer
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="flex-1 px-2 py-1 bg-transparent text-white border border-white rounded text-xs"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  // Mode normal
                  <div
                    onClick={() => loadConversation(conv.id)}
                    className={`p-3 cursor-pointer transition hover:bg-gray-800/50 flex justify-between items-start ${
                      currentConversation?.id === conv.id ? '' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium mb-1 overflow-hidden text-ellipsis whitespace-nowrap ${
                        currentConversation?.id === conv.id ? 'text-white' : 'text-gray-300'
                      }`}>
                        {conv.title || 'Conversation sans titre'}
                      </div>
                      <div className={`text-xs ${
                        currentConversation?.id === conv.id ? 'text-bandhu-primary/80' : 'text-gray-500'
                      }`}>
                        {formatDate(conv.updatedAt)}
                      </div>
                    </div>
                    
                    {/* Menu d'actions */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenMenuId(openMenuId === conv.id ? null : conv.id)
                        }}
                        className="p-1 text-gray-500 hover:text-gray-300 rounded text-base"
                      >
                        ⋮
                      </button>
                      
                      {openMenuId === conv.id && (
                        <div className="absolute top-full right-0 bg-gray-700 border border-gray-600 rounded-lg p-1 z-50 min-w-[120px] shadow-lg">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              startEditing(conv)
                            }}
                            className="w-full px-2 py-1.5 text-white hover:bg-gray-600 rounded text-xs text-left"
                          >
                            ✏️ Renommer
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteConfirm(conv.id)
                              setOpenMenuId(null)
                            }}
                            className="w-full px-2 py-1.5 text-red-400 hover:bg-gray-600 rounded text-xs text-left"
                          >
                            🗑️ Supprimer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        
        {/* Header Chat */}
        {currentConversation && (
          <div className="p-5 border-b border-gray-800 bg-gray-900/30">
            <h3 className="text-bandhu-primary font-medium overflow-hidden text-ellipsis whitespace-nowrap">
              {currentConversation.title || 'Conversation'}
            </h3>
          </div>
        )}

      {/* Messages */}
<div className="flex-1 p-5 pb-32 overflow-y-auto bg-bandhu-dark scrollbar-bandhu">
  {!currentConversation ? (
    <div className="flex items-center justify-center h-full text-gray-500 text-base">
      Sélectionnez une conversation ou créez-en une nouvelle
    </div>
  ) : messages.length === 0 ? (
    <div className="flex items-center justify-center h-full text-gray-500 text-base">
      Commencez votre conversation avec Ombrelien...
    </div>
  ) : (
    messages.map(msg => (
  <div key={msg.id} className="mb-5 flex justify-center">
    <div className="w-full max-w-4xl">
      {msg.role === 'user' ? (
  // MESSAGE USER - style Ombrelien en violet
  <div className="max-w-md">
    <div className="text-xs text-bandhu-primary mb-1.5 font-medium">Vous</div>
    <div className="px-5 py-3 rounded-xl bg-gradient-to-br from-blue-900/90 to-ble-700/90 border border-bandhu-primary/30 text-gray-100 shadow-lg shadow-bandhu-secondary/10">
      <div className="text-base leading-relaxed">{msg.content}</div>
    </div>
  </div>
) : (
        // MESSAGE OMBRELIEN - aligné à gauche
        <div>
          <div className="text-xs text-bandhu-secondary mb-2 font-medium flex items-center gap-2">
            <span className="text-lg">🌑</span> Ombrelien
          </div>
          
          <div className="px-6 py-5 bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-bandhu-primary/30 rounded-2xl text-gray-100 shadow-lg shadow-bandhu-secondary/10">
            <ReactMarkdown
              rehypePlugins={[rehypeHighlight]}
              components={{
                code: ({node, inline, className, children}: any) => {
                  const isInline = !className?.includes('language-')
                  return !isInline ? (
                    <pre className="bg-black/50 p-4 rounded-lg overflow-auto my-4 border border-bandhu-primary/20">
                      <code className={className}>
                        {children}
                      </code>
                    </pre>
                  ) : (
                    <code className="bg-bandhu-primary/20 px-2 py-0.5 rounded text-sm text-bandhu-primary">
                      {children}
                    </code>
                  )
                },
                a: ({children, href}: any) => (
                  <a href={href} className="text-bandhu-primary hover:text-bandhu-secondary underline transition" target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
                h1: ({children}: any) => (
                  <h1 className="text-2xl font-bold my-4 text-bandhu-primary">
                    {children}
                  </h1>
                ),
                h2: ({children}: any) => (
                  <h2 className="text-xl font-bold my-3 text-bandhu-primary">
                    {children}
                  </h2>
                ),
                blockquote: ({children}: any) => (
                  <blockquote className="border-l-4 border-bandhu-secondary pl-4 my-4 italic text-gray-300 bg-bandhu-secondary/10 rounded-r py-2">
                    {children}
                  </blockquote>
                ),
                p: ({children}: any) => (
                  <p className="my-2 leading-7 text-gray-200">
                    {children}
                  </p>
                ),
                ul: ({children}: any) => (
                  <ul className="list-disc list-inside my-3 space-y-1 text-gray-200">
                    {children}
                  </ul>
                ),
                ol: ({children}: any) => (
                  <ol className="list-decimal list-inside my-3 space-y-1 text-gray-200">
                    {children}
                  </ol>
                ),
              }}
            >
              {msg.content}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  </div>
))
  )}
  
  {isSending && (
  <div className="mb-5 flex justify-center">
    <div className="w-full max-w-4xl">
      <div className="text-xs text-bandhu-secondary mb-2 font-medium flex items-center gap-2">
        <span className="text-lg">🌑</span> Ombrelien
      </div>
      <div className="px-6 py-5 bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-bandhu-primary/30 rounded-2xl text-gray-500 leading-relaxed animate-pulse">
        En train de réfléchir...
      </div>
    </div>
  </div>
)}
</div>

       {/* Input - Floating au-dessus, VRAIMENT centré */}
<div className="absolute bottom-8 left-80 right-0 flex justify-center pointer-events-none">
  <div className="w-full max-w-3xl px-5 pointer-events-auto">
    <div className="flex gap-3 items-end bg-blue-800/95 backdrop-blur-sm p-3 rounded-2xl shadow-2xl border border-blue-600">
      <textarea
  value={input}
  onChange={(e) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }}
  placeholder="Parlez à Ombrelien..."
  className="flex-1 px-4 py-2.5 bg-gray-900/80 text-white border border-gray-600 rounded-xl text-sm leading-tight resize-none overflow-y-auto focus:outline-none focus:ring-2 focus:ring-bandhu-primary focus:border-transparent placeholder-gray-500 scrollbar-bandhu"
  style={{ minHeight: '42px', maxHeight: '200px' }}
  onKeyPress={(e) => {
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
      
      {/* Click outside pour fermer les menus */}
      {openMenuId && (
        <div 
          className="fixed inset-0 z-10"
          onClick={() => setOpenMenuId(null)}
        />
      )}
    </div>
    </div>
  )
}