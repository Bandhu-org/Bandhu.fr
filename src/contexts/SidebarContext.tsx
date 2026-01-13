'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface SidebarContextType {
  isSidebarCollapsed: boolean
  setIsSidebarCollapsed: (collapsed: boolean) => void
  hasSidebar: boolean
  setHasSidebar: (has: boolean) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [hasSidebar, setHasSidebar] = useState(false)

  // ✨ MÉMOÏSER le value pour éviter les re-renders inutiles
  const value = React.useMemo(
    () => ({
      isSidebarCollapsed,
      setIsSidebarCollapsed,
      hasSidebar,
      setHasSidebar,
    }),
    [isSidebarCollapsed, hasSidebar]
  )

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
    console.log('🔍 useSidebar called!')
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider')
  }
  return context
}