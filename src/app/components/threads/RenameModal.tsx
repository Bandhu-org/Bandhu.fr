'use client'

import { useState, useEffect } from 'react'

interface RenameModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (newName: string) => void
  currentName: string
}

export default function RenameModal({ isOpen, onClose, onConfirm, currentName }: RenameModalProps) {
  const [newName, setNewName] = useState(currentName)

  // Reset when modal opens with new currentName
  useEffect(() => {
    if (isOpen) {
      setNewName(currentName)
    }
  }, [isOpen, currentName])

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newName.trim()) {
      onConfirm(newName.trim())
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl max-w-md w-full border border-gray-600 shadow-2xl transform transition-all duration-300 scale-95 animate-in fade-in-0 zoom-in-95">
        {/* Header */}
<div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-xl">
  <div className="flex justify-between items-center">
    <div>
      <h2 className="text-xl font-bold text-white">Rename Conversation</h2>
      <p className="text-white/80 text-sm mt-1">Give this conversation a new name</p>
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
        <form onSubmit={handleSubmit} className="p-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            New name:
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            placeholder="Enter new name..."
            autoFocus
          />
          
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-300 hover:text-white transition-colors hover:bg-gray-700/50 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newName.trim() || newName.trim() === currentName}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg font-medium transition-all disabled:cursor-not-allowed hover:scale-105"
            >
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}