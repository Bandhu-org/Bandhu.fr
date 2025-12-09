# 🔧 LOG SESSION - Export PDF Centré + Code Boxes Stylisées

**Date:** 7 décembre 2025  
**Durée:** ~2h  
**Collaborateurs:** Sounil + Elan (Claude)

---

## 📋 RÉSUMÉ

**Objectif initial:** Fixer l'export PDF pour qu'il soit centré avec bordure blanche (comme l'export HTML)

**Problèmes découverts en cours de route:**
1. Export PDF collé à gauche, pas centré
2. Code boxes user et AI avec le même style
3. HTML entities encodées dans les code boxes user (`&#x27;` au lieu de `'`)
4. Mauvais générateur HTML utilisé pour le PDF
5. Erreur de syntaxe dans le code

---

## ✅ CHANGEMENTS EFFECTUÉS

### 1. **Nouveau Générateur PDF-HTML**

**Fichier créé:** `src/utils/exportStyles/pdf-html-generator.ts`

**Pourquoi:** Séparer l'export HTML (pour navigateur) de l'export PDF (avec centrage spécial)

**Différences avec `html-generator.ts`:**
- CSS optimisé pour PDF (centrage via `margin: auto`)
- Layout adapté pour Puppeteer
- Pas de flexbox (ne marche pas bien en PDF)

---

### 2. **Fix Route API - Utiliser le bon générateur**

**Fichier:** `src/app/api/export/generate/route.ts`

**Changements:**

```typescript
// AVANT (ligne 9)
import { generateChatHTML } from '@/utils/exportStyles/html-generator'

// APRÈS
import { generateChatHTML } from '@/utils/exportStyles/html-generator'
import { generateChatHTMLForPDF } from '@/utils/exportStyles/pdf-html-generator'  // ← AJOUT
```

```typescript
// AVANT (ligne ~146 dans generatePDF)
const html = await generateChatHTML(chunks[0].events, {
  style: style.includes('design') ? 'design' : 'sobre',
  ...
})

// APRÈS
const html = await generateChatHTMLForPDF(chunks[0].events, {
  style: style.includes('design') ? 'design' : 'sobre',
  ...
})
```

**Même changement ligne ~186** (dans le loop des chunks)

---

### 3. **Fix Converter - Ne pas injecter CSS**

**Fichier:** `src/utils/pdf/converter/index.ts`

**Méthode:** `convertHTML()`

**AVANT:**
```typescript
// Chargeait design-color.css et l'injectait dans le HTML
let pdfStyles = ''
// ... lecture du fichier CSS ...
finalHtml = finalHtml.replace('</head>', `${pdfStyles}</head>`)
```

**APRÈS:**
```typescript
// Le HTML contient déjà TOUT le CSS nécessaire
// On ne touche à RIEN
fs.writeFileSync(debugPath, fullHtml)  // Sans modification
```

**Aussi changé:**
```typescript
preferCSSPageSize: false  // AVANT
preferCSSPageSize: true   // APRÈS - respecte le CSS du template
```

---

### 4. **Fix HTML Entities dans Code Blocks**

**Fichier:** `src/utils/exportStyles/pdf-html-generator.ts`

**Ligne ajoutée ~440:**

```typescript
import { decode } from 'he'

// Dans generateChatHTMLForPDF, après marked.parse():
contentHTML = contentHTML.replace(
  /<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/g,
  (match, code) => {
    return match.replace(code, decode(code))
  }
)
```

**Installation requise:**
```bash
npm install he
npm install --save-dev @types/he
```

---

### 5. **CSS Centrage PDF**

**Fichier:** `src/utils/exportStyles/pdf-html-generator.ts`

**CSS clés:**

```css
body {
  background: white;
  margin: 0;
  padding: 0;
  /* PAS de display: flex - ne marche pas en PDF */
}

.container {
  background: var(--background);
  border-radius: 20px;
  padding: 2.5rem;
  max-width: 42rem;
  width: calc(100% - 80px);  /* ← Largeur avec marges */
  margin: 40px auto;  /* ← AUTO = centré */
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

---

### 6. **Fix Style Parameter**

**Fichier:** `src/utils/exportStyles/pdf-html-generator.ts`

**Ligne 9 (dans generateChatHTMLForPDF):**

```typescript
// AVANT
const markdown = await generateStyledMarkdown(events, options.style || 'design', {

// APRÈS (force 'design' car le style est géré dans le HTML)
const markdown = await generateStyledMarkdown(events, 'design', {
```

**Pourquoi:** `generateStyledMarkdown` attend `'design'` ou `'sobre'`, pas `'design-color'`

---

## 🎨 PROCHAINS RÉGLAGES (basés sur l'image)

### 1. **Réduire la largeur du container**

**Actuellement trop large, déborde un peu**

**Dans `pdf-html-generator.ts`, CSS `.container`:**

```css
.container {
  max-width: 32rem;  /* ← Au lieu de 42rem */
  width: calc(100% - 120px);  /* ← Marges plus grandes */
  margin: 60px auto;  /* ← Plus d'espace haut/bas */
}
```

---

### 2. **Réduire taille du header**

**L'avatar et le header prennent trop de place**

**Dans `pdf-html-generator.ts`, CSS header:**

```css
.header-avatar {
  width: 140px;  /* ← Au lieu de 180px */
  height: 180px;  /* ← Au lieu de 240px */
}

.header {
  margin-top: 2rem;  /* ← Au lieu de 3rem */
  padding-top: 1rem;  /* ← Au lieu de 1.5rem */
}
```

---

### 3. **Réduire padding du container**

**Pour gagner de l'espace**

```css
.container {
  padding: 2rem;  /* ← Au lieu de 2.5rem */
}
```

---

### 4. **Ajuster marges messages**

**Messages trop serrés verticalement**

```css
.content h2 {
  margin: 1rem 0 0.4rem;  /* ← Au lieu de 1.3rem 0 0.6rem */
}

.content p {
  margin: 1rem 0;  /* ← Au lieu de 1.4em 0 */
}
```

---

### 5. **Code boxes user - border plus visible**

**Actuellement border grise, peu visible**

```css
.content pre.language-user {
  border: 2px solid var(--secondary-color);  /* ← Au lieu de 1px */
}
```

---

### 6. **Réduire font-size global**

**Pour faire tenir plus de contenu**

```css
body {
  font-size: 14px;  /* ← Au lieu de 15px */
}
```

---

## 📁 FICHIERS MODIFIÉS (résumé)

1. **`src/utils/exportStyles/pdf-html-generator.ts`** (CRÉÉ)
   - Nouveau générateur HTML pour PDF
   - CSS optimisé centrage
   - Décodage HTML entities

2. **`src/app/api/export/generate/route.ts`**
   - Import `generateChatHTMLForPDF`
   - Utilisation dans `generatePDF()` lignes 146 et 186

3. **`src/utils/pdf/converter/index.ts`**
   - Méthode `convertHTML()` simplifiée
   - Suppression injection CSS
   - `preferCSSPageSize: true`

4. **`package.json`** (via npm install)
   - Ajout `he` (décodage HTML entities)
   - Ajout `@types/he`

---

## 🐛 BUGS FIXÉS

1. ✅ PDF collé à gauche → Centré avec marges blanches
2. ✅ Code boxes tous pareils → Différenciés (mais à améliorer)
3. ✅ `&#x27;` dans code user → `'` correctement affiché
4. ✅ Mauvais générateur → Bon générateur pour PDF
5. ✅ Erreur compilation → Style parameter fixé

---

## 🔄 ARCHITECTURE FINALE

```
Export PDF:
  route.ts 
    → generateChatHTMLForPDF() (pdf-html-generator.ts)
      → generateStyledMarkdown('design')
      → marked.parse()
      → decode HTML entities
      → Template HTML avec CSS centré
    → convertHTMLToPDF() (converter/index.ts)
      → Puppeteer PDF (sans modification HTML)

Export HTML:
  route.ts
    → generateChatHTML() (html-generator.ts)
      → Même flow mais CSS différent

Export Markdown:
  route.ts
    → generateStyledMarkdown(style)
      → Markdown brut
```

---

## 💡 NOTES POUR KHÔRA

### **Le problème initial**

On utilisait `html-generator.ts` pour TOUT (HTML + PDF), mais le CSS était optimisé pour le navigateur (flexbox, etc.) et ne marchait pas bien avec Puppeteer.

### **La solution**

Créer un générateur séparé `pdf-html-generator.ts` avec un CSS spécifique pour PDF :
- Centrage via `margin: auto` au lieu de flexbox
- Largeurs fixes avec `calc()`
- Marges adaptées pour Puppeteer

### **Points d'attention**

1. Ne JAMAIS injecter de CSS externe dans `convertHTML()` - le HTML contient déjà tout
2. `generateStyledMarkdown` ne connaît que `'design'` et `'sobre'`, pas `'design-color'`
3. Pour décoder les HTML entities, utiliser la lib `he` (pas de regex manuel)

### **Debug**

Le converter génère toujours `debug-pdf-final.html` à la racine du projet. Ouvrir ce fichier dans Chrome pour voir exactement ce qui sera converti en PDF.

---

## 📸 RÉSULTAT ACTUEL (image jointe)

✅ Container centré  
✅ Bordure blanche visible  
✅ Code boxes différenciés  
✅ Caractères spéciaux corrects  

⚠️ À ajuster:
- Largeur container (trop large)
- Taille header/avatar (trop grand)
- Marges messages (trop serrées)
- Font-size général (trop grand)

---

## 🚀 PROCHAINE ÉTAPE

Appliquer les 6 réglages CSS listés ci-dessus dans `pdf-html-generator.ts` pour optimiser le layout final.

---

**Fichiers de référence fournis:**
- `pdf-html-generator-fixed.ts` (générateur complet)
- `index-fixed.ts` (converter sans injection CSS)
- `INSTRUCTIONS-ROUTE-FIX.txt` (changements route.ts)