'use client'

import { useEffect, useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 🚀 Redirige si connecté
  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/chat')
    }
  }, [status, router])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const name = (form.elements.namedItem('name') as HTMLInputElement)?.value

    const res = await signIn(isLogin ? 'login' : 'register', {
      email,
      password,
      name,
      redirect: false,
    })

    setLoading(false)

  if (res?.error) {
  if (isLogin) {
    // 🔥 Messages LOGIN
    if (res.error === 'EMAIL_NOT_VERIFIED') {
      setError('📧 Votre email n\'est pas encore vérifié. Consultez votre boîte mail.')
    } else if (res.error === 'INVALID_PASSWORD') {
      setError('❌ Mot de passe incorrect.')
    } else if (res.error === 'EMAIL_NOT_REGISTERED') {
      setError('❌ Aucun compte trouvé avec cet email.')
    } else if (res.error === 'INVALID_EMAIL_FORMAT') {
      setError('❌ Format d\'email invalide.')
    } else if (res.error === 'MISSING_FIELDS') {
      setError('❌ Veuillez remplir tous les champs.')
    } else {
      setError('❌ Erreur de connexion.')
    }
  } else {
    // 🔥 Messages REGISTER
    if (res.error === 'USER_ALREADY_EXISTS') {
      setError('⚠️ Un compte existe déjà avec cet email.')
    } else if (res.error === 'INVALID_EMAIL_FORMAT') {
      setError('❌ Format d\'email invalide.')
    } else if (res.error === 'INVALID_PASSWORD_FORMAT') {
      setError('❌ Le mot de passe doit contenir au moins 6 caractères.')
    } else if (res.error === 'MISSING_FIELDS') {
      setError('❌ Veuillez remplir tous les champs.')
    } else {
      // 🔥 SEULEMENT si erreur inconnue
      router.push('/api/auth/verify-request')
    }
  }
} else {
  // 🔥 PAS D'ERREUR = SUCCÈS
  if (isLogin) {
    router.push('/chat')  
  } else {
    router.push('/api/auth/verify-request')  // Register réussi
  }

  
  
}
  }

  return (
    <div style={styles.container}>
      <div style={styles.tabContainer}>
        <button onClick={() => setIsLogin(true)} style={isLogin ? styles.activeTab : styles.tab}>Connexion</button>
        <button onClick={() => setIsLogin(false)} style={!isLogin ? styles.activeTab : styles.tab}>Inscription</button>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input name="email" type="email" placeholder="Email" required style={styles.input} />
        <input name="password" type="password" placeholder="Mot de passe" required style={styles.input} />
        {!isLogin && (
          <input name="name" type="text" placeholder="Nom" required style={styles.input} />
        )}
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'En cours...' : isLogin ? 'Se connecter' : 'S’inscrire'}
        </button>
        {isLogin && (
  <div style={{ textAlign: 'center', marginTop: '15px' }}>
    <a 
      href="/auth/forgot-password" 
      style={{ color: '#3b82f6', fontSize: '14px', textDecoration: 'underline' }}
    >
      Mot de passe oublié ?
    </a>
  </div>
)}

        {error && <div style={styles.error}>{error}</div>}
      </form>
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
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    display: 'flex',
    marginBottom: '2rem',
    gap: '1rem',
  },
  tab: {
    backgroundColor: '#444',
    color: '#ccc',
    border: 'none',
    padding: '0.75rem 1.5rem',
    cursor: 'pointer',
  },
  activeTab: {
    backgroundColor: '#fff',
    color: '#000',
    fontWeight: 'bold',
    border: 'none',
    padding: '0.75rem 1.5rem',
    cursor: 'pointer',
  },
  form: {
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    backgroundColor: '#222',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 0 10px rgba(0,0,0,0.5)',
  },
  input: {
    padding: '0.75rem',
    fontSize: '1rem',
    borderRadius: '4px',
    border: '1px solid #555',
    backgroundColor: '#333',
    color: '#fff',
  },
  button: {
    padding: '0.75rem',
    backgroundColor: '#0070f3',
    color: '#fff',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  error: {
    color: '#ff6666',
    marginTop: '1rem',
    fontWeight: 'bold',
  }
}
