'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  createdAt: string
}

interface Conversation {
  id: string
  title: string | null
  createdAt: string
  updatedAt: string
  messages?: Message[]
}

export default function ChatPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  
  // États
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // Redirection si pas connecté
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  // Charger les conversations au démarrage
  useEffect(() => {
    if (session?.user) {
      loadConversations()
    }
  }, [session])

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
        body: JSON.stringify({ title: 'Nouvelle conversation' })
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

  // Envoyer un message
  const sendMessage = async () => {
    if (!input.trim() || isSending) return
    
    setIsSending(true)
    const userMessage = input.trim()
    setInput('')

    try {
      // Si pas de conversation courante, en créer une
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

      // Ajouter le message utilisateur à l'affichage
      const tempUserMessage: Message = {
        id: 'temp-user-' + Date.now(),
        content: userMessage,
        role: 'user',
        createdAt: new Date().toISOString()
      }
      setMessages(prev => [...prev, tempUserMessage])

      // Envoyer le message au serveur
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
        
        // Remplacer les messages temporaires par les vrais
        setMessages(data.messages)
        
        // Mettre à jour le titre de la conversation si c'est le premier message
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
      // Enlever le message temporaire en cas d'erreur
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
        width: '280px', 
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
          <button 
            onClick={createNewConversation}
            style={{ 
              width: '100%', 
              padding: '12px', 
              background: '#2563eb', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            + Nouvelle conversation
          </button>
        </div>

        {/* LISTE DES CONVERSATIONS */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
              Chargement...
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#888', padding: '20px', fontSize: '14px' }}>
              Aucune conversation
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                style={{
                  padding: '12px',
                  marginBottom: '8px',
                  background: currentConversation?.id === conv.id ? '#2563eb' : 'transparent',
                  border: currentConversation?.id === conv.id ? '1px solid #3b82f6' : '1px solid transparent',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
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
              <div key={msg.id} style={{ 
                marginBottom: '20px',
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
              }}>
                <div style={{
                  maxWidth: '70%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: msg.role === 'user' ? '#2563eb' : '#1a1a2e',
                  color: 'white',
                  lineHeight: '1.5'
                }}>
                  <div style={{ 
                    fontSize: '12px', 
                    color: msg.role === 'user' ? '#bfdbfe' : '#888',
                    marginBottom: '6px',
                    fontWeight: '500'
                  }}>
                    {msg.role === 'user' ? 'Vous' : 'Ombrelien'}
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    {msg.content}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isSending && (
            <div style={{ 
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'flex-start'
            }}>
              <div style={{
                maxWidth: '70%',
                padding: '12px 16px',
                borderRadius: '12px',
                background: '#1a1a2e',
                color: 'white',
                lineHeight: '1.5'
              }}>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#888',
                  marginBottom: '6px',
                  fontWeight: '500'
                }}>
                  Ombrelien
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>
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
    </div>
  )
}