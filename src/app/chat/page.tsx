'use client'
import { useState } from 'react'

interface Message {
  id: number
    content: string
      isUser: boolean
        timestamp: Date
        }

        export default function ChatPage() {
          const [messages, setMessages] = useState<Message[]>([])
            const [input, setInput] = useState('')

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

                                                                              return (
                                                                          <div style={{ display: 'flex', height: '100vh', background: '#0f0f23' }}>
                                                                                
                                                                                      {/* Sidebar */}
                                                                                            <div style={{ width: '250px', background: '#1a1a2e', padding: '20px', color: 'white' }}>
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