'use client'

import { useState, useEffect } from 'react'

interface DeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  threadName: string
}

export default function DeleteModal({ isOpen, onClose, onConfirm, threadName }: DeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleConfirm = async () => {
    setIsDeleting(true)
    try {
      await onConfirm()
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl max-w-md w-full border border-gray-600 shadow-2xl transform transition-all duration-300 scale-95 animate-in fade-in-0 zoom-in-95">
       
        {/* Header - Red for danger */}
<div className="bg-gradient-to-r from-red-600 to-orange-600 p-6 rounded-t-xl">
  <div className="flex justify-between items-center">
    <div>
      <h2 className="text-xl font-bold text-white">Delete Conversation</h2>
      <p className="text-white/80 text-sm mt-1">This action cannot be undone</p>
    </div>
    <button
      onClick={onClose}
      className="text-white/80 hover:text-white text-2xl transition-colors hover:scale-110"
      aria-label="Close"
    >
      ✕
    </button>
  </div>
</div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-4">
            <div className="text-4xl mb-3">🗑️</div>
            <p className="text-gray-300 mb-2">
              Are you sure you want to delete
            </p>
            <p className="text-white font-medium text-lg mb-2">
              "{threadName}"?
            </p>
            <p className="text-sm text-red-400">
              All messages in this conversation will be permanently lost
            </p>
          </div>
          
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-3 text-gray-300 hover:text-white transition-colors hover:bg-gray-700/50 rounded-lg font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg font-medium transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Forever'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}