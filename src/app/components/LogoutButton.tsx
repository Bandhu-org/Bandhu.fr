'use client'
import { signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const { data: session } = useSession()
  const router = useRouter()
  
  if (!session) return null
  
  return (
    <button
      onClick={async () => {
        await signOut({ redirect: false })
        router.push('/')
        router.refresh() // ← FORCE REFRESH !
      }}
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        padding: '0.5rem 1rem',
        background: '#eee',
        border: '1px solid #ccc',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
    >
      Se déconnecter
    </button>
  )
}