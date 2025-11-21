'use client'

import { useState, useEffect } from 'react'

interface PreviewModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  onModify: () => void
  format: 'markdown' | 'pdf' | 'docx'
  selectedEventsCount: number
  previewContent: string
  metadata: {
    pageCount: number
    estimatedSize: string
    eventCount: number
  }
}

// Composant séparé pour la prévisualisation PDF/DOCX
const PdfDocxPreview = ({ content, format, metadata }: { 
  content: string, 
  format: string, 
  metadata: any 
}) => {
  const [objectUrl, setObjectUrl] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [showFallback, setShowFallback] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Fonctions utilitaires
  const looksLikeBase64 = (str: string): boolean => {
    if (str.length < 100) return false
    return /^[A-Za-z0-9+/]*={0,2}$/.test(str)
  }

  const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    try {
      const binaryString = atob(base64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      return bytes.buffer
    } catch (e) {
      throw new Error('Conversion base64 échouée')
    }
  }

  useEffect(() => {
    // Pour DOCX, on affiche directement le fallback (pas d'iframe)
    if (format === 'docx') {
      setShowFallback(true)
      setIsLoading(false)
      return
    }

    // Pour PDF, essayer de créer l'aperçu
    if (format === 'pdf' && content) {
      const createPreview = async () => {
        try {
          setIsLoading(true)
          setError('')
          
          let mimeType = 'application/pdf'
          let blobContent: BlobPart = content
          
          // Vérifier si c'est du base64 PDF
          if (content.startsWith('JVBER') || looksLikeBase64(content)) {
            try {
              blobContent = base64ToArrayBuffer(content)
            } catch (e) {
              console.warn('❌ Conversion base64 échouée, utilisation directe')
            }
          }
          
          const blob = new Blob([blobContent], { type: mimeType })
          const url = URL.createObjectURL(blob)
          setObjectUrl(url)
          
        } catch (err) {
          console.error('❌ Erreur création preview:', err)
          setError('Impossible de créer l\'aperçu')
          setShowFallback(true)
        } finally {
          setIsLoading(false)
        }
      }

      createPreview()
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [content, format]) // ✅ Retirer objectUrl des dépendances

  // Fallback vers l'affichage texte
  if (showFallback || error || format === 'docx') {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 bg-gray-800">
          <div className="text-center text-yellow-400 mb-4">
            <div className="text-2xl mb-2">{format === 'docx' ? '📋' : '📄'}</div>
            <div className="text-sm font-medium">
              {format === 'docx' ? 'Aperçu DOCX non disponible' : `Aperçu ${format.toUpperCase()} limité`}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {format === 'docx' 
                ? "Les documents Word ne peuvent pas être prévisualisés dans le navigateur"
                : error || "Le navigateur ne peut pas afficher l'aperçu direct"
              }
            </div>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-3 text-center">
              {format === 'docx' ? 'Votre document Word est prêt :' : 'Informations du fichier généré :'}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="text-center p-3 bg-gray-800 rounded-lg border border-gray-700">
                <div className="text-blue-400 font-bold text-lg">{metadata.eventCount}</div>
                <div className="text-gray-400 text-xs">Messages</div>
              </div>
              <div className="text-center p-3 bg-gray-800 rounded-lg border border-gray-700">
                <div className="text-green-400 font-bold text-lg">{metadata.pageCount}</div>
                <div className="text-gray-400 text-xs">Pages estimées</div>
              </div>
              <div className="text-center p-3 bg-gray-800 rounded-lg border border-gray-700">
                <div className="text-purple-400 font-bold text-lg">{metadata.estimatedSize}</div>
                <div className="text-gray-400 text-xs">Taille</div>
              </div>
              <div className="text-center p-3 bg-gray-800 rounded-lg border border-gray-700">
                <div className="text-yellow-400 font-bold text-lg">{format.toUpperCase()}</div>
                <div className="text-gray-400 text-xs">Format</div>
              </div>
            </div>
          </div>

          {format === 'docx' && (
            <div className="mt-4 text-center">
              <div className="text-xs text-gray-400 mb-2">
                📝 Le document sera ouvert avec Microsoft Word ou votre application par défaut
              </div>
            </div>
          )}

          {content && format !== 'docx' && (
            <div className="mt-4 text-left">
              <div className="text-xs text-gray-400 mb-2 text-center">
                Extrait du contenu (premiers 500 caractères) :
              </div>
              <pre className="text-gray-300 text-xs whitespace-pre-wrap break-words bg-gray-900 p-3 rounded max-h-32 overflow-y-auto border border-gray-700">
                {content.substring(0, 500)}
                {content.length > 500 && '...'}
              </pre>
            </div>
          )}
        </div>
        
        <div className="bg-gray-700/50 p-3 border-t border-gray-600">
          <div className="text-xs text-green-400 text-center">
            {format === 'docx' 
              ? '✅ Document Word prêt - Téléchargez pour l\'ouvrir'
              : `✅ Le fichier ${format.toUpperCase()} sera généré correctement au téléchargement`
            }
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
        <div className="text-center text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
          <div className="text-sm">Chargement de l'aperçu {format.toUpperCase()}...</div>
          <div className="text-xs text-gray-500 mt-1">Cela peut prendre quelques secondes</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <iframe 
        src={objectUrl}
        className="w-full h-full border-0"
        title={`Aperçu ${format.toUpperCase()}`}
        onError={() => {
          console.log('❌ Iframe error - fallback activé')
          setShowFallback(true)
        }}
        onLoad={() => {
          console.log('✅ Iframe loaded successfully')
        }}
      />
      <div className="absolute bottom-3 right-3 bg-black/80 text-white text-xs px-3 py-1.5 rounded-lg border border-gray-600">
        📄 {format.toUpperCase()} - {metadata.estimatedSize}
      </div>
    </>
  )
}

// Composant principal PreviewModal (identique à avant)
export default function PreviewModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  onModify,
  format,
  selectedEventsCount,
  previewContent,
  metadata 
}: PreviewModalProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'metrics'>('preview')
  const [isDownloading, setIsDownloading] = useState(false)

  // Gérer la touche Escape pour fermer
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      await onConfirm()
    } finally {
      setIsDownloading(false)
    }
  }

  if (!isOpen) return null

  const formatIcons = {
    markdown: '📝',
    pdf: '📄', 
    docx: '📋'
  }

  const formatNames = {
    markdown: 'Markdown',
    pdf: 'PDF',
    docx: 'Word Document'
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[999] p-4 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl border border-gray-600 transform transition-all duration-300 scale-95 animate-in fade-in-0 zoom-in-95">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">Aperçu avant export</h2>
              <p className="text-white/80 mt-1">
                Vérifiez votre {formatNames[format]} avant téléchargement
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl transition-colors hover:scale-110"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-gray-700 border-b border-gray-600">
          <div className="flex">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-6 py-3 font-medium text-sm transition-colors flex items-center gap-2 ${
                activeTab === 'preview' 
                  ? 'text-white border-b-2 border-blue-400 bg-gray-600/50' 
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-600/30'
              }`}
            >
              <span>👁️</span>
              Aperçu
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`px-6 py-3 font-medium text-sm transition-colors flex items-center gap-2 ${
                activeTab === 'metrics' 
                  ? 'text-white border-b-2 border-blue-400 bg-gray-600/50' 
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-600/30'
              }`}
            >
              <span>📊</span>
              Métriques
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'preview' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-gray-400 bg-gray-700/30 rounded-lg p-3">
                <span className="text-lg">{formatIcons[format]}</span>
                <span>Format: <strong className="text-white">{formatNames[format]}</strong></span>
                <span className="text-gray-600">•</span>
                <span>{metadata.eventCount} messages sélectionnés</span>
                <span className="text-gray-600">•</span>
                <span>{metadata.estimatedSize}</span>
              </div>
              
              <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
                {format === 'markdown' ? (
                  <div className="max-h-96 overflow-y-auto p-4">
                    <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                      {previewContent}
                    </pre>
                  </div>
                ) : (
                  <div className="h-96 relative">
                    <PdfDocxPreview 
                      content={previewContent} 
                      format={format} 
                      metadata={metadata}
                    />
                  </div>
                )}
              </div>
              
              <div className="text-xs text-gray-500 text-center bg-gray-800/50 py-2 rounded">
                {format === 'markdown' 
                  ? `Aperçu limité - Le document complet contient ${metadata.eventCount} messages`
                  : "L'aperçu peut varier selon votre navigateur"
                }
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* ... reste identique ... */}
            </div>
          )}
        </div>

        {/* Footer avec actions */}
        <div className="bg-gray-700/50 border-t border-gray-600 p-4">
          <div className="flex justify-between items-center">
            <button
              onClick={onModify}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors flex items-center gap-2 hover:bg-gray-600/30 rounded-lg"
            >
              <span>←</span>
              Retour et modifier
            </button>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors hover:bg-gray-600/30 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 disabled:cursor-not-allowed hover:scale-105"
              >
                {isDownloading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Téléchargement...
                  </>
                ) : (
                  <>
                    <span>📥</span>
                    Télécharger
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}