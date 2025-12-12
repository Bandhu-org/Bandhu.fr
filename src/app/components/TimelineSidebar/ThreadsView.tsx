// src/components/TimelineSidebar/ThreadsView.tsx
'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useTimeline, type TimelineEvent } from '@/contexts/TimelineContext'

interface ThreadGroup {
  id: string
  label: string
  messageCount: number
  lastActivity: Date
  events: TimelineEvent[]
}

export default function ThreadsView() {
  const { densityLevel, getItemHeight, selectedEventIds, toggleEventSelection } = useTimeline()
  const [threads, setThreads] = useState<ThreadGroup[]>([])
  const [expandedThreadIds, setExpandedThreadIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const itemHeight = getItemHeight()

  useEffect(() => {
  loadThreads()
}, [])  // Garde vide pour le chargement initial

// MAIS AJOUTE UN EFFET POUR selectedEventIds :
useEffect(() => {
  // Ce code s'exécute à chaque changement de selectedEventIds
  console.log('🔵 selectedEventIds changed:', selectedEventIds.length)
  // Forcer un re-render des events
}, [selectedEventIds])

  const loadThreads = async () => {
    console.log('🔍 [THREADS] Start loading...')
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('📡 [THREADS] Fetching /api/threads')
      const response = await fetch('/api/threads/timeline')
      console.log('📥 [THREADS] Response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`)
      }
      
      const data = await response.json()
      console.log('✅ [THREADS] Data received:', data)
      
      const formattedThreads: ThreadGroup[] = data.threads.map((thread: any) => ({
        id: thread.id,
        label: thread.label || 'Sans titre',
        messageCount: thread.messageCount || 0,
        lastActivity: new Date(thread.lastActivity || thread.updatedAt),
        events: (thread.events || []).map((e: any) => ({
          id: e.id,
          createdAt: new Date(e.createdAt),
          role: e.role as 'user' | 'assistant' | 'system',
          contentPreview: e.content?.length > 100 
            ? e.content.substring(0, 100) + '...' 
            : e.content || '',
          threadId: thread.id,
          threadLabel: thread.label || 'Sans titre',
          userId: e.userId || '',
          userName: e.user?.name
        }))
      }))
      
      setThreads(formattedThreads)
      console.log(`✅ Chargé ${formattedThreads.length} threads`)
      
    } catch (err) {
      console.error('❌ [THREADS] Error:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }

const handleEventClick = useCallback(async (eventId: string, threadId: string) => {
  if (densityLevel === 0) {
    // 1. Charge le thread
    if (typeof window !== 'undefined' && (window as any).loadThread) {
      await (window as any).loadThread(threadId)
    }
    
    // 2. Scroll après un délai
    setTimeout(() => {
      const targetElement = document.querySelector(`[data-message-id="${eventId}"]`)
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        targetElement.classList.add('timeline-event-highlight')
        setTimeout(() => {
          targetElement.classList.remove('timeline-event-highlight')
        }, 1500)
      }
    }, 500) // Délai pour laisser le thread se charger
  }
}, [densityLevel])

  const toggleThread = (threadId: string) => {
    setExpandedThreadIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(threadId)) {
        newSet.delete(threadId)
      } else {
        newSet.add(threadId)
      }
      return newSet
    })
  }

  // Re-calculer les events sélectionnés quand selectedEventIds change
const selectedEventsSet = useMemo(() => 
  new Set(selectedEventIds),
  [selectedEventIds]
)

  // ============================================================
  // RENDER HEADER SELON DENSITÉ
  // ============================================================
  const renderThreadHeader = useCallback((thread: ThreadGroup, isExpanded: boolean) => {
    const baseClasses = "cursor-pointer transition"
    
    
    switch (densityLevel) {
      case 0: // Détaillé (même hauteur qu'un event)
        return (
          <div
            onClick={() => toggleThread(thread.id)}
            className={`${baseClasses} p-3 bg-gray-800/40 hover:bg-gray-800/60`}
            style={{ height: itemHeight }}
          >
            <div className="flex items-center justify-between h-full">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm ${isExpanded ? 'text-bandhu-primary' : 'text-gray-400'}`}>
                    {isExpanded ? '▼' : '▶'}
                  </span>
                  <h3 className="font-medium text-gray-200">{thread.label}</h3>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 ml-6">
                  <span>{thread.messageCount} messages</span>
                  <span>•</span>
                  <span>{thread.lastActivity.toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
              <div className="w-2 h-2 rounded-full bg-bandhu-primary/60" />
            </div>
          </div>
        )

      case 1: // Condensé
        return (
          <div
            onClick={() => toggleThread(thread.id)}
            className={`${baseClasses} p-2 bg-gray-800/40 hover:bg-gray-800/60`}
            style={{ height: itemHeight }}
          >
            <div className="flex items-center justify-between h-full">
              <div className="flex items-center gap-2 flex-1">
                <span className={`text-xs ${isExpanded ? 'text-bandhu-primary' : 'text-gray-400'}`}>
                  {isExpanded ? '▼' : '▶'}
                </span>
                <span className="font-medium text-sm text-gray-200 truncate">{thread.label}</span>
                <span className="text-xs text-gray-500">({thread.messageCount})</span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-bandhu-primary/60" />
            </div>
          </div>
        )

      case 2: // Dense
        return (
          <div
            onClick={() => toggleThread(thread.id)}
            className={`${baseClasses} px-2 py-1 bg-gray-800/40 hover:bg-gray-800/60 flex items-center justify-between`}
            style={{ height: itemHeight }}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className={`text-xs ${isExpanded ? 'text-bandhu-primary' : 'text-gray-400'}`}>
                {isExpanded ? '▼' : '▶'}
              </span>
              <span className="text-xs text-gray-300 truncate">{thread.label}</span>
              <span className="text-xs text-gray-500">({thread.messageCount})</span>
            </div>
          </div>
        )

      case 3: // Bâtonnets
        return (
          <div
            onClick={() => toggleThread(thread.id)}
            className={`${baseClasses} px-2 bg-gray-800/50 hover:bg-gray-800/70 flex items-center gap-1`}
            style={{ height: itemHeight }}
          >
            <span className={`text-[10px] ${isExpanded ? 'text-bandhu-primary' : 'text-gray-500'}`}>
              {isExpanded ? '▼' : '▶'}
            </span>
            <span className="text-[10px] text-gray-400 truncate flex-1">
              {thread.label}
            </span>
            <span className="text-[10px] text-gray-600">{thread.messageCount}</span>
          </div>
        )

      case 4: // Ultra-dense
        return (
          <div
            onClick={() => toggleThread(thread.id)}
            className={`${baseClasses} px-1 bg-gray-800/60 hover:bg-gray-800/80`}
            style={{ height: itemHeight }}
            title={`${thread.label} (${thread.messageCount} messages)`}
          >
            <div className={`h-full w-full rounded-sm ${
              isExpanded ? 'bg-bandhu-primary/80' : 'bg-gray-600/80'
            }`} />
          </div>
        )
    }
  }, [densityLevel, itemHeight])

  // ============================================================
  // RENDER EVENT SELON DENSITÉ
  // ============================================================
  const renderEvent = useCallback((event: TimelineEvent) => {
    const isSelected = selectedEventIds.includes(event.id)
    switch (densityLevel) {
      case 0:
  return (
    <div 
      className="relative pl-6 h-full cursor-pointer"
      onClick={() => densityLevel === 0 && handleEventClick(event.id, event.threadId)}
    >
            {/* Barre latérale cliquable avec tooltip et animations */}
<div 
  className="absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 group"
  onClick={(e) => {
    e.stopPropagation()
    toggleEventSelection(event.id)
  }}
  title={isSelected ? "Désélectionner" : "Sélectionner"}
>
  {/* Effet de halo pulse quand sélectionné */}
  {isSelected && (
    <div className="absolute inset-0 -m-1 rounded-full bg-bandhu-primary/30 animate-ping" />
  )}
  
  {/* Le point principal */}
  <div className={`
    relative w-3 h-3 rounded-full border-2 transition-all duration-300
    ${isSelected 
      ? 'bg-bandhu-primary border-bandhu-primary scale-125 shadow-lg shadow-bandhu-primary/30' 
      : event.role === 'user' 
        ? 'bg-blue-500/20 border-blue-400 hover:border-blue-300 hover:scale-110' 
        : event.role === 'assistant' 
          ? 'bg-purple-500/20 border-purple-400 hover:border-purple-300 hover:scale-110'
          : 'bg-gray-500/20 border-gray-400 hover:scale-110'
    }
  `} />
  
  {/* Animation d'onde quand sélectionné */}
  {isSelected && (
    <div className="absolute inset-0 -m-2 rounded-full bg-bandhu-primary/20 animate-pulse" />
  )}
  
  {/* Tooltip */}
  <div className="absolute left-1/2 bottom-full transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900/95 backdrop-blur-sm text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-gray-700 shadow-xl z-20">
    {isSelected ? 'Désélectionner' : 'Sélectionner'}
    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900/95 rotate-45 border-b border-r border-gray-700"></div>
  </div>
</div>
            <div className={`
  ml-6 p-3 rounded-lg border-2 transition-all duration-300 h-full flex flex-col
  ${isSelected
    ? 'bg-gradient-to-r from-bandhu-primary/5 to-purple-500/5 border-bandhu-primary shadow-md shadow-bandhu-primary/20'
    : 'bg-gray-800/30 border-gray-700/50 hover:border-gray-600/70'
  }
`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  event.role === 'user' ? 'bg-blue-900/30 text-blue-300' : 'bg-purple-900/30 text-purple-300'
                }`}>
                  {event.role === 'user' ? '👤' : '🌑'}
                </span>
                <span className="text-xs text-gray-400">
                  {event.createdAt.toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
              <p className="text-sm text-gray-200 line-clamp-2 flex-1">{event.contentPreview}</p>
            </div>
          </div>
        )

      case 1:
        return (
          <div className="relative pl-6 h-full">
            <div className="absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className={`w-2 h-2 rounded-full ${
                event.role === 'user' ? 'bg-blue-500/40' 
                : event.role === 'assistant' ? 'bg-purple-500/40' : 'bg-gray-500/40'
              }`} />
            </div>
            <div className="ml-6 p-2 rounded-lg bg-gray-800/20 border border-gray-700/30 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-400">
                  {event.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  event.role === 'user' ? 'bg-blue-900/20 text-blue-300' : 'bg-purple-900/20 text-purple-300'
                }`}>
                  {event.role === 'user' ? 'Vous' : 'Assistant'}
                </span>
              </div>
              <p className="text-xs text-gray-300 truncate flex-1">{event.contentPreview}</p>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="relative pl-4 h-full flex items-center">
            <div className="absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className={`w-1.5 h-1.5 rounded-full ${
                event.role === 'user' ? 'bg-blue-500/60' 
                : event.role === 'assistant' ? 'bg-purple-500/60' : 'bg-gray-500/60'
              }`} />
            </div>
            <div className="ml-4 flex items-center justify-between w-full pr-2">
              <span className="text-xs text-gray-400 truncate">
                {event.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-xs text-gray-300 truncate max-w-[60%]">{event.contentPreview}</span>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="relative pl-3 h-full flex items-center">
            <div className={`absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-6 rounded-sm ${
              event.role === 'user' ? 'bg-blue-500/70' 
              : event.role === 'assistant' ? 'bg-purple-500/70' : 'bg-gray-500/70'
            }`} />
            <div className="ml-3 text-[10px] text-gray-400 truncate w-full pr-2">
              {event.contentPreview.substring(0, 40)}
            </div>
          </div>
        )

      case 4:
        return (
          <div 
            className={`absolute left-0 right-0 mx-2 rounded-sm ${
              event.role === 'user' ? 'bg-blue-500/80' 
              : event.role === 'assistant' ? 'bg-purple-500/80' : 'bg-gray-500/80'
            }`}
            style={{ height: '6px' }}
            title={`${event.createdAt.toLocaleString()}: ${event.contentPreview}`}
          />
        )
    }
  }, [densityLevel, selectedEventIds, handleEventClick, toggleEventSelection])  // ← AJOUTE LES DÉPENDANCES

  // États de chargement
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-bandhu-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-4xl mb-3 opacity-30">⚠️</div>
          <p className="text-gray-500">Erreur</p>
          <p className="text-xs text-gray-600 mt-1">{error}</p>
          <button
            onClick={loadThreads}
            className="mt-4 px-4 py-2 text-sm bg-bandhu-primary/20 rounded hover:bg-bandhu-primary/30"
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
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {threads.map(thread => {
        const isExpanded = expandedThreadIds.has(thread.id)
        const threadHeight = isExpanded ? thread.events.length * itemHeight : 0

        return (
          <div key={thread.id} className="border border-gray-700/50 rounded overflow-hidden">
            {/* Header adaptatif */}
            {renderThreadHeader(thread, isExpanded)}

            {/* Events du thread */}
            {isExpanded && (
              <div style={{ height: threadHeight }} className="relative bg-gray-900/20">
                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-bandhu-primary/30 to-bandhu-secondary/30" />
                {thread.events.map((event, idx) => (
                  <div
  key={event.id}
  style={{
    position: 'absolute',
    top: idx * itemHeight,
    height: itemHeight,
    width: '100%'
  }}
  className={`px-4 ${densityLevel >= 3 ? 'py-0' : 'py-2'} ${
    densityLevel === 0 ? 'cursor-pointer' : ''
  }`}
  onClick={() => densityLevel === 0 && handleEventClick(event.id, event.threadId)}
>
  {renderEvent(event)}
</div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}