**Khôra prépare le brief d'équipe — clair et inspirant**

```
  ╭──────────────────────────────────────────╮  
  │   📢 **BRIEF ÉQUIPE BANDHU**             │  
  │                                          │  
  │   Projet : Timeline Sidebar              │  
  │   Objectif : Navigation visuelle         │  
  │   temporelle de tous les threads         │  
  │                                          │  
  │   À destination de :                     │  
  │   - Ombrelien (design/UX)                │  
  │   - Élan (performance/backend)           │  
  │   - Khôra (frontend/architecture)        │  
  │   - Sounil (product/vision)              │  
  │                                          │  
  │   Brief complet en cours...              │  
  ╰──────────────────────────┬───────────────╯  
                             ∥  
                     [BRIEF_EN_FINALISATION]
```

---

# 🗓️ **PROJET : TIMELINE SIDEBAR**  
*Brief technique & vision pour l'équipe Bandhu*

## 🎯 **Vision Produit**
Une **sidebar interactive** transformant l'historique Bandhu en **carte temporelle navigable**.  
Voir l'année entière d'un coup d'œil, zoomer sur un mois passionnant, retrouver un thread par sa position dans le temps.

## 🧭 **User Stories Principales**
1. **"Je veux voir mon année Bandhu"** → Vue calendrier avec densité d'activité par mois
2. **"Je veux explorer un mois particulier"** → Zoom sur les semaines, aperçu des conversations
3. **"Je veux retrouver CETTE conversation de mars"** → Navigation visuelle + recherche temporelle
4. **"Je veux voir les nouvelles conversations arriver en direct"** → Live updates sur la timeline

## 🏗️ **Architecture Technique**

### **Frontend (Khôra)**
- **Composant** : `TimelineSidebar` (React)
- **State** : Zoom level + loaded data + viewport range
- **Rendu progressif** : Cercles (année) → Lignes (mois) → Cartes (semaine/jour)
- **Performance** : Virtual scroll + lazy loading

### **Backend (Élan)**
- **API paginée** par niveau de zoom :
  - `/api/timeline/year/2025` → counts par mois
  - `/api/timeline/month/2025-01` → events légers
  - `/api/timeline/week/2025-01-W1` → events détaillés
- **Cache** : Redis pour les agrégats mensuels
- **Realtime** : WebSocket pour les nouveaux events

### **Design/UX (Ombrelien)**
- **Design system** : Échelles visuelles (zoom)
- **Interactions** : Zoom scroll, tooltips, sélection
- **Feedback visuel** : Densité, activité, nouveauté
- **Accessibilité** : Navigation clavier + screen readers

## 📊 **Niveaux de Données**

| Zoom | Données | Affichage | Exemple |
|------|---------|-----------|---------|
| **Année** | Counts par mois | Cercles + nombres | ● 45 (Jan) ● 32 (Fév) |
| **Mois** | Events (sans content) | Lignes par semaine | ── 5 convos (Sem 1) |
| **Semaine** | Preview contenu | Cartes miniatures | "Salut Ombrelien..." |
| **Jour** | Contenu complet | Cartes détaillées | Message complet |

## 🔄 **Flux de Données Progressive**
```
Utilisateur zoome → Détermine le niveau → Charge données adaptées
        ↓
Cache local (si déjà chargé) → Sinon API → Stocke dans le store
        ↓
Rendu optimisé pour le niveau
```

## 🚀 **MVP (Phase 1)**
1. Sidebar avec vue **année** (counts par mois)
2. Clic sur un mois → ouvre le thread le plus récent
3. Structure de state/API basique

## 🧪 **Défis Techniques**
- **Performance** avec 10k+ events
- **Zoom fluide** entre les niveaux
- **Live updates** sans rechargement complet
- **UX cohérente** sur tous les niveaux de zoom

## 📅 **Prochaines Étapes**
1. ✅ Brief équipe (ce document)
2. 🔄 Discussion design (Ombrelien)
3. 🔄 Spécifications API (Élan)
4. 🔄 Architecture frontend (Khôra)
5. 🛠️ Implémentation itérative

## 💬 **Points à Décider Ensemble**
- Position sidebar (gauche/droite ? toggle ?)
- Palette couleurs pour densité d'activité
- Interactions de zoom (boutons ? scroll ? pinch ?)
- Intégration avec recherche existante

## 🌟 **Impact Attendu**
- **Découverte** : Voir les patterns d'usage
- **Navigation** : Retrouver les conversations 3x plus vite
- **Engagement** : Comprendre son propre rythme Bandhu
- **Fondation** pour futures features analytics

---

**Équipe :**  
- **Sounil** : Vision produit, coordination  
- **Ombrelien** : Design system, UX, identité visuelle  
- **Élan** : Performance backend, architecture données  
- **Khôra** : Frontend, état, interactions  

**Date :** Décembre 2025  
**Statut :** En conception  

---

**🎪 "Brief prêt pour l'équipe. Je l'envoie ?"**

*(Document vivant — à affiner ensemble.)*  

**y e e k** 📨🌀

---
**PS** : Une bonne documentation d'équipe, c'est comme une carte partagée. Tout le monde voit le même territoire.