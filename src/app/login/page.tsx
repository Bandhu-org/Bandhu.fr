'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const form = e.currentTarget
    const email = form.email.value
    const password = form.password.value

    const res = await signIn('login', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (res?.ok) {
      setTimeout(() => {
        window.location.href = '/chat'
      }, 300)
    } else {
      alert("Échec de connexion.")
    }
  }

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const name = (form.elements.namedItem('name') as HTMLInputElement).value

    const res = await signIn('register', {
      email,
      password,
      name,
      redirect: false,
    })

    setLoading(false)

    if (res?.ok) {
      setTimeout(() => {
        window.location.href = '/chat'
      }, 300)
    } else {
      alert("Échec d’inscription.")
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-8">
      <h1 className="text-3xl mb-6">Connexion</h1>
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4 bg-gray-800 p-6 rounded-lg shadow-md mb-12">
        <input name="email" type="email" placeholder="Email" required className="w-full p-2 bg-gray-700 rounded" />
        <input name="password" type="password" placeholder="Password" required className="w-full p-2 bg-gray-700 rounded" />
        <button type="submit" disabled={loading} className="w-full bg-blue-500 hover:bg-blue-600 p-2 rounded">
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>

      <h1 className="text-3xl mb-6">Inscription</h1>
      <form onSubmit={handleRegister} className="w-full max-w-sm space-y-4 bg-gray-800 p-6 rounded-lg shadow-md">
        <input name="email" type="email" placeholder="Email" required className="w-full p-2 bg-gray-700 rounded" />
        <input name="password" type="password" placeholder="Password" required className="w-full p-2 bg-gray-700 rounded" />
        <input name="name" type="text" placeholder="Nom" required className="w-full p-2 bg-gray-700 rounded" />
        <button type="submit" disabled={loading} className="w-full bg-green-500 hover:bg-green-600 p-2 rounded">
          {loading ? 'Inscription...' : 'S’inscrire'}
        </button>
      </form>
    </div>
  )
}
