'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import React from 'react'
import PreviewModal from './PreviewModal'
import { calculateMetrics } from '@/utils/exportMetrics'
import { EXPORT_TEMPLATES, type ExportStyle, type PDFExportStyle } from '@/utils/exportTemplates'

// 1. Event d'abord
interface Event {
  id: string
  content: string
  type: string
  role: string
  createdAt: string
  selected: boolean
}

// 2. Thread ensuite (utilise Event)
interface Thread {
  threadId: string
  threadLabel: string
  threadDate: string
  events: Event[]
}

// 3. ExportModalProps enfin (utilise Thread)
interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  initialSelectedIds?: string[]
  preselectThreadId?: string
  onSelectionChange?: (selectedIds: string[]) => void  // ← NOUVEAU
  activeThreadId?: string 
}

const FORMAT_LIMITS = {
  markdown: 500,
  pdf: 50,
  docx: 100,
  html: 500  // ← AJOUTE
}
// 4. Fonction
function ExportModal({ 
  isOpen, 
  onClose, 
  initialSelectedIds = [],
  preselectThreadId,
  onSelectionChange,
  activeThreadId
}: ExportModalProps) {
  const [threads, setThreads] = useState<Thread[]>([])
  const [selectedFormat, setSelectedFormat] = useState<'markdown' | 'pdf' | 'docx' | 'html'>('markdown')
  const [exportStyle, setExportStyle] = useState<ExportStyle | PDFExportStyle | 'minimal'>('design')
//                                               ↑ Ajouter PDFExportStyle
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<{
    content: string
    metrics: any
  } | null>(null)

  const [eventToScrollTo, setEventToScrollTo] = useState<string | null>(null)

  const currentLimit = FORMAT_LIMITS[selectedFormat]
  const allSelectedEvents = threads.flatMap(thread =>
    thread.events.filter(event => event.selected).map(event => event.id)
  )
  const limitedEvents = selectedFormat === 'pdf'
  ? allSelectedEvents
  : allSelectedEvents.slice(0, currentLimit)
  const exceededLimit = allSelectedEvents.length > currentLimit
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set())
  const prevSelectedIdsRef = useRef<Set<string>>(new Set())
  const actionTimestampsRef = useRef<Map<string, number>>(new Map())


 // Garder une référence à jour de initialSelectedIds (sans re-render)
const initialIdsRef = useRef<string[]>(initialSelectedIds)

useEffect(() => {
  initialIdsRef.current = initialSelectedIds
}, [initialSelectedIds])
  

  const loadExportData = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/export/selection')
      const data = await response.json()
      if (data.success) {
        const threadsWithSelection = data.data.map((thread: Thread) => ({
          ...thread,
          events: thread.events.map(event => ({
            ...event,
            selected: preselectThreadId
              ? thread.threadId === preselectThreadId
              : initialSelectedIds.length > 0 
                ? initialSelectedIds.includes(event.id)
                : false
          }))
        }))
        setThreads(threadsWithSelection)

        const threadsToExpand = new Set<string>()
        threadsWithSelection.forEach((thread: Thread) => {
          if (thread.events.some(event => event.selected)) {
            threadsToExpand.add(thread.threadId)
          }
        })
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
  }, [initialSelectedIds, preselectThreadId])

  const [processedPreselectId, setProcessedPreselectId] = useState<string | null>(null)

useEffect(() => {
  if (isOpen && preselectThreadId && processedPreselectId !== preselectThreadId) {
    setExpandedThreads(prev => {
      const newSet = new Set(prev)
      newSet.add(preselectThreadId)
      return newSet
    })
    setProcessedPreselectId(preselectThreadId)
  }
  
  if (!isOpen) {
    setProcessedPreselectId(null)
  }
}, [isOpen, preselectThreadId, processedPreselectId])

  // État pour tracker le chargement initial
const [hasLoadedInitial, setHasLoadedInitial] = useState(false)

// Chargement UNIQUEMENT à la première ouverture
useEffect(() => {
  if (isOpen && !hasLoadedInitial) {
    loadExportData().then(() => {
      // ✅ SCROLL APRÈS le chargement complet
      if (initialSelectedIds.length > 0) {
        setTimeout(() => {
          const firstId = initialSelectedIds[0]
          const element = document.querySelector(`[data-event-id="${firstId}"]`)
          if (element) {
            element.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            })
          }
        }, 500) // Délai suffisant pour que tout soit rendu
      }
    })
    setHasLoadedInitial(true)
  }
  
  // Reset quand le modal ferme
  if (!isOpen) {
    setHasLoadedInitial(false)
  }
}, [isOpen])

// Gestion de l'expansion basée sur preselectThreadId
// Auto-expand les threads qui ont des messages sélectionnés
useEffect(() => {
  if (!isOpen || threads.length === 0) return
  
  const threadsWithSelection = new Set<string>()
  
  threads.forEach(thread => {
    if (thread.events.some(event => event.selected)) {
      threadsWithSelection.add(thread.threadId)
    }
  })
  
  if (threadsWithSelection.size > 0) {
    setExpandedThreads(prev => {
      const newSet = new Set(prev)
      threadsWithSelection.forEach(threadId => newSet.add(threadId))
      return newSet
    })
  }
}, [threads, isOpen, initialSelectedIds])

// Synchronisation des sélections depuis le chat (sans recharger l'API)
useEffect(() => {
  if (!isOpen) return
  
  setThreads(prev => prev.map(thread => ({
    ...thread,
    events: thread.events.map(event => ({
      ...event,
      selected: preselectThreadId
        ? thread.threadId === preselectThreadId
        : initialSelectedIds.includes(event.id)
    }))
  })))
}, [initialSelectedIds, preselectThreadId, isOpen])

// useEffect pour effectuer le scroll APRÈS le rendu
useEffect(() => {
  if (!eventToScrollTo) return
  
  // Donner le temps au DOM de se mettre à jour
  const timeoutId = setTimeout(() => {
    const element = document.querySelector(`[data-event-id="${eventToScrollTo}"]`)
    if (!element) {
      console.log('❌ Élément pas trouvé même après attente:', eventToScrollTo)
      return
    }
    
    const container = document.querySelector('.scrollbar-bandhu')
    if (!container) return
    
    // Vérifier si l'élément est visible
    const containerRect = container.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()
    
    const isVisible = (
      elementRect.top >= containerRect.top &&
      elementRect.bottom <= containerRect.bottom
    )
    
    // Scroll seulement si pas visible
    if (!isVisible) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      })
    }
    
    // Reset
    setEventToScrollTo(null)
  }, 300) // Délai plus long pour laisser React rendre
  
  return () => clearTimeout(timeoutId)
}, [eventToScrollTo])

// Scroll simple : seulement quand le Chat modifie la sélection
useEffect(() => {
  if (!isOpen || threads.length === 0) return
  
  const currentInitialIds = initialIdsRef.current
  
  // 1. Trouver le message qui vient d'être modifié PAR LE CHAT
  // (son statut a changé par rapport à ce qu'on avait reçu)
  let changedEventId: string | null = null
  
  // Parcourir à l'envers pour trouver le PLUS RÉCENT visuellement
  for (let i = threads.length - 1; i >= 0; i--) {
    const thread = threads[i]
    for (let j = thread.events.length - 1; j >= 0; j--) {
      const event = thread.events[j]
      const wasSelected = currentInitialIds.includes(event.id)
      const isSelected = event.selected
      
      // Si différent → le Chat a modifié ce message
      if (wasSelected !== isSelected) {
        changedEventId = event.id
        break
      }
    }
    if (changedEventId) break
  }
  
  // 2. Si aucun changement détecté → c'est ExportModal qui a modifié → on ne scroll pas
  if (!changedEventId) return
  
  // 3. Planifier le scroll vers ce message
  setEventToScrollTo(changedEventId)
  
}, [threads, isOpen, initialSelectedIds]) // initialSelectedIds ajouté

// Flag pour tracker si c'est la première ouverture
const [hasScrolledInitial, setHasScrolledInitial] = useState(false)

// ✅ Scroll initial UNIQUEMENT à la première ouverture
useEffect(() => {
  if (!isOpen) {
    setHasScrolledInitial(false) // Reset quand on ferme
    return
  }
  
  if (hasScrolledInitial || threads.length === 0 || initialSelectedIds.length === 0) return
  
  // Attendre que tout soit rendu
  const timeoutId = setTimeout(() => {
    const firstId = initialSelectedIds[0]
    const element = document.querySelector(`[data-event-id="${firstId}"]`)
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      })
      setHasScrolledInitial(true) // Marquer comme scrollé
    }
  }, 600)
  
  return () => clearTimeout(timeoutId)
}, [isOpen, threads.length]) // ← ENLÈVE initialSelectedIds.length

// Fonction pour obtenir les styles disponibles selon le format

const getAvailableStyles = (format: 'markdown' | 'pdf' | 'docx' | 'html') => {
  switch (format) {
    case 'markdown':
      return ['design', 'sobre']  // ← 2 options
    case 'html':
      return ['design']  // ← 1 option pour l'instant
    case 'pdf':
       return ['design-color', 'design-bw', 'minimal-bw']  // ← minimal-bw au lieu de minimal
    case 'docx':
      return ['design']  // ← 1 option
    default:
      return ['design']
  }
}


const mapStyleForAPI = (style: string, format: string): string => {
  // Pour PDF, convertir 'minimal-bw' en 'minimal-bw' (même nom)
  if (format === 'pdf') {
    // Les styles PDF sont déjà les bons pour l'API
    // design-color, design-bw, minimal-bw
    return style
  }
  
  // Pour HTML, pour l'on garde 'design'
  if (format === 'html') {
    return 'design'  // Une seule option pour l'instant
  }
  
  // Pour Markdown et DOCX, garder tel quel
  return style
}

  const generateExportContent = useCallback(async (eventIds: string[], isPreview = false) => {
    const response = await fetch('/api/export/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: selectedFormat,
        selectedEvents: eventIds,
        options: { 
  includeTimestamps: true,
  preview: isPreview,
  style: mapStyleForAPI(exportStyle as string, selectedFormat)
}

      })
    })
    return await response.json()
  }, [selectedFormat, exportStyle])

  const toggleEventSelection = (threadId: string, eventId: string) => {
  setThreads(prev => {
    const newThreads = prev.map(thread => 
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
    
    // Calculer les nouveaux IDs sélectionnés
    const newSelectedIds = newThreads.flatMap(thread =>
      thread.events.filter(event => event.selected).map(event => event.id)
    )
    
    // Notifier le parent (ChatPage) AVEC UN DÉLAI
    setTimeout(() => {
      onSelectionChange?.(newSelectedIds)
    }, 0)
    
    return newThreads
  })
}

  const toggleSelectAll = (selected: boolean) => {
  setThreads(prev => {
    const newThreads = prev.map(thread => ({
      ...thread,
      events: thread.events.map(event => ({ ...event, selected }))
    }))
    
    // Calculer les nouveaux IDs sélectionnés
    const newSelectedIds = selected 
      ? newThreads.flatMap(thread => thread.events.map(event => event.id))
      : [] // Si tout désélectionner
    
    // Notifier le parent (ChatPage)
    // Notifier le parent (ChatPage) AVEC UN DÉLAI
setTimeout(() => {
  onSelectionChange?.(newSelectedIds)
}, 0)
    
    return newThreads
  })
}

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

  const toggleExpandAll = () => {
    if (expandedThreads.size === threads.length) {
      setExpandedThreads(new Set())
    } else {
      setExpandedThreads(new Set(threads.map(t => t.threadId)))
    }
  }

  const handlePreview = async () => {
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
      if (!result.success) throw new Error(result.error)

      const metrics = calculateMetrics(result.content, selectedFormat, selectedEvents.length)
      setPreviewData({
        content: result.content,
        metrics
      })
      setShowPreview(true)
    } catch (error) {
      console.error('Erreur génération preview:', error)
      alert('❌ Erreur lors de la génération de l\'aperçu')
      setShowPreview(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportConfirm = async (): Promise<void> => {
  setIsExporting(true)
  try {
    const result = await generateExportContent(
      selectedFormat === 'pdf' ? allSelectedEvents : limitedEvents,
      false
    )
    if (!result.success) throw new Error(result.error)

    // Détecter si ZIP
    const isZip = result.content.startsWith('UEsDB')
    
    const downloadResponse = await fetch('/api/export/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: isZip ? 'zip' : selectedFormat,
        content: result.content,
        filename: isZip
          ? `bandhu-export-${new Date().toISOString().split('T')[0]}.zip`
          : `bandhu-export-${new Date().toISOString().split('T')[0]}.${
              selectedFormat === 'markdown' ? 'md' : selectedFormat
            }`
      })
    })

      if (downloadResponse.ok) {
  const blob = await downloadResponse.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = isZip
    ? `bandhu-export-${new Date().toISOString().split('T')[0]}.zip`
    : `bandhu-export-${new Date().toISOString().split('T')[0]}.${
        selectedFormat === 'markdown' ? 'md' : selectedFormat
      }`
  document.body.appendChild(a)
  a.click()
  // ...
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

  const totalEvents = threads.reduce((sum, thread) => sum + thread.events.length, 0)
  const selectedEventsCount = threads.reduce((sum, thread) => 
    sum + thread.events.filter(event => event.selected).length, 0
  )
  const allSelected = totalEvents > 0 && selectedEventsCount === totalEvents

  if (!isOpen) return null

  return (
    <>
      {/* SIDEBAR CONTAINER */}
      <div className="
  fixed inset-y-0 right-0 
  w-full sm:w-[400px] md:w-[500px]
  max-w-full z-50 
  transform transition-transform duration-300 ease-in-out
  lg:absolute lg:right-0 lg:transform-none lg:w-[600px] lg:h-full
"
  style={{ 
    transform: isOpen ? 'translateX(0)' : 'translateX(100%)' 
  }}
>
        <div className="h-full bg-gray-900/50 backdrop-blur-sm border-l border-gray-800 flex flex-col">
          
          {/* Header avec style Bandhu */}
          <div className="bg-gradient-to-r from-gray-900/90 to-blue-800/90 p-6 border-b border-gray-700/50">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  <span className="bg-gradient-to-r from-bandhu-secondary to-bandhu-primary bg-clip-text text-transparent">
                    Exporter mes conversations
                  </span>
                </h2>
                <p className="text-gray-300/80 mt-2">
                  Sélectionne les messages à exporter et choisis ton format
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white text-2xl transition-colors hover:scale-110"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Barre de contrôle sticky - style Bandhu */}
          <div className="bg-gray-800/30 border-b border-gray-700/50 p-4 sticky top-0 z-10">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 text-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded bg-gray-700 border-gray-600 focus:ring-2 focus:ring-bandhu-primary"
                  />
                  <span className="text-sm font-medium">
                    {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </span>
                </label>

                <button
                  onClick={toggleExpandAll}
                  className="text-sm font-medium text-gray-300 hover:text-white transition-colors flex items-center gap-2 px-3 py-1 rounded hover:bg-gray-700/50"
                >
                  {expandedThreads.size === threads.length ? '↥ Tout replier' : '↧ Tout déplier'}
                </button>
                
                <span className="text-gray-300 text-sm">
                  {selectedEventsCount} / {totalEvents} messages sélectionnés
                </span>

                {exceededLimit && (
                  <span className="text-orange-300 text-sm flex items-center gap-1">
                    ⚠️ Limite {currentLimit} messages ({allSelectedEvents.length - currentLimit} ignorés)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <div className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded border border-gray-600">
                  Limite : {currentLimit} messages
                </div>

                <select
  value={selectedFormat}
  onChange={(e) => setSelectedFormat(e.target.value as any)}
  className="bg-gray-800 border border-gray-600..."
>
  <option value="markdown">Markdown (.md)</option>
  <option value="html">HTML (Web) 🌐</option>  {/* ← AJOUTE */}
  <option value="pdf">PDF</option>
  <option value="docx">Word (.docx)</option>
</select>

                {/* Sélecteur de style */}
                <div className="flex items-center gap-2">
                  {getAvailableStyles(selectedFormat).map(styleKey => {
  // Gérer le cas où le template n'existe pas encore
  const template = (EXPORT_TEMPLATES as any)[styleKey] || {
  name: styleKey === 'minimal-bw' ? 'Minimaliste (N&B)' : 
         styleKey === 'design-color' ? 'Design (Couleur)' :
         styleKey === 'design-bw' ? 'Design (Noir & Blanc)' : styleKey,
  icon: styleKey === 'minimal-bw' ? '📄' : 
        styleKey === 'design-bw' ? '⚫' : '🎨',
  description: styleKey === 'minimal-bw' ? 'Version texte compacte, optimisée impression' :
               styleKey === 'design-bw' ? 'PDF en noir et blanc pour impression' :
               'Style par défaut'
}
  
  return (
    <button
      key={styleKey}
      onClick={() => setExportStyle(styleKey as any)}
      className={`
        relative group px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium
        ${exportStyle === styleKey 
          ? 'border-bandhu-primary bg-bandhu-primary/20 text-white' 
          : 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300'
        }
      `}
      title={template.description}
    >
      <span className="text-base">{template.icon}</span>
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900/95 backdrop-blur-sm text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-gray-700 shadow-xl z-20">
        <div className="font-semibold">{template.name}</div>
        <div className="text-gray-400 mt-0.5">{template.description}</div>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900/95 rotate-45 border-b border-r border-gray-700"></div>
      </div>
    </button>
  )
})}
                </div>

                <button
                  onClick={handlePreview}
                  disabled={isLoading || limitedEvents.length === 0}
                  className="bg-gradient-to-r from-bandhu-primary to-bandhu-secondary hover:from-blue-600 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-800 text-white px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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

          {/* Liste des conversations - scrollable */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-bandhu">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="flex items-center gap-3 text-gray-400">
                  <div className="w-5 h-5 border-2 border-gray-600 border-t-bandhu-primary rounded-full animate-spin" />
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
                    className="bg-gray-800/20 rounded-lg border border-gray-700/50 overflow-hidden hover:border-gray-600 transition-colors"
                    data-thread-id={thread.threadId}
                  >
                    {/* En-tête de conversation */}
                    <div 
                      className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-700/20 transition-colors"
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
                              const newSelectedIds = newThreads.flatMap(t =>
      t.events.filter(e => e.selected).map(e => e.id)
    )
    setTimeout(() => {
  onSelectionChange?.(newSelectedIds)
}, 0)
                            return newThreads
                          })
                        }}
                        className="w-4 h-4 rounded bg-gray-700 border-gray-600 focus:ring-2 focus:ring-bandhu-primary"
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
                      <div className="border-t border-gray-700/50 p-4 bg-gray-900/20">
                        <div className="space-y-2">
                          {thread.events.map((event) => (
                            <label
                              key={event.id}
                              data-event-id={event.id}
                              className={`flex items-start gap-3 p-3 rounded-lg transition-colors group cursor-pointer ${
                                event.selected 
                                  ? 'bg-bandhu-primary/20 border border-bandhu-primary/30' 
                                  : 'hover:bg-gray-700/30'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={event.selected}
                                onChange={() => toggleEventSelection(thread.threadId, event.id)}
                                className="w-4 h-4 rounded bg-gray-700 border-gray-600 mt-1 flex-shrink-0 focus:ring-2 focus:ring-bandhu-primary"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-sm font-medium ${
                                    event.role === 'user' ? 'text-blue-300' : 'text-bandhu-secondary'
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

      {/* Modal de prévisualisation (reste identique) */}
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
export default React.memo(ExportModal)