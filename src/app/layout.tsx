import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import LogoutButton from './components/LogoutButton'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Bandhu.fr',
  description: 'Plateforme de connexion aux artisans numériques',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>
  <Providers>
    <LogoutButton />
    {children}
  </Providers>
</body>
    </html>
  )
}