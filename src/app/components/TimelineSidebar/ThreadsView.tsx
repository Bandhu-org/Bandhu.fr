'use client'

import React, { useState, useEffect } from 'react'
import { useTimeline } from '@/contexts/TimelineContext'

interface ThreadMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  createdAt: Date
}

interface Thread {
  id: string
  label: string
  messageCount: number
  lastActivity: Date
  participants: string[]
  messages: ThreadMessage[]
}

export default function ThreadsView() {
  const { expandedThreadIds, toggleThreadExpanded, collapseThread } = useTimeline()
  const [fullyExpandedThreadId, setFullyExpandedThreadId] = useState<string | null>(null)
  const [threads, setThreads] = useState<Thread[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Charger les threads au montage
  useEffect(() => {
    loadThreads()
  }, [])

  const loadThreads = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/threads')
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.threads || !Array.isArray(data.threads)) {
        throw new Error('Format de réponse invalide')
      }
      
      // Formatter selon TON format d'API
      const formattedThreads = data.threads.map((thread: any) => ({
        id: thread.id,
        label: thread.label || 'Sans titre',
        messageCount: thread.messageCount || 0,
        lastActivity: new Date(thread.lastActivity || thread.updatedAt || Date.now()),
        participants: thread.participants || ['Vous'],
        messages: (thread.messages || []).map((msg: any) => ({
          id: msg.id,
          content: msg.content?.length > 100 
            ? msg.content.substring(0, 100) + '...' 
            : msg.content || '',
          role: msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user',
          createdAt: new Date(msg.createdAt || Date.now())
        }))
      }))
      
      setThreads(formattedThreads)
      console.log(`✅ Chargé ${formattedThreads.length} conversations`)
      
    } catch (err) {
      console.error('❌ Erreur chargement threads:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleThread = (threadId: string) => {
    toggleThreadExpanded(threadId)
    if (fullyExpandedThreadId === threadId) {
      setFullyExpandedThreadId(null)
    }
  }

  const toggleFullyExpanded = (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setFullyExpandedThreadId(prev => prev === threadId ? null : threadId)
  }

  // États de chargement/erreur
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-bandhu-primary"></div>
          <p className="mt-2 text-sm text-gray-500">Chargement des conversations...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-4xl mb-3 opacity-30">⚠️</div>
          <p className="text-gray-500">Erreur de chargement</p>
          <p className="text-xs text-gray-600 mt-1">{error}</p>
          <button
            onClick={loadThreads}
            className="mt-4 px-4 py-2 text-sm bg-bandhu-primary/20 text-bandhu-primary rounded-lg hover:bg-bandhu-primary/30 transition"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  if (threads.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-4xl mb-3 opacity-30">💬</div>
          <p className="text-gray-500">Aucune conversation</p>
          <p className="text-xs text-gray-600 mt-1">Commencez à discuter avec vos Bandhus</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* En-tête avec bouton "Tout replier" */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-gray-500">
          {threads.length} conversation{threads.length > 1 ? 's' : ''}
          {expandedThreadIds.length > 0 && (
            <span className="ml-2 text-bandhu-primary">
              • {expandedThreadIds.length} dépliée{expandedThreadIds.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {expandedThreadIds.length > 0 && (
          <button
            onClick={() => {
              expandedThreadIds.forEach(threadId => {
                collapseThread(threadId)
              })
            }}
            className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800/50"
          >
            Tout replier
          </button>
        )}
      </div>

      {/* Liste des threads */}
      {threads.map(thread => {
        const isExpanded = expandedThreadIds.includes(thread.id)
        const isFullyExpanded = fullyExpandedThreadId === thread.id
        
        return (
          <div
            key={thread.id}
            className={`rounded-lg border transition ${
              isExpanded
                ? 'bg-gray-800/40 border-gray-600/50'
                : 'bg-gray-800/30 border-gray-700/50 hover:border-gray-600/70'
            }`}
          >
            {/* En-tête du thread */}
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
                        ? 'text-bandhu-primary' 
                        : 'text-gray-500'
                    }`}>
                      {isExpanded ? '▼' : '▶'}
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
                    {thread.participants.map((participant, index) => (
                      <span
                        key={index}
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
            </div>
            
            {/* Messages dépliés */}
            {isExpanded && thread.messages && thread.messages.length > 0 && (
              <div className={`border-t border-gray-700/50`}>
                {/* En-tête interne avec bouton "déplier en entier" */}
                <div className="pt-3 px-3 flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {thread.messages.length} message{thread.messages.length > 1 ? 's' : ''} récents
                  </div>
                  <button
                    onClick={(e) => toggleFullyExpanded(thread.id, e)}
                    className="text-xs text-bandhu-primary hover:text-bandhu-secondary px-2 py-1 rounded hover:bg-gray-800/50"
                  >
                    {isFullyExpanded ? '↸ Replier' : '↴ Déplier en entier'}
                  </button>
                </div>
                
                {/* Conteneur scrollable */}
                <div 
                  className={`overflow-y-auto px-3 my-3 ${
                    isFullyExpanded 
                      ? 'max-h-[400px]' 
                      : 'max-h-48'
                  } pr-2`}
                >
                  <div className="space-y-2">
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
                            {new Date(message.createdAt).toLocaleTimeString('fr-FR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        <p className="text-sm">{message.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Bouton pour ouvrir le thread complet */}
                <div className="pt-3 px-3 border-t border-gray-700/30 pb-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      console.log('Ouvrir le thread complet:', thread.id)
                      // TODO: Naviguer vers le thread
                    }}
                    className="w-full py-1.5 text-xs bg-gray-800/50 hover:bg-gray-700/50 rounded transition"
                  >
                    Ouvrir cette conversation dans le chat
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