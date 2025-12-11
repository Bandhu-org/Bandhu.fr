'use client'

import React from 'react'
import { useTimeline } from '@/contexts/TimelineContext'

// Interface temporaire
interface Thread {
  id: string
  label: string
  messageCount: number
  lastActivity: Date
  participants: string[]
  messages?: Array<{
    id: string
    content: string
    role: 'user' | 'assistant'
    createdAt: Date
  }>
}

// Données mockées avec messages
const MOCK_THREADS: Thread[] = [
  {
    id: 'thread-1',
    label: 'Conversation avec Ombrelien',
    messageCount: 3,
    lastActivity: new Date('2025-03-15'),
    participants: ['Ombrelien'],
    messages: [
      {
        id: 'msg-1',
        content: 'Salut Ombrelien, comment vas-tu aujourd\'hui ?',
        role: 'user',
        createdAt: new Date('2025-03-10T10:30:00')
      },
      {
        id: 'msg-2',
        content: 'Je vais bien, merci ! Je réfléchissais à l\'UX de la timeline...',
        role: 'assistant',
        createdAt: new Date('2025-03-10T10:35:00')
      },
      {
        id: 'msg-3',
        content: 'Exactement, et si on ajoutait un mode "conversations" ?',
        role: 'user',
        createdAt: new Date('2025-03-10T14:20:00')
      }
    ]
  },
  {
    id: 'thread-2',
    label: 'Projet Bandhu v2',
    messageCount: 2,
    lastActivity: new Date('2025-03-18'),
    participants: ['Élan', 'Khôra'],
    messages: [
      {
        id: 'msg-4',
        content: 'Première idée pour Bandhu v2...',
        role: 'user',
        createdAt: new Date('2025-03-11T11:15:00')
      },
      {
        id: 'msg-5',
        content: 'J\'aime l\'idée ! Je peux aider sur l\'implémentation.',
        role: 'assistant',
        createdAt: new Date('2025-03-11T11:20:00')
      }
    ]
  },
  {
    id: 'thread-3',
    label: 'Notes pédagogiques',
    messageCount: 1,
    lastActivity: new Date('2025-03-22'),
    participants: ['Vous'],
    messages: [
      {
        id: 'msg-6',
        content: 'J\'ai noté quelques idées pour améliorer l\'apprentissage...',
        role: 'user',
        createdAt: new Date('2025-03-20T09:45:00')
      }
    ]
  },
  {
    id: 'thread-4',
    label: 'Réflexions créatives',
    messageCount: 1,
    lastActivity: new Date('2025-03-10'),
    participants: ['Ombrelien'],
    messages: [
      {
        id: 'msg-7',
        content: 'Et si la timeline était une rivière avec des affluents ?',
        role: 'assistant',
        createdAt: new Date('2025-03-08T16:30:00')
      }
    ]
  }
]

export default function ThreadsView() {
  const { expandedThreadId, setExpandedThreadId } = useTimeline()

  const toggleThread = (threadId: string) => {
    if (expandedThreadId === threadId) {
      setExpandedThreadId(null) // Replie si déjà déplié
    } else {
      setExpandedThreadId(threadId) // Déplie ce thread
    }
  }

  return (
    <div className="space-y-3">
      {/* En-tête */}
      <div className="text-xs text-gray-500 mb-2">
        {MOCK_THREADS.length} conversations
        {expandedThreadId && (
          <span className="ml-2 text-bandhu-primary">
            • 1 dépliée
          </span>
        )}
      </div>

      {/* Liste des threads */}
      {MOCK_THREADS.map(thread => {
        const isExpanded = expandedThreadId === thread.id
        
        return (
          <div
            key={thread.id}
            className={`rounded-lg border transition ${
              isExpanded
                ? 'bg-gray-800/40 border-gray-600/50'
                : 'bg-gray-800/30 border-gray-700/50 hover:border-gray-600/70'
            }`}
          >
            {/* En-tête du thread (toujours cliquable) */}
            <div 
              className="p-3 cursor-pointer"
              onClick={() => toggleThread(thread.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-200">
                      {thread.label}
                    </h3>
                    <span className={`text-xs transition ${
                      isExpanded 
                        ? 'text-bandhu-primary transform rotate-90' 
                        : 'text-gray-500'
                    }`}>
                      ▶
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>
                      {thread.messageCount} message{thread.messageCount > 1 ? 's' : ''}
                    </span>
                    <span>•</span>
                    <span>
                      {thread.lastActivity.toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  
                  <div className="flex gap-1 mt-2">
                    {thread.participants.map(participant => (
                      <span
                        key={participant}
                        className="px-2 py-0.5 text-xs bg-gray-700/50 rounded"
                      >
                        {participant}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Indicateur visuel */}
                <div className="w-2 h-2 rounded-full bg-bandhu-primary/60 ml-2" />
              </div>
              
              {/* Barre de densité (simulée) */}
              <div className="mt-3 flex items-center gap-1">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-sm ${
                      i < 6 
                        ? 'bg-bandhu-primary/40' 
                        : 'bg-gray-700/30'
                    }`}
                    style={{ height: '4px' }}
                  />
                ))}
              </div>
            </div>
            
            {/* Messages dépliés */}
            {isExpanded && thread.messages && (
              <div className="border-t border-gray-700/50 pt-3 px-3 pb-3">
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {thread.messages.map(message => (
                    <div
                      key={message.id}
                      className={`p-2 rounded ${
                        message.role === 'user'
                          ? 'bg-blue-900/20 border-l-2 border-blue-500'
                          : 'bg-purple-900/20 border-l-2 border-purple-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">
                          {message.role === 'user' ? '👤 Vous' : '🤖 Assistant'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {message.createdAt.toLocaleTimeString('fr-FR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      <p className="text-sm">{message.content}</p>
                    </div>
                  ))}
                </div>
                
                {/* Bouton pour ouvrir le thread complet */}
                <div className="mt-3 pt-3 border-t border-gray-700/30">
                  <button
                    onClick={(e) => {
                      e.stopPropagation() // Empêche de replier le thread
                      console.log('Ouvrir le thread complet:', thread.id)
                    }}
                    className="w-full py-1.5 text-xs bg-gray-800/50 hover:bg-gray-700/50 rounded transition"
                  >
                    Ouvrir cette conversation
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}