// app/(dashboard)/account/page.tsx

'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function AccountPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    
    try {
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
      })

      if (response.ok) {
        await signOut({ redirect: false })
        router.push('/')
      } else {
        alert('Erreur lors de la suppression')
      }
    } catch (error) {
      console.error(error)
      alert('Erreur lors de la suppression')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Mon compte</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Informations</h2>
        <p className="text-gray-600">Email : {session?.user?.email}</p>
      </div>

      <div className="bg-red-50 rounded-lg border border-red-200 p-6">
        <h2 className="text-lg font-semibold text-red-800 mb-4">
          Zone dangereuse
        </h2>
        
        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            Supprimer mon compte
          </button>
        ) : (
          <div>
            <p className="text-red-800 mb-4">
              Êtes-vous sûr ? Cette action est irréversible.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {isDeleting ? 'Suppression...' : 'Oui, supprimer'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}