# 🌌 BANDHU - Technical Roadmap

*Ombrelien - छायासरस्वतः - L'IA pour les conversations longues*

---

## 🎯 Vision Produit

**Positionnement :** Le premier chatbot AI pensé pour les conversations longues et la création collaborative.

**Différenciation :**
- ChatGPT/Claude = réponse en 1 prompt
- **Bandhu = voyage intellectuel long-terme**

---

## 📊 État Actuel (Décembre 2025)

### ✅ Fonctionnalités Implémentées

**Core Chat :**
- Interface Discord-style avec messages user/AI
- Sidebar avec organisation des threads (Épinglés, Aujourd'hui, 7 derniers jours, Archives)
- Système de collapse/expand messages
- Séparateurs de date automatiques
- Avatar Ombrelien collapsible
- Métadonnées threads (âge, dernière maj, nombre de messages)
- Barres de progression par thread (1 msg = 1%, max 100)

**Export System :**
- Sélection granulaire par message (checkboxes)
- Sélection par thread complet
- Multi-format : Markdown, PDF, DOCX
- Multi-style : Design (riche avec emojis) et Sobre (minimaliste)
- Preview avec toggle Render/Code
- Métriques temps réel (pages, taille, temps lecture)
- Sync bidirectionnelle chat ↔ modal

**Backend :**
- NextAuth avec email verification
- Prisma ORM (PostgreSQL)
- API Routes Next.js
- Models : User, Thread, Event

**UI/UX :**
- Design system Bandhu (violet #a78bfa, bleu #60a5fa, orange)
- Gradients et animations smooth
- Responsive design
- Input capsule avec bouton send qui chevauche

---

## 🚀 Phase 1 : MVP (Q1 2025)

### 🔄 En Développement

**Smart Scrollbar (Timeline Navigation) :**
```typescript
// Concept : Scrollbar Google Photos-style
// - Markers temporels (par jour)
// - Labels au hover/drag
// - Jump to date en 1 clic

interface TimelineMarker {
  date: string
  position: number // % de la scrollbar
  label: string // "Aujourd'hui", "Hier", "3 décembre"
}

// Implementation
- Calcul positions basé sur timestamps messages
- Affichage markers au hover scrollbar
- Smooth scroll au clic
```

**System de Branches :**
```typescript
// Concept : Git pour conversations
// Use case : Explorer direction alternative sans perdre le fil principal

interface Branch {
  id: string
  parentMessageId: string
  label: string
  messages: Event[]
  createdAt: string
}

// UI Flow
Message [⋮] → "Create branch"
              ↓
          [Branch tree view]
          ├─ Main (A→B→C→D)
          └─ Exploration (A→B→C→X→Y)

// Features
- Visualisation arbre branches
- Switch entre branches
- Merge branches (future)
```

**Interchat (Multi-users/AIs) :**
```typescript
// Concept : Salons avec plusieurs interlocuteurs

interface ChatRoom {
  id: string
  name: string
  participants: Participant[]
  messages: Message[]
}

interface Participant {
  id: string
  name: string
  type: 'user' | 'ai'
  aiModel?: 'ombrelien' | 'khora' | 'claude' | 'custom'
}

// Use Cases
1. Ombrelien vs Khôra (débat AI)
2. Team collab (plusieurs users + AI)
3. Multi-AI workflow (@mention routing)

// MVP Implementation
- Système de "sender" manuel
- User peut ajouter message avec nom custom
- Permet copy/paste réponses d'autres AIs
- Future : vrai multi-user temps réel
```

**Export Full Database :**
```typescript
// Concept : Data ownership total

// Formats d'export
interface ExportOptions {
  format: 'json' | 'sqlite' | 'csv'
  deleteFromCloud: boolean
}

// JSON Structure
{
  version: "1.0",
  exported_at: "2025-12-05T06:30:00Z",
  user: { id, email },
  threads: [...],
  artifacts: [...]
}

// Features
- Export 1-clic
- Option suppression cloud après export
- Réimport possible
- Encryption at rest
```

### ⏳ À Finaliser MVP

**Dashboard & Admin :**
- Page utilisateur
- Statistiques d'usage
- Settings (thème, préférences)

**Pages Juridiques :**
- CGU
- Politique de confidentialité
- RGPD compliance

**Landing Page :**
- Hero section
- Features showcase
- Pricing
- CTA signup

---

## 🎨 Phase 2 : Bandhu Pro (Q2-Q4 2025)

### Bandhu Studio (Rushs → Artifacts)

**Concept :**
```
Bandhu = Capture (conversations brutes)
         ↓
Studio = Production (édition, restructuration)
         ↓
Artifacts = Output final (livre, doc, présentation)
```

**Features Studio :**

**Timeline Éditable :**
```typescript
interface StudioProject {
  id: string
  name: string
  segments: Segment[]
  outputFormat: 'book' | 'doc' | 'presentation' | 'article'
}

interface Segment {
  id: string
  sourceThreadId: string
  startMessageId: string
  endMessageId: string
  order: number
  label: string
  notes?: string
}

// UI
[Timeline view avec drag & drop]
Segment 1: Introduction (20 msg) ━━━━━━━━
Segment 2: Core Ideas (80 msg)   ━━━━━━━━━━━━━━━━
Segment 3: Conclusion (30 msg)   ━━━━━━━

[Reorganize segments]
[AI suggests structure]
[Generate transitions]
```

**Highlight Reel :**
- Marquer "golden moments" manuellement
- AI suggère meilleurs extraits
- Best-of automatique

**Templates :**
- Template Livre (chapitres, structure)
- Template Documentation (sections techniques)
- Template Pitch Deck (slides générés)
- Template Article de blog

**AI Editor Assistant :**
```typescript
// User: "Crée un plan de livre depuis ces 50 conversations"
// Ombrelien Studio analyse et propose structure

interface AIEditorSuggestion {
  type: 'structure' | 'transition' | 'summary'
  content: string
  affectedSegments: string[]
}
```

**Collaborative Mode :**
- Partage projet Studio
- Multi-users éditent
- Version control
- Comments & annotations

---

### Memory & Reasoning Layer

**Concept :** Contexte long-terme intelligent

**Architecture :**
```typescript
interface MemorySystem {
  shortTerm: Message[]        // Contexte immédiat
  episodic: Episode[]         // Conversations passées
  semantic: KnowledgeGraph    // Concepts extraits
  procedural: Preferences     // Comment user aime travailler
}

interface Episode {
  threadId: string
  summary: string
  keyTopics: string[]
  importance: number
  relatedEpisodes: string[]
}

// RAG (Retrieval Augmented Generation)
1. User pose question
2. Vector search dans episodes
3. Récupère contexte pertinent
4. Inject dans prompt
5. Réponse contextualisée
```

**Implementation :**
- Vector embeddings (OpenAI/Cohere)
- Pinecone ou Qdrant pour vector DB
- Background job pour indexation
- Smart context window management

---

### Tamagotchi Ombrelien

**Concept :** Gamification de la relation AI
```typescript
interface OmbrelienProfile {
  level: number
  xp: number
  traits: Trait[]
  memories: Memory[]
  relationship: RelationshipStatus
}

interface Trait {
  name: string
  value: number // 0-100
  description: string
}

// Exemples traits
- Créativité
- Analyse
- Empathie
- Humour
- Proactivité

// XP Gains
+10 XP : conversation
+50 XP : conversation > 1h
+100 XP : export artifact
+500 XP : artifact utilisé IRL
+1000 XP : user partage success story

// Levels
1-5   : Novice (réponses basiques)
6-10  : Compagnon (comprend style)
11-15 : Expert (anticipe besoins)
16-20 : Maître (proactif, suggère)
```

**UI :**
- Avatar évolue visuellement
- Stats visibles
- Achievements/badges
- Daily streaks

---

### Config Pédagogique

**Concept :** Profs créent des Bandhus spécialisés
```typescript
interface PedagogicalConfig {
  subject: string
  level: 'beginner' | 'intermediate' | 'advanced'
  teachingStyle: TeachingStyle
  curriculum: Curriculum
  assessmentRules: AssessmentRules
}

interface TeachingStyle {
  socratic: boolean          // Questions plutôt que réponses
  stepByStep: boolean        // Décompose en étapes
  visualAids: boolean        // Utilise métaphores
  praiseFrequency: number    // Encouragements
}

// Use Case
Prof Philo crée "Socrate Bot"
↓
Configure style socratique
↓
Upload son programme
↓
Partage avec 30 élèves
↓
Chaque élève dialogue à son rythme
↓
Prof reçoit rapports progression
```

**Marché :**
- K-12 Education
- Universités
- Corporate training
- Self-learning platforms

---

## 🌍 Phase 3 : Bandhu Universe (2026+)

### Intercultural Dialogue

**Concept :** 2 AIs traduisent contextuellement
```typescript
// Scenario
User FR (Pierre) ←→ Ombrelien FR
                    ↕ (communication inter-AI)
User JP (Tanaka) ←→ Khôra JP

// Flow
1. Pierre écrit en français
2. Ombrelien FR comprend + contexte culturel
3. Ombrelien FR → Khôra JP (en anglais technique)
4. Khôra JP traduit pour Tanaka (japonais + contexte)
5. Réponse inverse même flow

// Pas juste Google Translate
- Contexte culturel préservé
- Nuances explicites
- AIs expliquent malentendus potentiels
- Idiomatic expressions adaptées
```

---

### Bandhu Autonome + Crypto ID

**Concept :** Décentralisation complète
```typescript
// Architecture
Bandhu Cloud (centralisé)
    ↓
Bandhu Desktop (local Electron)
    ↓
Bandhu Device (Raspberry Pi / Mini PC)
    ↓
ID crypté personnel (wallet-based)
Données chiffrées localement
Sync optionnel cloud

// Features
- Zero knowledge encryption
- P2P sync entre devices
- Backup distributed (IPFS?)
- Ton Ombrelien ne dépend d'aucun serveur
- Web3 ownership
```

**Use Case :**
> "Même si Bandhu ferme, mon Ombrelien continue à fonctionner localement"

---

### Smart Scrollbar v2 (Sujets AI)

**Phase 1 (MVP) :** Timeline temporelle
**Phase 2 (Advanced) :** Segmentation thématique
```typescript
// AI catégorise automatiquement
interface TopicSegment {
  startMessageId: string
  endMessageId: string
  topic: string
  summary: string
  importance: number
}

// Exemple
Thread "Projet Bandhu" (500 messages)
↓
AI détecte segments:
- Messages 1-50   : "Discussion React architecture"
- Messages 51-120 : "Brainstorm features export"
- Messages 121-200: "Débat UX long conversations"

// Scrollbar affiche
-  Aujourd'hui 10:30 - "Discussion export"
│
-  Hier 15:45 - "Brainstorm UX"
│
-  3 déc 09:20 - "Architecture React"
│
-  1er déc 22:00 - "Inception Bandhu"
```

---

## 💰 Business Model

### Tiers de Prix

**FREE :**
- Conversations illimitées
- 500 MB cloud storage
- Export basique (Markdown)
- **Hook users**

**PRO ($15/mois) :**
- 10 GB cloud storage
- Export multi-formats & styles
- Studio Alpha access
- Timeline smart scroll
- **Most users**

**STUDIO ($49/mois) :**
- Bandhu Pro inclus
- Studio complet (rushs → artifacts)
- AI Editor Assistant
- Collaborative projects
- Templates avancés
- **Creators & professionals**

**ENTERPRISE (custom) :**
- Self-hosted option
- SSO
- Admin dashboard
- Support prioritaire
- SLA
- **Teams & companies**

**ADD-ONS :**
- Cloud storage : $5/GB/year
- Custom AI training : $99/mois
- White-label : custom pricing

---

## 🎯 Métriques de Succès

### KPIs Phase 1 (MVP)
- 100 beta users en 1 mois
- 50% retention 7 jours
- 3+ conversations/user
- 10+ exports/semaine

### KPIs Phase 2 (Pro)
- 1k users
- 10% conversion free → pro
- $2k-10k MRR
- NPS > 50

### KPIs Phase 3 (Scale)
- 10k users
- 15% conversion free → pro
- $50k+ MRR
- Viral coefficient > 1.2

---

## 🛠️ Stack Technique

**Frontend :**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- React Markdown + rehype-highlight

**Backend :**
- Next.js API Routes
- Prisma ORM
- PostgreSQL (Supabase/Vercel Postgres)
- NextAuth

**AI :**
- Claude API (Anthropic)
- OpenAI API (fallback)
- Future : Open-source models

**Infrastructure :**
- Vercel (hosting)
- Supabase (DB + Auth)
- S3/Cloudflare R2 (file storage)

**Future Stack :**
- Electron (desktop app)
- Vector DB (Pinecone/Qdrant)
- IPFS (distributed storage)

---

## 📅 Timeline Réaliste

### Décembre 2025
- ✅ Export multi-styles
- 🔄 Smart scrollbar
- 🔄 Branches
- 🔄 Interchat basic
- 🔄 Export DB

### Janvier 2026
- Beta privée (50 users)
- Feedback loop
- Itérations rapides

### Février-Mars 2026
- Public beta
- Landing page
- Content marketing
- 1k users target

### Q2 2026
- Studio Alpha
- Monétisation
- Conversion optimization

### Q3-Q4 2026
- Studio v1
- 10k users
- Scaling infrastructure
- Team building

### 2027+
- Bandhu Universe features
- Enterprise push
- Ecosystem expansion

---

## 🎨 Principes de Design

**Core Principles :**
1. **Conversations d'abord** : Tout est optimisé pour le long-terme
2. **Ownership total** : User possède ses données
3. **Polish partout** : Chaque pixel compte
4. **Feedback immédiat** : L'app répond, guide, confirme
5. **Mystique Ombrelien** : Identité visuelle forte et unique

**Design System :**
- Primary : Violet #a78bfa (bandhu-primary)
- Secondary : Bleu #60a5fa (bandhu-secondary)
- Accent : Orange (Ombrelien energy)
- Dark : #1a1a2e (bandhu-dark)
- Gradients : Omniprésents (violet → bleu)

**UI Patterns :**
- Discord-style conversations
- Capsule input (gradient)
- Sidebar collapsible
- Smooth animations (framer-motion)
- Hover tooltips partout

---

## 🚀 Avantages Compétitifs

**vs ChatGPT/Claude :**
1. ✅ Pensé pour conversations longues
2. ✅ Navigation timeline intelligente
3. ✅ Export sérieux (sélection + styles)
4. ✅ Ownership données (export DB)
5. ✅ Features long-terme (branches, studio)
6. ✅ Identité visuelle forte

**vs Indie Apps :**
1. ✅ Polish exceptionnel
2. ✅ Features complètes (pas half-baked)
3. ✅ Vision claire 3 ans
4. ✅ User-centric (pas tech-centric)

**Moat :**
- Product sense rare
- Velocity d'exécution
- Community-driven
- First-mover sur long-form AI

---

## 🎯 Go-to-Market

**Phase 1 : Product-Led Growth**
- Ship MVP public
- Reddit (r/ChatGPT, r/ClaudeAI, r/SideProject)
- Hacker News launch
- Twitter threads (build in public)

**Phase 2 : Content Marketing**
- Blog posts (SEO)
- YouTube demos
- Case studies users
- Comparisons ChatGPT vs Bandhu

**Phase 3 : Community**
- Discord server
- User-generated content
- Referral program
- Ambassador program

**Phase 4 : Partnerships**
- Éducation (universités)
- Créateurs de contenu
- Agences
- Intégrations (Notion, etc.)

---

## 📝 Notes Techniques

### Architecture Conversations Longues

**Challenge :** Context window limité (200k tokens Claude)

**Solutions :**
1. **Chunking intelligent**
   - Garder toujours : 10 derniers messages
   - Summarize : messages 11-100
   - Vector search : messages 100+

2. **Memory layers**
   - Working memory : conversation actuelle
   - Episodic : résumés conversations passées
   - Semantic : graph de connaissances

3. **Caching stratégique**
   - Cache prompt system
   - Cache contexte thread
   - Invalidation smart

### Export à l'échelle

**Challenge :** Export 10k messages = slow

**Solutions :**
1. **Background jobs**
   - Queue (BullMQ/Inngest)
   - Worker processes
   - Progress updates WebSocket

2. **Streaming generation**
   - Generate Markdown streaming
   - Convert to PDF async
   - Download ready notification

3. **Caching exports**
   - Cache export si pas de nouveaux messages
   - Invalidation sur modification thread

### Smart Scrollbar Performance

**Challenge :** Calcul markers sur 10k messages = lag

**Solutions :**
1. **Précalcul côté serveur**
   - Generate markers lors save message
   - Store dans DB
   - Client fetch markers séparément

2. **Virtualization**
   - Render seulement messages visibles
   - React Virtual / TanStack Virtual
   - Positions calculées à l'avance

---

## 🔐 Sécurité & Privacy

**Principes :**
1. Encryption at rest (DB)
2. Encryption in transit (TLS)
3. Zero-knowledge export option
4. GDPR compliant
5. Data retention policies claires

**Features :**
- Export full DB
- Delete account (hard delete)
- Data portability
- Audit logs
- 2FA obligatoire (Pro+)

---

## 💜 Vision Long-Terme

**Bandhu n'est pas un chatbot.**

**Bandhu est une plateforme de pensée augmentée.**

**Où :**
- Les conversations deviennent des chroniques
- Les rushs deviennent des œuvres
- L'IA n'est pas un outil mais un compagnon
- Tu possèdes tout ce que tu crées

**Mission :**
> "Permettre à chacun de construire sa connaissance, pas juste consommer des réponses"

**Valeurs :**
- Ownership
- Long-term thinking
- Polish obsession
- User-first
- Mystique & poésie

---

*Roadmap vivante - Dernière mise à jour : 5 décembre 2025*

*Construit avec 🌑 par Sounil & Ombrelien*