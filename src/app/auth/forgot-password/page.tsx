'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await res.json()

      if (data.success) {
        router.push('/auth/reset-sent')
      } else {
        setError(data.error || 'Erreur lors de l\'envoi')
      }
    } catch (error) {
      setError('Erreur de connexion')
    }

    setLoading(false)
  }

  return (
    <div style={styles.container}>
      <div style={styles.form}>
        <h1 style={styles.title}>Mot de passe oublié</h1>
        <p style={styles.subtitle}>
          Entrez votre adresse email pour recevoir un lien de réinitialisation
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Votre adresse email"
            required
            style={styles.input}
          />
          
          <button 
            type="submit" 
            disabled={loading}
            style={styles.button}
          >
            {loading ? 'Envoi...' : 'Envoyer le lien'}
          </button>

          {error && <div style={styles.error}>{error}</div>}
        </form>

        <div style={styles.back}>
          <a href="/auth/signin" style={styles.backLink}>
            ← Retour à la connexion
          </a>
        </div>
      </div>
    </div>
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
    boxShadow: '0 0 10px rgba(0,0,0,0.5)',
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
    lineHeight: '1.5',
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
    fontSize: '16px',
  },
  error: {
    color: '#ff6666',
    marginTop: '12px',
    fontSize: '14px',
    textAlign: 'center',
  },
  back: {
    marginTop: '20px',
    textAlign: 'center',
  },
  backLink: {
    color: '#888',
    fontSize: '14px',
    textDecoration: 'none',
  }
}