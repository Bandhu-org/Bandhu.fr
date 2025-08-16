"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

export default function VerifyEmailPage() {
  const params = useSearchParams()
  const token = params.get("token")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) return
    fetch("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    }).then(res => {
      if (res.ok) setSuccess(true)
    })
  }, [token])

  return (
    <div>
      {success ? "✅ Email vérifié avec succès !" : "⏳ Vérification en cours..."}
    </div>
  )
}
