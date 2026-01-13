# 🎯 Migration Timeline - Checklist

## ✅ Fichiers créés/modifiés

### Nouveaux fichiers
- [x] `/src/types/timeline.ts` - Types propres
- [x] `/src/app/api/timeline/metadata/route.ts` - API métadonnées
- [x] `/src/app/api/timeline/details/route.ts` - API détails

### Fichiers modifiés
- [x] `/src/contexts/TimelineContext.tsx` - Refonte complète
- [x] `/src/components/TimelineSidebar/TimelineView.tsx` - Refonte complète

### Ancien fichier (peut être supprimé)
- [ ] `/src/app/api/timeline/events/route.ts` - Ancien endpoint (optionnel de le garder)

---

## 🔧 Changements importants

### Architecture
- ✅ **2 niveaux de données** : Métadonnées (léger) + Détails (lazy)
- ✅ **timelineStart/End** basés sur premier/dernier event (pas viewRange)
- ✅ **ZOOM_STEPS_MS** ajusté : 10ms/px → 1an/px (20 niveaux)
- ✅ **Scroll initial en bas** (events récents)

### Modes de visualisation
- ✅ **Bars** (> 1s/px) - Bâtonnets, position temps réel
- ✅ **Mini** (100ms-1s/px) - Cards condensées 32px, dot + heure
- ✅ **Discrete** (< 100ms/px) - Cards complètes 96px, avec détails

### Supprimé
- ❌ Heatmap
- ❌ Clusters  
- ❌ packedDiscrete (packing artificiel)
- ❌ MinuteContainer
- ❌ Groupement par minute

### Performance
- ✅ Virtual scrolling (viewport ± 800px)
- ✅ Cache détails intelligent
- ✅ Lazy loading automatique en mode discrete

---

## 🧪 Tests à effectuer

### 1. Chargement initial
- [ ] Timeline s'ouvre
- [ ] Métadonnées chargent (~300ms)
- [ ] Bars s'affichent
- [ ] Scroll est en bas (events récents)

### 2. Navigation
- [ ] Scroll fluide
- [ ] Bars visibles et cliquables
- [ ] Click sur bar → Scroll + zoom

### 3. Zoom
- [ ] Ctrl+Molette zoom in/out
- [ ] Transition Bars → Mini → Discrete
- [ ] Ancrage curseur fonctionne
- [ ] Pas de sauts visuels

### 4. Mode Discrete
- [ ] Détails chargent automatiquement
- [ ] "Chargement..." apparaît puis contenu
- [ ] Scroll charge nouveaux détails
- [ ] Click sur event → Charge thread

### 5. Performance
- [ ] Pas de lag au scroll
- [ ] Zoom réactif
- [ ] Console logs propres
- [ ] Pas d'erreurs API

---

## 🐛 Debug si problèmes

### Timeline ne charge pas
```bash
# Vérifier la console
- Erreur 401 → Session expirée
- Erreur 404 → User non trouvé
- Erreur 500 → Check logs serveur
```

### Bars ne s'affichent pas
```bash
# Console
- "Loaded X metadata" → Vérifier X > 0
- itemPositions vide → Check dateToY()
- barsData vide → Check calcul buckets
```

### Détails ne chargent pas en mode discrete
```bash
# Console
- "Loading X details..." → API appelée ?
- Check /api/timeline/details dans Network tab
- Vérifier cache eventsDetailsCache
```

### Ancrage zoom incorrect
```bash
# Console logs à vérifier
- dateToY/yToDate retournent des valeurs cohérentes
- timelineStart = date du premier event (pas début mois)
- msPerPixel change bien après zoom
```

---

## 📊 Métriques attendues

### Chargement
- Métadonnées : < 500ms (10 000 events)
- Détails viewport : < 100ms (500 events)

### Mémoire
- Métadonnées : ~1 MB (10 000 events)
- Détails cache : ~100 KB (500 events)
- Total : ~1.1 MB

### Performance
- FPS scroll : 60fps
- Zoom latency : < 50ms
- Virtual scrolling : < 16ms

---

## 🎨 Prochaines optimisations possibles

### Court terme
- [ ] Ajuster seuils Mini/Discrete (actuellement 100ms/px)
- [ ] Tweaker espacement bars (widthPct)
- [ ] Améliorer transitions visuelles

### Moyen terme
- [ ] Précharger détails avant/après viewport
- [ ] Cache LRU pour détails (limite mémoire)
- [ ] Web Worker pour calculs lourds

### Long terme
- [ ] IndexedDB pour cache persistant
- [ ] Streaming API pour très gros datasets
- [ ] Virtual scrolling 2D (threads + temps)

---

## 🚀 Commandes utiles

### Dev
```bash
npm run dev
# Ouvrir http://localhost:3000
# Timeline dans sidebar
```

### Logs
```bash
# Console navigateur
- "📊 [TIMELINE] ..." → Context
- "🔍 [METADATA API] ..." → API metadata
- "📝 [DETAILS API] ..." → API details
- "📍 [TIMELINE] ..." → Scroll/Position
```

### Reset cache
```bash
# Si cache corrompu
localStorage.clear()
# Ou F5 hard refresh
```

---

## ✅ Validation finale

**Critères de succès :**
- [x] Compile sans erreur
- [ ] Timeline charge et affiche bars
- [ ] Zoom fonctionne avec ancrage curseur
- [ ] Mode discrete charge détails
- [ ] Performance fluide (60fps)
- [ ] Pas d'erreurs console

**Si tous les tests passent → Migration réussie ! 🎉**

---

## 📞 Support

En cas de problème :
1. Check cette checklist
2. Vérifier logs console
3. Tester en mode incognito (cache clean)
4. Revenir aux backups si blocage

**Fichiers backupés :**
- `TimelineContext.tsx.old`
- `TimelineView.tsx.old`