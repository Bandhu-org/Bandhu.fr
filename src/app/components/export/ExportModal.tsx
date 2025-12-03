'use client'

import { useState, useEffect, useCallback } from 'react'
import PreviewModal from './PreviewModal'
import { calculateMetrics } from '@/utils/exportMetrics'
import { threadId } from 'worker_threads'

interface Event {
  id: string
  content: string
  type: string
  role: string
  createdAt: string
  selected: boolean
}

interface Thread {
  threadId: string
  threadLabel: string
  threadDate: string
  events: Event[]
}

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  initialSelectedIds?: string[]
  preselectThreadId?: string  // ← NOUVELLE prop : thread à pré-sélectionner
}

// Configuration des limites par format
const FORMAT_LIMITS = {
  markdown: 500,
  pdf: 200,
  docx: 100  // Limite stricte pour DOCX
}

export default function ExportModal({ 
  isOpen, 
  onClose, 
  initialSelectedIds = [],
  preselectThreadId  // ← NOUVEAU NOM
}: ExportModalProps) {
  const [threads, setThreads] = useState<Thread[]>([])
  const [selectedFormat, setSelectedFormat] = useState<'markdown' | 'pdf' | 'docx'>('markdown')
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  
  // États unifiés pour la prévisualisation
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<{
    content: string
    metrics: any
  } | null>(null)

  // Calcul dynamique de la limite actuelle
  const currentLimit = FORMAT_LIMITS[selectedFormat]
  const allSelectedEvents = threads.flatMap(thread =>
    thread.events.filter(event => event.selected).map(event => event.id)
  )
  const limitedEvents = allSelectedEvents.slice(0, currentLimit)
  const exceededLimit = allSelectedEvents.length > currentLimit
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set())

  // Déclarer loadExportData AVANT le useEffect qui l'utilise
const loadExportData = useCallback(async () => {
  setIsLoading(true)
  try {
    const response = await fetch('/api/export/selection')
    const data = await response.json()
    if (data.success) {
      // Appliquer la sélection initiale si fournie
      // Appliquer la sélection initiale si fournie
const threadsWithSelection = data.data.map((thread: Thread) => ({
  ...thread,
  events: thread.events.map(event => ({
    ...event,
    // LOGIQUE REVISÉE :
    // 1. Si preselectThreadId existe → seulement CE thread est sélectionné
    // 2. Sinon, utiliser initialSelectedIds (checkboxes du chat)
    // 3. Sinon, false pour tout le monde
    selected: preselectThreadId
      ? thread.threadId === preselectThreadId  // true seulement pour le thread cible
      : initialSelectedIds.length > 0 
        ? initialSelectedIds.includes(event.id) // respecter les checkboxes existantes
        : false                                 // par défaut : false pour tous
  }))
}))
      setThreads(threadsWithSelection)

// Auto-expand les threads avec sélections + thread présélectionné
const threadsToExpand = new Set<string>()

// 1. Ajouter tous les threads qui ont au moins un message sélectionné
threadsWithSelection.forEach((thread: Thread) => {
  if (thread.events.some(event => event.selected)) {
    threadsToExpand.add(thread.threadId)
  }
})

// 2. Ajouter le thread présélectionné (si fourni)
if (preselectThreadId) {
  threadsToExpand.add(preselectThreadId)
}

setExpandedThreads(threadsToExpand)
    }
  } catch (error) {
    console.error('Erreur chargement données:', error)
  } finally {
    setIsLoading(false)
  }
}, [initialSelectedIds, preselectThreadId]) // ← N'OUBLIE PAS

// Charger les données au montage (APRÈS la déclaration)
useEffect(() => {
  if (isOpen) {
    loadExportData()
  }
}, [isOpen, loadExportData])

useEffect(() => {
  if (isOpen) {
    // Si pas de thread présélectionné, on reset l'expansion
    if (!preselectThreadId) {
      setExpandedThreads(new Set())
    }
  }
}, [isOpen, preselectThreadId])

// Scroll auto selon le contexte
useEffect(() => {
  if (threads.length === 0) return
  
  setTimeout(() => {
    if (preselectThreadId) {
      // CAS 1 : Menu thread → scroll vers le THREAD
      const threadElement = document.querySelector(`[data-thread-id="${preselectThreadId}"]`)
      if (threadElement) {
        threadElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        })
      }
    } else {
      // CAS 2 : Checkboxes chat → scroll vers premier MESSAGE sélectionné
      let firstSelectedEventId: string | null = null
      
      for (const thread of threads) {
        const selectedEvent = thread.events.find((event: Event) => event.selected)
        if (selectedEvent) {
          firstSelectedEventId = selectedEvent.id
          break
        }
      }
      
      if (firstSelectedEventId) {
        const element = document.querySelector(`[data-event-id="${firstSelectedEventId}"]`)
        element?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        })
      }
    }
  }, 100) // Délai pour laisser le DOM se mettre à jour
}, [threads, preselectThreadId])

// Fonction utilitaire partagée pour générer le contenu
const generateExportContent = useCallback(async (eventIds: string[], isPreview = false) => {
  const response = await fetch('/api/export/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      format: selectedFormat,
      selectedEvents: eventIds,
      options: { 
        includeTimestamps: true,
        preview: isPreview
      }
    })
  })
  return await response.json()
}, [selectedFormat])

  // Basculer la sélection d'un event
  const toggleEventSelection = (threadId: string, eventId: string) => {
  setThreads(prev => 
    prev.map(thread => 
      thread.threadId === threadId
        ? {
            ...thread,
            events: thread.events.map(event =>
              event.id === eventId
                ? { ...event, selected: !event.selected }
                : event
            )
          }
        : thread
    )
  )
}

  // Sélectionner/désélectionner tout
  const toggleSelectAll = (selected: boolean) => {
    setThreads(prev => 
      prev.map(thread => ({
        ...thread,
        events: thread.events.map(event => ({ ...event, selected }))
      }))
    )
  }

  // Expand/collapse une conversation
const toggleThreadExpansion = (threadId: string) => {
  setExpandedThreads(prev => {
    const newSet = new Set(prev)
    if (newSet.has(threadId)) {
      newSet.delete(threadId)
    } else {
      newSet.add(threadId)
    }
    return newSet
  })
}

// Expand/collapse toutes les conversations
const toggleExpandAll = () => {
  if (expandedThreads.size === threads.length) {
    // Tout est expand → tout collapse
    setExpandedThreads(new Set())
  } else {
    // Tout expand
    setExpandedThreads(new Set(threads.map(t => t.threadId)))
  }
}

  // Préparer et afficher la prévisualisation
  const handlePreview = async () => {
  console.log('🔄 handlePreview appelé')
  console.log('📊 showPreview avant:', showPreview)

  const allSelectedEvents = threads.flatMap(thread =>
    thread.events.filter(event => event.selected).map(event => event.id)
  )
  const selectedEvents = allSelectedEvents.slice(0, currentLimit)
  
  if (selectedEvents.length === 0) {
    alert('Sélectionne au moins un message à exporter !')
    return
  }

  setIsLoading(true)
  try {
    const result = await generateExportContent(selectedEvents, true)
    
    if (!result.success) {
      throw new Error(result.error)
    }

    const metrics = calculateMetrics(result.content, selectedFormat, selectedEvents.length)
    
    // 🔥 VERSION BLINDÉE
    console.log('🚀 SET preview data + showPreview true')
    setPreviewData({
      content: result.content,
      metrics
    })
    
    // Double assurance avec timeout
    setShowPreview(true)
    setTimeout(() => {
      console.log('🛡️  Double check showPreview:', showPreview)
      setShowPreview(true) // Force une deuxième fois
    }, 100)
    
  } catch (error) {
    console.error('Erreur génération preview:', error)
    alert('❌ Erreur lors de la génération de l\'aperçu')
    setShowPreview(false)
  } finally {
    setIsLoading(false)
  }
}

  // Exporter les données sélectionnées
  const handleExportConfirm = async (): Promise<void> => {
    setIsExporting(true)
    try {
      const result = await generateExportContent(limitedEvents, false)

      if (!result.success) {
        throw new Error(result.error)
      }

      // Télécharger le fichier
      const downloadResponse = await fetch('/api/export/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: selectedFormat,
          content: result.content,
          filename: `bandhu-export-${new Date().toISOString().split('T')[0]}.${
            selectedFormat === 'markdown' ? 'md' : selectedFormat
          }`
        })
      })

      if (downloadResponse.ok) {
        const blob = await downloadResponse.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `bandhu-export-${new Date().toISOString().split('T')[0]}.${
          selectedFormat === 'markdown' ? 'md' : selectedFormat
        }`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)

        alert(`✅ Export réussi ! ${limitedEvents.length} messages exportés.${
          exceededLimit ? ` (${allSelectedEvents.length - currentLimit} ignorés)` : ''
        }`)
        setShowPreview(false)
        onClose()
      }
    } catch (error) {
      console.error('Erreur export:', error)
      alert('❌ Erreur lors de l\'export')
    } finally {
      setIsExporting(false)
    }
  }

  // Calculer les stats
  const totalEvents = threads.reduce((sum, thread) => sum + thread.events.length, 0)
  const selectedEventsCount = threads.reduce((sum, thread) => 
    sum + thread.events.filter(event => event.selected).length, 0
  )
  const allSelected = totalEvents > 0 && selectedEventsCount === totalEvents

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-gray-600 transform transition-all duration-300 scale-95 animate-in fade-in-0 zoom-in-95">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">Exporter mes conversations</h2>
                <p className="text-white/80 mt-2">
                  Sélectionne les messages à exporter et choisis ton format
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white text-2xl transition-colors"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Barre de contrôle sticky */}
          <div className="bg-gray-700/50 border-b border-gray-600 p-4 sticky top-0 z-10">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded bg-gray-600 border-gray-500 focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium">
                    {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </span>
                </label>

                <button
  onClick={toggleExpandAll}
  className="text-sm font-medium text-gray-300 hover:text-white transition-colors flex items-center gap-2 px-3 py-1 rounded hover:bg-gray-600/50"
>
  {expandedThreads.size === threads.length ? '↥ Tout replier' : '↧ Tout déplier'}
</button>
                
                <span className="text-gray-300 text-sm">
                  {selectedEventsCount} / {totalEvents} messages sélectionnés
                </span>

                {/* Indicateur de limite */}
                {exceededLimit && (
                  <span className="text-orange-400 text-sm flex items-center gap-1">
                    ⚠️ Limite {currentLimit} messages ({allSelectedEvents.length - currentLimit} ignorés)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                {/* Indicateur de limite par format */}
                <div className="text-xs text-gray-400 bg-gray-600/50 px-2 py-1 rounded">
                  Limite : {currentLimit} messages
                </div>

                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value as any)}
                  className="bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="markdown">Markdown (.md)</option>
                  <option value="pdf">PDF</option>
                  <option value="docx">Word (.docx)</option>
                </select>

                <button
                  onClick={handlePreview}
                  disabled={isLoading || limitedEvents.length === 0}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Préparation...
                    </>
                  ) : (
                    <>
                      <span>👀</span>
                      Prévisualiser ({limitedEvents.length})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Liste des conversations */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="flex items-center gap-3 text-gray-400">
                  <div className="w-5 h-5 border-2 border-gray-500 border-t-purple-500 rounded-full animate-spin" />
                  Chargement de vos conversations...
                </div>
              </div>
            ) : threads.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-4">💬</div>
                Aucune conversation à exporter pour le moment.
              </div>
            ) : (
              <div className="space-y-6">
                {threads.map((thread, threadIndex) => (
                  <div 
  key={thread.threadId} 
  className="bg-gray-700/30 rounded-lg border border-gray-600/50 overflow-hidden"
  data-thread-id={thread.threadId}  // ← IMPORTANT
>
  {/* En-tête de conversation (toujours visible) */}
  <div 
    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-600/30 transition-colors"
    onClick={() => toggleThreadExpansion(thread.threadId)}
  >
    <button
      className="text-gray-400 hover:text-white transition-transform"
      onClick={(e) => {
        e.stopPropagation()
        toggleThreadExpansion(thread.threadId)
      }}
    >
      {expandedThreads.has(thread.threadId) ? '▾' : '▸'}
    </button>
    
    <input
      type="checkbox"
      checked={thread.events.every(event => event.selected)}
      onChange={(e) => {
        e.stopPropagation()
        const newSelected = e.target.checked
        setThreads(prev => {
          const newThreads = [...prev]
          newThreads[threadIndex].events = 
            newThreads[threadIndex].events.map(event => ({
              ...event,
              selected: newSelected
            }))
          return newThreads
        })
      }}
      className="w-4 h-4 rounded bg-gray-600 border-gray-500 focus:ring-2 focus:ring-purple-500"
      onClick={(e) => e.stopPropagation()}
    />
    
    <div className="flex-1">
      <h3 className="font-semibold text-white">{thread.threadLabel}</h3>
      <div className="flex items-center gap-3 mt-1">
        <span className="text-gray-400 text-sm">
          {thread.events.length} messages
        </span>
        <span className="text-gray-500 text-xs">
          {thread.events.filter(e => e.selected).length} sélectionnés
        </span>
      </div>
    </div>
  </div>

  {/* Messages (seulement si expandé) */}
  {expandedThreads.has(thread.threadId) && (
    <div className="border-t border-gray-600/50 p-4 bg-gray-800/20">
      <div className="space-y-2">
        {thread.events.map((event, eventIndex) => (
          <label
            key={event.id}
            data-event-id={event.id}
            className={`flex items-start gap-3 p-3 rounded-lg transition-colors group cursor-pointer ${
              event.selected 
                ? 'bg-purple-500/20 border border-purple-500/30' 
                : 'hover:bg-gray-600/30'
            }`}
          >
            <input
              type="checkbox"
              checked={event.selected}
              onChange={() => toggleEventSelection(thread.threadId, event.id)}
              className="w-4 h-4 rounded bg-gray-600 border-gray-500 mt-1 flex-shrink-0 focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-sm font-medium ${
                  event.role === 'user' ? 'text-blue-400' : 'text-purple-400'
                }`}>
                  {event.role === 'user' ? 'Vous' : 'Assistant'}
                </span>
                <span className="text-gray-500 text-xs">
                  {new Date(event.createdAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <p className="text-gray-300 text-sm line-clamp-2 group-hover:text-white transition-colors">
                {event.content}
              </p>
            </div>
          </label>
        ))}
      </div>
    </div>
  )}
</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Modal de prévisualisation */}
      {previewData && (
        <PreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          onConfirm={handleExportConfirm}
          onModify={() => setShowPreview(false)}
          format={selectedFormat}
          selectedEventsCount={limitedEvents.length}
          previewContent={previewData.content}
          metadata={{
            pageCount: previewData.metrics.estimatedPages,
            estimatedSize: previewData.metrics.fileSize,
            eventCount: previewData.metrics.messageCount
          }}
        />
      )}
    </>
  )
}