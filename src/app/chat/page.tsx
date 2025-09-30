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
        
        // Charger la première conversation automatiquement
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
        body: JSON.stringify({ title: 'Nouvelle conversation',
          folderId: selectedFolderId })
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
        
        // Si c'était la conversation active, charger une autre
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

  // Envoyer un message (fonction existante)
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
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        background: '#0f0f23',
        color: 'white'
      }}>
        Chargement...
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0f0f23', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Sidebar */}
      <div style={{ 
        width: '320px', 
        background: '#1a1a2e', 
        padding: '20px', 
        color: 'white',
        borderRight: '1px solid #333',
        display: 'flex',
        flexDirection: 'column'
      }}>
        
        {/* INFO USER */}
        <div style={{ 
          marginBottom: '20px', 
          borderBottom: '1px solid #333', 
          paddingBottom: '15px' 
        }}>
          <p style={{ fontSize: '12px', color: '#888', margin: '0 0 5px 0' }}>Connecté en tant que</p>
          <p style={{ fontWeight: 'bold', margin: '0', fontSize: '14px' }}>{session?.user?.email}</p>
        </div>

        {/* HEADER */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#60a5fa' }}>Chat avec Ombrelien</h2>
          
          {/* Boutons d'action */}
          
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
  style={{
    padding: '10px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '8px'
  }}
>
  + Dossier
</button>


          <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
            <button 
              onClick={createNewConversation}
              style={{ 
                flex: 1,
                padding: '10px', 
                background: '#2563eb', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500'
              }}
            >
              + Nouvelle
            </button>
            
            <button 
              onClick={() => setSortOrder(sortOrder === 'date' ? 'name' : 'date')}
              style={{ 
                padding: '10px 12px', 
                background: '#374151', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
              title={`Trier par ${sortOrder === 'date' ? 'nom' : 'date'}`}
            >
              {sortOrder === 'date' ? '📅' : '🔤'}
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

        
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'visible' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
              Chargement...
            </div>
          ) : sortedConversations.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#888', padding: '20px', fontSize: '14px' }}>
              Aucune conversation
            </div>
          ) : (
            sortedConversations.map(conv => (
              <div
                key={conv.id}
                style={{
                  position: 'relative',
                  marginBottom: '8px',
                  background: currentConversation?.id === conv.id ? '#2563eb' : 'transparent',
                  border: currentConversation?.id === conv.id ? '1px solid #3b82f6' : '1px solid transparent',
                  borderRadius: '8px',
                  overflow: 'visible'
                }}
              >
                {editingId === conv.id ? (
                  // Mode édition
                  <div style={{ padding: '12px' }}>
                    <input
                      ref={editInputRef}
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') confirmEdit()
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      onBlur={confirmEdit}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        background: '#374151',
                        color: 'white',
                        border: '1px solid #60a5fa',
                        borderRadius: '4px',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    />
                  </div>
                ) : deleteConfirm === conv.id ? (
                  // Mode confirmation suppression
                  <div style={{ padding: '12px', background: '#dc2626' }}>
                    <div style={{ fontSize: '13px', marginBottom: '8px', color: 'white' }}>
                      Supprimer cette conversation ?
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => deleteConversation(conv.id)}
                        style={{
                          flex: 1,
                          padding: '4px 8px',
                          background: 'white',
                          color: '#dc2626',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: '500'
                        }}
                      >
                        Confirmer
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        style={{
                          flex: 1,
                          padding: '4px 8px',
                          background: 'transparent',
                          color: 'white',
                          border: '1px solid white',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  // Mode normal
                  <div
                    onClick={() => loadConversation(conv.id)}
                    style={{
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start'
                    }}
                    onMouseEnter={(e) => {
                      if (currentConversation?.id !== conv.id) {
                        e.currentTarget.style.background = '#333'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentConversation?.id !== conv.id) {
                        e.currentTarget.style.background = 'transparent'
                      }
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: '500',
                        marginBottom: '4px',
                        color: currentConversation?.id === conv.id ? 'white' : '#e5e5e5',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {conv.title || 'Conversation sans titre'}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: currentConversation?.id === conv.id ? '#bfdbfe' : '#888' 
                      }}>
                        {formatDate(conv.updatedAt)}
                      </div>
                    </div>
                    
                    {/* Menu d'actions */}
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenMenuId(openMenuId === conv.id ? null : conv.id)
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#888',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                          fontSize: '16px'
                        }}
                      >
                        ⋮
                      </button>
                      
                      {openMenuId === conv.id && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          background: '#374151',
                          border: '1px solid #4b5563',
                          borderRadius: '6px',
                          padding: '4px',
                          zIndex: 1000,
                          minWidth: '120px'
                        }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              console.log('Clique renommer pour:', conv.id)
                              startEditing(conv)
                            }}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              background: 'transparent',
                              border: 'none',
                              color: 'white',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              fontSize: '13px',
                              textAlign: 'left'
                            }}
                          >
                            ✏️ Renommer
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              console.log('Clique supprimer pour:', conv.id)
                              setDeleteConfirm(conv.id)
                              setOpenMenuId(null)
                            }}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              background: 'transparent',
                              border: 'none',
                              color: '#f87171',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              fontSize: '13px',
                              textAlign: 'left'
                            }}
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* Header Chat */}
        {currentConversation && (
          <div style={{ 
            padding: '20px', 
            borderBottom: '1px solid #333',
            background: '#16213e'
          }}>
            <h3 style={{ 
              margin: 0, 
              color: '#60a5fa', 
              fontSize: '16px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {currentConversation.title || 'Conversation'}
            </h3>
          </div>
        )}

        {/* Messages */}
        <div style={{ 
          flex: 1, 
          padding: '20px', 
          overflowY: 'auto',
          background: '#0f0f23'
        }}>
          {!currentConversation ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%',
              color: '#888',
              fontSize: '16px'
            }}>
              Sélectionnez une conversation ou créez-en une nouvelle
            </div>
          ) : messages.length === 0 ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%',
              color: '#888',
              fontSize: '16px'
            }}>
              Commencez votre conversation avec Ombrelien...
            </div>
          ) : (
            messages.map(msg => (
              msg.role === 'user' ? (
                <div key={msg.id} style={{ 
                  marginBottom: '20px',
                  display: 'flex',
                  justifyContent: 'flex-end'
                }}>
                  <div style={{
                    maxWidth: '85%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: '#2563eb',
                    color: 'white',
                    lineHeight: '1.5',
                    textAlign: 'left'
                  }}>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#bfdbfe',
                      marginBottom: '6px',
                      fontWeight: '500'
                    }}>
                      Vous
                    </div>
                    <div style={{ fontSize: '14px' }}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ) : (
                <div key={msg.id} style={{ 
                  marginBottom: '24px',
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center'
                }}>
                  <div style={{ 
                    width: '100%',
                    maxWidth: '800px'
                  }}>
                    <div style={{
                      fontSize: '12px', 
                      color: '#888',
                      marginBottom: '8px',
                      fontWeight: '500',
                      paddingLeft: '4px',
                      textAlign: 'left'
                    }}>
                      🌑 Ombrelien
                    </div>
                    
                    <div style={{
                      padding: '20px 24px',
                      background: 'rgba(26, 26, 46, 0.6)',
                      border: '1px solid rgba(96, 165, 250, 0.2)',
                      borderRadius: '12px',
                      color: 'white',
                      lineHeight: '1.6',
                      textAlign: 'left'
                    }}>
                      <ReactMarkdown
                        rehypePlugins={[rehypeHighlight]}
                        components={{
                          code: ({node, className, children, ...props}: any) => {
                            const inline = !className?.includes('language-')
                            return !inline ? (
                              <pre style={{
                                background: '#0f172a',
                                padding: '16px',
                                borderRadius: '8px',
                                overflow: 'auto',
                                margin: '12px 0',
                                border: '1px solid #334155'
                              }}>
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              </pre>
                            ) : (
                              <code style={{
                                background: '#334155',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.9em',
                                border: '1px solid #475569'
                              }} {...props}>
                                {children}
                              </code>
                            )
                          },
                          a: ({children, href}) => (
                            <a href={href} style={{color: '#60a5fa', textDecoration: 'underline'}} target="_blank" rel="noopener noreferrer">
                              {children}
                            </a>
                          ),
                          h1: ({children}) => (
                            <h1 style={{fontSize: '1.5em', margin: '20px 0 12px 0', color: '#60a5fa'}}>
                              {children}
                            </h1>
                          ),
                          h2: ({children}) => (
                            <h2 style={{fontSize: '1.3em', margin: '16px 0 10px 0', color: '#60a5fa'}}>
                              {children}
                            </h2>
                          ),
                          blockquote: ({children}) => (
                            <blockquote style={{
                              borderLeft: '4px solid #60a5fa',
                              paddingLeft: '16px',
                              margin: '16px 0',
                              fontStyle: 'italic',
                              color: '#cbd5e1',
                              background: 'rgba(96, 165, 250, 0.1)',
                              borderRadius: '4px',
                              padding: '12px 16px'
                            }}>
                              {children}
                            </blockquote>
                          ),
                          p: ({children}) => (
                            <p style={{margin: '8px 0', lineHeight: '1.7'}}>
                              {children}
                            </p>
                          )
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )
            ))
          )}
          
          {isSending && (
            <div style={{ 
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <div style={{ 
                width: '100%',
                maxWidth: '800px'
              }}>
                <div style={{
                  fontSize: '12px', 
                  color: '#888',
                  marginBottom: '8px',
                  fontWeight: '500',
                  paddingLeft: '4px'
                }}>
                  🌑 Ombrelien
                </div>
                <div style={{
                  padding: '20px 24px',
                  background: 'rgba(26, 26, 46, 0.6)',
                  border: '1px solid rgba(96, 165, 250, 0.2)',
                  borderRadius: '12px',
                  color: '#888',
                  lineHeight: '1.6'
                }}>
                  En train de réfléchir...
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ 
          padding: '20px', 
          borderTop: '1px solid #333',
          background: '#16213e'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Parlez à Ombrelien..."
              style={{ 
                flex: 1, 
                padding: '12px', 
                background: '#1a1a2e', 
                color: 'white', 
                border: '1px solid #333', 
                borderRadius: '8px',
                fontSize: '14px',
                lineHeight: '1.4',
                resize: 'none',
                minHeight: '44px',
                maxHeight: '120px',
                fontFamily: 'inherit'
              }}
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
              style={{ 
                padding: '12px 20px', 
                background: input.trim() && !isSending ? '#2563eb' : '#404040',
                color: 'white', 
                border: 'none', 
                borderRadius: '8px',
                cursor: input.trim() && !isSending ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '500',
                minHeight: '44px'
              }}
            >
              {isSending ? 'Envoi...' : 'Envoyer'}
            </button>
          </div>
        </div>

      </div>
      
      {/* Click outside pour fermer les menus */}
      {openMenuId && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 5 
          }}
          onClick={() => setOpenMenuId(null)}
        />
      )}
    </div>
  )
}