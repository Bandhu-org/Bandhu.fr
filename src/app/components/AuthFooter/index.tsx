'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useSidebar } from '../../../contexts/SidebarContext'

export default function AuthFooter() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { isSidebarCollapsed, hasSidebar } = useSidebar()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const displayName = session?.user?.name || "Mon compte"
  const userInitial = session?.user?.name?.charAt(0).toUpperCase() || "U"

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      
      if (isUserMenuOpen) {
        const isUserButton = target.closest('.user-menu-button')
        const isUserMenu = target.closest('.user-menu')
        
        if (!isUserButton && !isUserMenu) {
          setIsUserMenuOpen(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isUserMenuOpen])

  if (status !== 'authenticated') {
    return null
  }

  // ========== CAS SPÉCIAL : /chat avec sidebar collapsed ==========
  // → Bouton rond uniquement
  if (hasSidebar && isSidebarCollapsed) {
    return (
      <div className="fixed bottom-6 left-6 z-50">
        <button
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className="user-menu-button w-12 h-12 rounded-full bg-gradient-to-br from-bandhu-primary to-bandhu-secondary flex items-center justify-center text-white font-bold shadow-xl hover:scale-110 transition-transform border-2 border-white/20"
          title={displayName}
        >
          {userInitial}
        </button>

        {isUserMenuOpen && (
          <div className="user-menu absolute bottom-0 left-16 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl z-50 overflow-hidden w-48">
            <button
              onClick={() => {
                setIsUserMenuOpen(false)
                router.push('/account')
              }}
              className="w-full px-4 py-3 text-left text-sm text-gray-100 hover:bg-gray-800 flex items-center gap-3 transition"
            >
              <span className="text-base">⚙️</span>
              <span>Mon compte</span>
            </button>

            <div className="border-t border-gray-700"></div>

            <button
              onClick={async () => {
                setIsUserMenuOpen(false)
                await signOut({ callbackUrl: '/' })
              }}
              className="w-full px-4 py-3 text-left text-sm text-red-300 hover:bg-red-900/60 flex items-center gap-3 transition"
            >
              <span className="text-base">🚪</span>
              <span>Déconnexion</span>
            </button>
          </div>
        )}
      </div>
    )
  }

  // ========== CAS SPÉCIAL : /chat avec sidebar ouverte ==========
  // → Rien ici, le footer est dans la sidebar
  if (hasSidebar && !isSidebarCollapsed) {
    return null
  }

 // ========== TOUTES LES AUTRES PAGES ==========
return (
  <div className="fixed bottom-0 left-0 z-50 w-80">
    <div className="p-4">
      <button
        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
        className="user-menu-button w-full px-3 py-3 rounded-lg bg-transparent hover:bg-gray-800/40 transition-all duration-200 flex items-center gap-3 group"
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-bandhu-primary to-bandhu-secondary flex items-center justify-center text-white font-bold text-sm border-2 border-white/20 group-hover:scale-105 transition-transform flex-shrink-0">
          {userInitial}
        </div>
        <span className="text-gray-100 text-sm font-medium truncate flex-1 text-left">{displayName}</span>
      </button>

      {isUserMenuOpen && (
        <div className="user-menu absolute bottom-full left-4 right-4 mb-2 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl z-50 overflow-hidden">
          <button
            onClick={() => {
              setIsUserMenuOpen(false)
              router.push('/account')
            }}
            className="w-full px-4 py-3 text-left text-sm text-gray-100 hover:bg-gray-800 flex items-center gap-3 transition"
          >
            <span className="text-base">⚙️</span>
            <span>Mon compte</span>
          </button>

          <div className="border-t border-gray-700"></div>

          <button
            onClick={async () => {
              setIsUserMenuOpen(false)
              await signOut({ callbackUrl: '/' })
            }}
            className="w-full px-4 py-3 text-left text-sm text-red-300 hover:bg-red-900/60 flex items-center gap-3 transition"
          >
            <span className="text-base">🚪</span>
            <span>Déconnexion</span>
          </button>
        </div>
      )}
    </div>
  </div>
)

}