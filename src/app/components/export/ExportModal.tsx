'use client'

console.log('🔥 ExportModal loaded!')

import { useState, useEffect } from 'react'

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
}

export default function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const [threads, setThreads] = useState<Thread[]>([])
  const [selectedFormat, setSelectedFormat] = useState<'markdown' | 'pdf' | 'docx'>('markdown')
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Charger les données au montage
  useEffect(() => {
    if (isOpen) {
      loadExportData()
    }
  }, [isOpen])

  const loadExportData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/export/selection')
      const data = await response.json()
      if (data.success) {
        setThreads(data.data)
      }
    } catch (error) {
      console.error('Erreur chargement données:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Basculer la sélection d'un event
  const toggleEventSelection = (threadIndex: number, eventIndex: number) => {
    setThreads(prev => {
      const newThreads = [...prev]
      newThreads[threadIndex].events[eventIndex].selected = 
        !newThreads[threadIndex].events[eventIndex].selected
      return newThreads
    })
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

  // Exporter les données sélectionnées
  const handleExport = async () => {
    const selectedEvents = threads.flatMap(thread =>
      thread.events.filter(event => event.selected).map(event => event.id)
    )

    if (selectedEvents.length === 0) {
      alert('Sélectionne au moins un message à exporter !')
      return
    }

    setIsExporting(true)
    try {
      // 1. Générer le contenu
      const generateResponse = await fetch('/api/export/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: selectedFormat,
          selectedEvents,
          options: { includeTimestamps: true }
        })
      })

      const generateResult = await generateResponse.json()

      if (!generateResult.success) {
        throw new Error(generateResult.error)
      }

      // 2. Télécharger le fichier
      const downloadResponse = await fetch('/api/export/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: selectedFormat,
          content: generateResult.content,
          filename: `bandhu-export-${new Date().toISOString().split('T')[0]}.${selectedFormat === 'markdown' ? 'md' : selectedFormat}`
        })
      })

      if (downloadResponse.ok) {
        const blob = await downloadResponse.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `bandhu-export-${new Date().toISOString().split('T')[0]}.${selectedFormat === 'markdown' ? 'md' : selectedFormat}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)

        alert(`✅ Export réussi ! ${generateResult.metadata.eventCount} messages exportés.`)
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
  const selectedEvents = threads.reduce((sum, thread) => 
    sum + thread.events.filter(event => event.selected).length, 0
  )
  const allSelected = totalEvents > 0 && selectedEvents === totalEvents

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header sexy */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Exporter mes conversations</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-white/80 mt-2">
            Sélectionne les messages à exporter et choisis ton format
          </p>
        </div>

        {/* Barre de contrôle sticky */}
        <div className="bg-gray-700/50 border-b border-gray-600 p-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                  className="w-4 h-4 rounded bg-gray-600 border-gray-500"
                />
                <span className="text-sm font-medium">
                  {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                </span>
              </label>
              
              <span className="text-gray-300 text-sm">
                {selectedEvents} / {totalEvents} messages sélectionnés
              </span>
            </div>

            <div className="flex items-center gap-4">
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value as any)}
                className="bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="markdown">Markdown (.md)</option>
                <option value="pdf">PDF</option>
                <option value="docx">Word (.docx)</option>
              </select>

              <button
                onClick={handleExport}
                disabled={isExporting || selectedEvents === 0}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Export...
                  </>
                ) : (
                  <>
                    <span>📥</span>
                    Exporter ({selectedEvents})
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
              <div className="text-gray-400">Chargement de vos conversations...</div>
            </div>
          ) : threads.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              Aucune conversation à exporter pour le moment.
            </div>
          ) : (
            <div className="space-y-6">
              {threads.map((thread, threadIndex) => (
                <div key={thread.threadId} className="bg-gray-700/30 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="checkbox"
                      checked={thread.events.every(event => event.selected)}
                      onChange={(e) => {
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
                      className="w-4 h-4 rounded bg-gray-600 border-gray-500"
                    />
                    <h3 className="font-semibold text-white">{thread.threadLabel}</h3>
                    <span className="text-gray-400 text-sm">
                      {thread.events.length} messages
                    </span>
                  </div>

                  <div className="space-y-2 ml-7">
                    {thread.events.map((event, eventIndex) => (
                      <label
                        key={event.id}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-600/30 cursor-pointer transition-colors group"
                      >
                        <input
                          type="checkbox"
                          checked={event.selected}
                          onChange={() => toggleEventSelection(threadIndex, eventIndex)}
                          className="w-4 h-4 rounded bg-gray-600 border-gray-500 mt-1 flex-shrink-0"
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
                          <p className="text-gray-300 text-sm line-clamp-2">
                            {event.content}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}