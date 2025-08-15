'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const result = await signIn('credentials', {
      email,
      password,
      action: isRegister ? 'register' : 'login',
      redirect: false
    })
    
    if (result?.ok) {
      router.push('/chat')
    } else {
      alert('Erreur: ' + result?.error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-violet-800 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">
          {isRegister ? 'Créer un compte' : 'Se connecter'}
        </h1>
        
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border rounded mb-4"
          required
        />
        
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 border rounded mb-4"
          required
        />
        
        <button 
          type="submit"
          className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 mb-4"
        >
          {isRegister ? 'Créer le compte' : 'Se connecter'}
        </button>
        
        <button
          type="button"
          onClick={() => setIsRegister(!isRegister)}
          className="w-full text-blue-600 hover:underline"
        >
          {isRegister ? 'Déjà un compte ? Se connecter' : 'Pas de compte ? Créer un compte'}
        </button>
      </form>
    </div>
  )
}