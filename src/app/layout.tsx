import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import ClientLayout from './ClientLayout'

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
      <body className={`${inter.className} bg-gradient-to-br from-bandhu-dark via-gray-900 to-bandhu-dark`}>
        <Providers>
          <ClientLayout>
            {children}
          </ClientLayout>
        </Providers>
      </body>
    </html>
  )
}

<head>
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
</head>