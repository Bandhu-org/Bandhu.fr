'use client'

import { useState, useEffect } from 'react'

interface ExportStats {
  user: {
    threadsCount: number
    postsCount: number
    eventsCount: number
  }
  exportInfo: {
    recommended: boolean
    estimatedSize: string
    lastActivity: string | null
  }
}

export function DataManagement() {
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState<ExportStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // Charger les stats au montage
  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch('/api/user/export-status')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Erreur chargement stats:', error)
      } finally {
        setStatsLoading(false)
      }
    }
    loadStats()
  }, [])

  const exportAllData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/user/export')
      if (!response.ok) throw new Error('Export failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bandhu-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Erreur lors de l\'export')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    try {
      const text = await file.text()
      const importData = JSON.parse(text)
      
      const response = await fetch('/api/user/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importData)
      })

      const result = await response.json()
      if (result.success) {
        alert(`Import réussi ! ${result.summary?.threads || ''} ${result.summary?.posts || ''}`)
        window.location.reload()
      } else {
        alert('Erreur import: ' + (result.errors?.join(', ') || 'Unknown error'))
      }
    } catch (error) {
      console.error('Import error:', error)
      alert('Erreur lors de l\'import - fichier invalide ?')
    } finally {
      setIsLoading(false)
      // Reset l'input
      event.target.value = ''
    }
  }

  return (
    <div className="space-y-6 p-6 bg-gray-800/50 rounded-lg">
      <h3 className="text-lg font-medium text-white mb-4">Gestion des données</h3>
      
      {/* AFFICHAGE DES STATS */}
      {!statsLoading && stats && (
        <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
          <div className="text-sm text-gray-300 text-center mb-2">
            Votre base de données contient :
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-400">{stats.user.threadsCount}</div>
              <div className="text-xs text-gray-400">conversations</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">{stats.user.eventsCount}</div>
              <div className="text-xs text-gray-400">messages</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">{stats.user.postsCount}</div>
              <div className="text-xs text-gray-400">articles</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 text-center mt-2">
            Taille estimée : {stats.exportInfo.estimatedSize}
          </div>
        </div>
      )}

      {statsLoading && (
        <div className="bg-gray-700/50 rounded-lg p-4 text-center">
          <div className="text-sm text-gray-400">Chargement des statistiques...</div>
        </div>
      )}
      
      <div className="space-y-4">
        {/* Bouton Export */}
        <button
          onClick={exportAllData}
          disabled={isLoading}
          className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg flex items-center justify-center gap-2 transition-all font-medium"
        >
          {isLoading ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>Export en cours...</span>
            </>
          ) : (
            <>
              <span>📥</span>
              <span>Télécharger ma base de données</span>
            </>
          )}
        </button>

        {/* Zone Import */}
        <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-gray-500 transition-colors">
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleFileImport}
            className="hidden"
            id="import-file"
            disabled={isLoading}
          />
          <label
            htmlFor="import-file"
            className={`cursor-pointer block ${isLoading ? 'text-gray-500 cursor-not-allowed' : 'text-gray-300 hover:text-white'}`}
          >
            <div className="text-2xl mb-2">📤</div>
            <div className="font-medium">
              {isLoading ? 'Import en cours...' : 'Charger une base de données'}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Les conversations seront ajoutées à celles existantes
            </div>
          </label>
        </div>
      </div>
    </div>
  )
}