'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
      headers: { 'Content-Type': 'application/json' },
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Erreur inconnue')
    } else {
      setConfirmed(true)
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    }

    setLoading(false)
  }

  return (
    <div style={{ padding: '2rem', color: 'white', background: '#111', minHeight: '100vh' }}>
      {!token ? (
        <p>❌ Token manquant dans l’URL.</p>
      ) : confirmed ? (
        <p>✅ Mot de passe réinitialisé. Redirection en cours...</p>
      ) : (
        <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2>🔐 Nouveau mot de passe</h2>
          <input
            type="password"
            placeholder="Nouveau mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ padding: '0.75rem', background: '#333', color: 'white', borderRadius: 4, border: '1px solid #555' }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '0.75rem', background: '#0070f3', color: 'white', border: 'none', borderRadius: 4 }}
          >
            {loading ? 'Réinitialisation...' : 'Mettre à jour'}
          </button>
          {error && <div style={{ color: '#ff6666' }}>{error}</div>}
        </form>
      )}
    </div>
  )
}
