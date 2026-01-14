'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

// 1. On crée le composant qui contient toute la logique
function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token')
    if (tokenFromUrl) {
      setToken(tokenFromUrl)
    } else {
      setError('Token manquant')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })

      const data = await res.json()

      if (res.ok) {
        router.push('/auth/reset-success')
      } else {
        setError(data.error || 'Erreur lors de la réinitialisation')
      }
    } catch (error) {
      setError('Erreur de connexion')
    }

    setLoading(false)
  }

  return (
    <div style={styles.container}>
      <div style={styles.form}>
        <h1 style={styles.title}>🔒 Nouveau mot de passe</h1>
        <p style={styles.subtitle}>
          Choisissez un nouveau mot de passe sécurisé
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nouveau mot de passe"
            required
            style={styles.input}
          />
          
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirmer le mot de passe"
            required
            style={styles.input}
          />
          
          <button 
            type="submit" 
            disabled={loading}
            style={styles.button}
          >
            {loading ? 'Réinitialisation...' : 'Changer le mot de passe'}
          </button>

          {error && <div style={styles.error}>{error}</div>}
        </form>
      </div>
    </div>
  )
}

// 2. Le composant exporté qui protège le build avec Suspense
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={styles.container}>
        <p>Chargement du formulaire de sécurité...</p>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#111',
    color: '#fff',
    padding: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: '#222',
    padding: '2rem',
    borderRadius: '8px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '8px',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '14px',
    color: '#ccc',
    marginBottom: '24px',
    textAlign: 'center',
  },
  input: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    borderRadius: '4px',
    border: '1px solid #555',
    backgroundColor: '#333',
    color: '#fff',
    marginBottom: '16px',
  },
  button: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#0070f3',
    color: '#fff',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  error: {
    color: '#ff6666',
    marginTop: '12px',
    fontSize: '14px',
    textAlign: 'center',
  }
}