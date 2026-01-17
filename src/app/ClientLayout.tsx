'use client'

import { SidebarProvider } from '../contexts/SidebarContext'
import AuthFooter from './components/AuthFooter'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <div className="flex h-screen">
        <div className="flex-1 overflow-y-auto scrollbar-bandhu">
  {children}
</div>
        <AuthFooter />
      </div>
    </SidebarProvider>
  )
}