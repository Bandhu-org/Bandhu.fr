"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

export default function VerifyEmailPage() {
  const params = useSearchParams()
  const token = params.get("token")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
  if (!token) return
  fetch("/api/verify-email", {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ token }),
  })
  .then(res => res.json())          // 🔥 AJOUTE ÇA
  .then(data => {                   // 🔥 ET ÇA
    if (data.success) setSuccess(true)
  })
  .catch(err => console.error(err)) // 🔥 BONUS: gestion erreur
}, [token])

  return (
    <div>
      {success ? "✅ Email vérifié avec succès !" : "⏳ Vérification en cours..."}
    </div>
  )
}
