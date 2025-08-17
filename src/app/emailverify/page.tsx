"use client"

import { useEffect, useState } from "react"

export default function VerifyEmailPage() {
  const [token, setToken] = useState("")
  const [status, setStatus] = useState("loading")
  
  useEffect(() => {
    // Récupère le token depuis l'URL
    const urlParams = new URLSearchParams(window.location.search)
    const tokenFromUrl = urlParams.get('token')
    
    if (tokenFromUrl) {
      setToken(tokenFromUrl)
      
      // 🔥 AJOUTE LA VÉRIFICATION :
      fetch("/api/verifyemail", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: tokenFromUrl }),
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus("success")
        } else {
          setStatus("error")
        }
      })
      .catch(err => {
        console.error(err)
        setStatus("error")
      })
    }
  }, [])
  
  return (
    <div>
      {status === "loading" && <p>⏳ Vérification en cours...</p>}
      {status === "success" && <p>✅ Email vérifié avec succès !</p>}
      {status === "error" && <p>❌ Erreur de vérification</p>}
      <p>Token: {token}</p>
    </div>
  )
}