'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Message {
  id: number
  content: string
  isUser: boolean
  timestamp: Date
}

export default function ChatPage() {
  // 🔥 TOUS LES HOOKS AU DÉBUT
  const router = useRouter()
  const { data: session, status } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')

  // 🔥 useEffect pour redirection
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  // 🔥 FONCTIONS APRÈS LES HOOKS
  const sendMessage = async () => {
    if (!input.trim()) return
    
    const newMessage: Message = {
      id: Date.now(),
      content: input,
      isUser: true,
      timestamp: new Date()
    }
    
    setMessages([...messages, newMessage])
    setInput('')
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input,
          conversationId: "conv_test_123", // Pour l'instant hardcodé
          userId: "user_test_456" // Pour l'instant hardcodé
        })
      })
      
      const data = await response.json()
      
      const aiMessage: Message = {
        id: Date.now() + 1,
        content: data.response,
        isUser: false,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, aiMessage])
      
    } catch (error) {
      console.error('Error:', error)
    }
  }

  // 🔥 CONDITIONS DE RENDU
  console.log('Session:', session)
  console.log('Status:', status)

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (status === 'unauthenticated') {
    return null // useEffect va rediriger
  }

  // 🔥 RENDU PRINCIPAL
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0f0f23' }}>
      
      {/* Sidebar */}
      <div style={{ width: '250px', background: '#1a1a2e', padding: '20px', color: 'white' }}>
        
        {/* INFO USER */}
        <div style={{ marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '15px' }}>
          <p style={{ fontSize: '14px', color: '#888' }}>Connecté en tant que</p>
          <p style={{ fontWeight: 'bold' }}>{session?.user?.email}</p>
        </div>

        <h2 style={{ marginBottom: '20px' }}>Chat avec Ombrelien</h2>
        <button style={{ width: '100%', padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '5px' }}>
          + Nouvelle conversation
        </button>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* Messages */}
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
          {messages.map(msg => (
            <div key={msg.id} style={{ marginBottom: '15px', color: 'white' }}>
              <strong>{msg.isUser ? 'Vous' : 'Ombrelien'}:</strong> {msg.content}
            </div>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding: '20px', borderTop: '1px solid #333' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Parlez à Ombrelien..."
              style={{ flex: 1, padding: '10px', background: '#333', color: 'white', border: 'none', borderRadius: '5px' }}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={sendMessage} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '5px' }}>
              Envoyer
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}