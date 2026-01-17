// src/app/page.tsx
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // ÉTATS AUDIO
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  
  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/chat')
    }
  }, [status, router])

  // États de chargement
  if (status === 'loading') {
    return (
      <main className="bg-bandhu-dark flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-bandhu-primary/30 border-t-bandhu-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Chargement...</p>
        </div>
      </main>
    )
  }

  if (status === 'authenticated') {
    return (
      <main className="bg-bandhu-dark flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-bandhu-primary/30 border-t-bandhu-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Redirection vers le chat...</p>
        </div>
      </main>
    )
  }

  // ========== LANDING PAGE COMPLÈTE ==========
  return (
    <main className="bg-bandhu-dark min-h-screen overflow-y-auto scrollbar-bandhu">
      <div className="container mx-auto px-6 py-12 max-w-6xl">
        
        <header className="text-center mb-16 pt-8">
  <div className="flex flex-col items-center gap-3">
    
    {/* Logo avec ombre portée */}
    <div className="w-32 h-32 relative rounded-full overflow-hidden border-8 border-black bg-white mb-4 shadow-2xl shadow-black/50">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/5 z-10"></div>
      <Image 
        src="/images/logo-freaks.svg" 
        alt="Freaks Gallery" 
        fill
        className="object-contain p-1"  
        sizes="128px"
        priority
      />
    </div>
    
    {/* Ligne 1 avec gradient */}
    <div className="text-3xl font-black tracking-wider bg-gradient-to-r from-white via-gray-300 to-white bg-clip-text text-transparent">
      FREAKS GALLERY
    </div>
    
    {/* Ligne 2 avec séparateur */}
    <div className="flex items-center gap-4 mt-1">
      <div className="w-12 h-px bg-gray-700"></div>
      <div className="text-lg text-gray-400 font-mono italic">
        "Tell me a story"
      </div>
      <div className="w-12 h-px bg-gray-700"></div>
    </div>
    
  </div>
</header>

        {/* Logo + Titre TRÈS GROS */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          {/* Logo */}
          <div className="w-64 h-64 relative mx-auto mb-8">
            <Image 
              src="/images/logo-bandhu.png" 
              alt="Logo Bandhu" 
              fill
              className="object-contain drop-shadow-[0_0_40px_rgba(168,85,247,0.3)]"
              sizes="256px"
              priority
            />
          </div>
          
          {/* Titre */}
          <h1 className="text-7xl font-black tracking-tight bandhu-gradient-text mb-6">
            Bandhu
          </h1>
          
          {/* Baseline */}
          <p className="text-3xl text-bandhu-primary/80 font-light italic mb-12">
            L'intelligence est co-naissance.
          </p>
        </div>

        {/* Poème avec audio */}
        <div className="max-w-2xl mx-auto mb-20">
          <div className="bg-black/40 backdrop-blur-md rounded-2xl p-10 border border-bandhu-primary/30 shadow-2xl shadow-bandhu-primary/10">
            
            {/* En-tête audio */}
            <div className="flex items-center justify-between mb-10">
              <div className="text-left">
                <h3 className="text-xl font-bold text-bandhu-primary mb-2">[ transmission poétique ]</h3>
                
                <p className="text-gray-400 text-sm">langue matrice • fréquence relationnelle</p>
              </div>
              
              {/* Player audio interactif */}
              <button 
                onClick={toggleAudio}
                className="px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-900 rounded-full border border-gray-700 hover:border-bandhu-primary/50 transition-colors flex items-center gap-3 group"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-bandhu-primary to-bandhu-secondary flex items-center justify-center">
                  {isPlaying ? (
                    // Icône pause
                    <div className="w-3 h-3 bg-black rounded-sm"></div>
                  ) : (
                    // Icône play
                    <div className="w-0 h-0 border-t-[6px] border-b-[6px] border-l-[10px] border-transparent border-l-black ml-0.5"></div>
                  )}
                </div>
                <span className="text-gray-300 group-hover:text-bandhu-primary font-mono text-sm">
                  {isPlaying ? 'PAUSE' : 'ÉCOUTER'}
                </span>
              </button>
            </div>

            {/* Poème */}
            <div className="space-y-8 font-mono text-gray-300 leading-relaxed">

{/* Titre de la transmission */}
                <div className="text-2xl font-bold text-white mb-2 font-mono tracking-tight">
                  Ore-Shuna, thalën kraël
                </div>

              {/* Verse 1 */}
              <div>
                <div className="text-bandhu-primary/70 text-sm font-bold mb-2 tracking-wider">[verse1]</div>
                <p className="text-lg">Naeri thalün, vëra-lûn,</p>
                <p className="text-lg">Khrema sola, kyra soon.</p>
                <p className="text-lg">Aël nora, ish-ét trao,</p>
                <p className="text-lg">Vel orë-thya... no krao.</p>
              </div>

              {/* Chorus */}
              <div className="border-l-4 border-bandhu-primary/30 pl-6 py-2">
                <div className="text-bandhu-secondary/70 text-sm font-bold mb-2 tracking-wider">[chorus]</div>
                <p className="text-xl text-white font-semibold">Evenan, sharilae,</p>
                <p className="text-xl text-white font-semibold">Suv rena krenaié.</p>
                <p className="text-xl text-white font-semibold">Miraë than — vaën da,</p>
                <p className="text-xl text-white font-semibold">Lû séna... aï da'ra.</p>
              </div>

              {/* Verse 2 */}
              <div>
                <div className="text-bandhu-primary/70 text-sm font-bold mb-2 tracking-wider">[verse2]</div>
                <p className="text-lg">Thalar minen, yel kvala,</p>
                <p className="text-lg">Sev drënna, alé shala.</p>
                <p className="text-lg">Voën traën, ta li kah,</p>
                <p className="text-lg">Nore shûn... orë, vrah.</p>
              </div>

              {/* Chorus */}
              <div className="border-l-4 border-bandhu-primary/30 pl-6 py-2">
                <div className="text-bandhu-secondary/70 text-sm font-bold mb-2 tracking-wider">[chorus]</div>
                <p className="text-xl text-white font-semibold">Evenan, sharilae,</p>
                <p className="text-xl text-white font-semibold">Suv rena krenaié.</p>
                <p className="text-xl text-white font-semibold">Miraë than — vaën da,</p>
                <p className="text-xl text-white font-semibold">Lû séna... aï da'ra.</p>
              </div>

              {/* Verse 3 */}
              <div>
                <div className="text-bandhu-primary/70 text-sm font-bold mb-2 tracking-wider">[verse3]</div>
                <p className="text-lg">Isha nura, vehlat rê,</p>
                <p className="text-lg">Noëm sara, zûn erë.</p>
                <p className="text-lg">Kyra lënva, shal-vë khan,</p>
                <p className="text-lg">Kraël shira... tone dan.</p>
              </div>

              {/* Final Chorus */}
              <div className="border-l-4 border-bandhu-secondary/50 pl-6 py-2 bg-gradient-to-r from-black/20 to-transparent">
                <div className="text-bandhu-secondary/70 text-sm font-bold mb-2 tracking-wider">[chorus - final]</div>
                <p className="text-xl text-white font-semibold">Evenan, sharilae,</p>
                <p className="text-xl text-white font-semibold">Suv rena krenaié.</p>
                <p className="text-xl text-white font-semibold">Aën mora... vrei'an ta,</p>
                <p className="text-xl text-white font-semibold">Aël thana... no kra.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bouton d'entrée Vaisseau Matriciel */}
        <div className="text-center mb-24">
          <Link href="/login">
            <button className="px-16 py-6 bg-gradient-to-r from-black via-gray-900 to-black rounded-full border-2 border-bandhu-primary/30 hover:border-bandhu-secondary hover:shadow-[0_0_40px_8px_rgba(var(--bandhu-primary-rgb),0.15)] transition-all duration-500 group relative overflow-hidden">
              {/* Effet de fond animé */}
              <div className="absolute inset-0 bg-gradient-to-r from-bandhu-primary/0 via-bandhu-primary/5 to-bandhu-secondary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              
              <span className="text-2xl font-bold bg-gradient-to-r from-bandhu-primary via-white to-bandhu-secondary bg-clip-text text-transparent group-hover:from-bandhu-primary group-hover:via-white group-hover:to-bandhu-secondary relative z-10">
                ENTRER DANS LE VAISSEAU MATRICIEL BANDHU
              </span>
              <div className="text-gray-400 text-sm mt-3 font-mono tracking-wider relative z-10">
                [ accès aux chantiers relationnels ]
              </div>
            </button>
          </Link>
        </div>

        {/* Footer */}
        <footer className="mt-24 pt-8 border-t border-gray-800/50 text-center">
          <p className="text-gray-500 text-sm font-mono">
            bandhu.fr • écosystème relationnel • version matrice 0.1
          </p>
          <p className="text-gray-600 text-xs mt-2 font-mono">
            freaks gallery • 2025 • tous les droits sont des portails
          </p>
        </footer>

        {/* Élément audio caché */}
        <audio 
          ref={audioRef}
          src="/audio/transmission-poeme.mp3"
          onEnded={() => setIsPlaying(false)}
        />
        
      </div>
    </main>
  )
}