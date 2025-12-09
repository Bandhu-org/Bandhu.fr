# 📋 CAHIER DES CHARGES - Layout PDF Final

**Date:** 7 décembre 2025  
**Objectif:** Transformer le PDF pour avoir un layout à 3 couches (fond gris + container bleu + contenu)

---

## 🎨 STRUCTURE VISUELLE ATTENDUE

```
┌─────────────────────────────────────────────────┐
│ FOND GRIS CLAIR (toute la page)                 │
│  ┌────────────────────────────────────────────┐ │
│  │ "🎯 Bandhu export"                         │ │ ← Header Puppeteer (hors container)
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │ CONTAINER BLEU FONCÉ                       │ │
│  │                                             │ │
│  │  [Logo] Bandhu                             │ │
│  │  ─────────────────                         │ │
│  │                                             │ │
│  │  Ombrelien        dimanche 7 décembre ← │ │
│  │  छायासरस्वतः                              │ │
│  │  [Avatar] [Stats]                          │ │
│  │  ─────────────────────────────────────     │ │
│  │                                             │ │
│  │  बन्धु : 03/12/2025 11:03                  │ │
│  │                                             │ │
│  │  🔵 Sounil                                 │ │
│  │  [code box]                                │ │
│  │                                             │ │
│  │  🟣 Ombrelien                              │ │
│  │  texte...                                  │ │
│  │                                             │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │      Fichier 1/1 page 1/5                  │ │ ← Footer Puppeteer (hors container)
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## 🔧 MODIFICATIONS REQUISES

### 1. **CHANGEMENT D'ARCHITECTURE**

**Actuellement:**
- Body = blanc
- Container = bleu foncé centré
- Pas de header/footer

**Nouveau:**
- Body = gris clair (#e5e7eb)
- Container = bleu foncé (inchangé)
- Header Puppeteer = "Bandhu export" en haut
- Footer Puppeteer = "Fichier X/X page Y/Z" en bas

---

### 2. **MODIFICATIONS CSS - `pdf-html-generator.ts`**

#### **A. Body et HTML**

```css
/* AVANT */
html {
  background: var(--background);  /* bleu foncé */
}

body {
  background: var(--background);  /* bleu foncé */
}

/* APRÈS */
html {
  background: #e5e7eb;  /* gris clair */
}

body {
  background: #e5e7eb;  /* gris clair */
}
```

#### **B. Container (inchangé)**

```css
.container {
  background: var(--background);  /* bleu foncé - OK */
  border-radius: 20px;
  padding: 2rem;
  max-width: 32rem;
  width: calc(100% - 40px);
  margin: 60px auto;  /* ← GARDER pour espacement */
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

#### **C. @page - Supprimer marges**

```css
/* AVANT */
@page {
  margin: 40px 0;
}

/* APRÈS */
@page {
  margin: 0;  /* ← Puppeteer gère les marges via header/footer */
}
```

#### **D. @media print**

```css
@media print {
  @page {
    margin: 0;  /* Puppeteer gère tout */
  }
  
  html {
    background: #e5e7eb;
  }
  
  body {
    background: #e5e7eb;
  }
}
```

---

### 3. **MODIFICATIONS CONVERTER - `index.ts`**

#### **A. Méthode `convertHTML()` - Ajouter header/footer**

**Localisation:** Méthode `page.pdf()` ligne ~140

```typescript
const pdfBytes = await page.pdf({
  format: 'A4',
  printBackground: true,
  margin: {
    top: '60px',     // ← AJOUTE pour header
    right: '0mm',
    bottom: '60px',  // ← AJOUTE pour footer
    left: '0mm'
  },
  displayHeaderFooter: true,  // ← CHANGE en true
  headerTemplate: `
    <div style="
      width: 100%;
      font-size: 12px;
      color: #6b7280;
      text-align: left;
      padding: 20px 40px;
      font-family: -apple-system, sans-serif;
    ">
      🎯 <span style="font-weight: 600;">Bandhu export</span>
    </div>
  `,
  footerTemplate: `
    <div style="
      width: 100%;
      font-size: 11px;
      color: #6b7280;
      text-align: center;
      padding: 20px;
      font-family: -apple-system, sans-serif;
    ">
      Fichier <span class="pageNumber"></span>/<span class="totalPages"></span>
    </div>
  `,
  preferCSSPageSize: true
})
```

---

### 4. **GESTION MULTI-FICHIERS (ZIP)**

**Actuellement:** "Fichier 1/1" si un seul PDF

**Attendu:** "Fichier 1/3" si 3 PDFs dans un ZIP

#### **Modification dans `route.ts`**

**Fonction `generatePDF()`, section ZIP (ligne ~180):**

```typescript
const pdfs = await Promise.all(
  chunks.map(async (chunk) => {
    // ... génération HTML ...
    
    const pdfBuffer = await convertHTMLToPDF(
      html,
      style as any,
      { 
        includeTimestamps: options.includeTimestamps,
        fileNumber: chunk.partNumber,      // ← AJOUTE
        totalFiles: chunk.totalParts       // ← AJOUTE
      }
    )
    
    return { buffer: pdfBuffer, ... }
  })
)
```

#### **Modification dans `converter/index.ts`**

**Interface `PDFOptions` (ligne ~6):**

```typescript
interface PDFOptions {
  includeTimestamps?: boolean
  title?: string
  author?: string
  fileNumber?: number      // ← AJOUTE
  totalFiles?: number      // ← AJOUTE
}
```

**Utilisation dans `footerTemplate`:**

```typescript
footerTemplate: `
  <div style="...">
    ${options.fileNumber && options.totalFiles 
      ? `Fichier ${options.fileNumber}/${options.totalFiles} •` 
      : ''
    }
    Page <span class="pageNumber"></span>/<span class="totalPages"></span>
  </div>
`
```

---

## 📊 RÉSUMÉ DES FICHIERS À MODIFIER

### **1. `src/utils/exportStyles/pdf-html-generator.ts`**

**Lignes à changer:**
- ~75-78: `html` et `body` background → `#e5e7eb`
- ~300 (dans @media print): Idem

**Résultat:** Fond gris clair au lieu de bleu

---

### **2. `src/utils/pdf/converter/index.ts`**

**Lignes à changer:**
- ~6: Interface `PDFOptions` → Ajouter `fileNumber?` et `totalFiles?`
- ~140: `page.pdf()` → Ajouter header/footer templates

**Résultat:** Header "Bandhu export" + Footer avec numéros

---

### **3. `src/app/api/export/generate/route.ts`**

**Lignes à changer:**
- ~160 (single PDF): Pass `fileNumber: 1, totalFiles: 1`
- ~186 (multi PDF): Pass `fileNumber: chunk.partNumber, totalFiles: chunk.totalParts`

**Résultat:** Footer affiche "Fichier X/Y page N/Z"

---

## 🎨 DÉTAILS VISUELS

### **Couleurs**

```css
--fond-gris: #e5e7eb         /* Fond page */
--container-bleu: #0f172a    /* Container (inchangé) */
--header-footer: #6b7280     /* Texte header/footer */
```

### **Typographie Header/Footer**

```css
font-size: 12px (header)
font-size: 11px (footer)
font-family: -apple-system, sans-serif
color: #6b7280
```

### **Espacements**

```
Header: padding 20px 40px (haut/bas gauche/droite)
Footer: padding 20px (uniforme)
Container margin: 60px auto (inchangé)
```

---

## ✅ TESTS À FAIRE

1. **Export PDF simple (30 messages)**
   - Vérifier fond gris
   - Vérifier header "Bandhu export"
   - Vérifier footer "Fichier 1/1 page X/Y"

2. **Export PDF multiple (600 messages = 3 PDFs)**
   - Vérifier ZIP créé
   - Vérifier footer "Fichier 1/3", "Fichier 2/3", "Fichier 3/3"
   - Vérifier pagination continue dans chaque fichier

3. **Vérifier continuité contenu**
   - Messages pas coupés entre pages
   - Code blocks restent entiers
   - Header pas répété sur chaque page (juste en haut de fichier)

---

## 🐛 POINTS D'ATTENTION

### **1. Header Puppeteer vs Header HTML**

**Attention:** Ne pas confondre :
- Header Puppeteer = "Bandhu export" (géré par `headerTemplate`)
- Header HTML = Logo + Ombrelien + Stats (dans le container)

Le header HTML doit rester UNIQUEMENT sur la première page du fichier.

### **2. Marges Puppeteer**

```typescript
margin: { top: '60px', bottom: '60px' }
```

**= Espace réservé pour header/footer**

Le container HTML doit avoir `margin-top: 0` sur la première page pour ne pas créer d'espace double.

### **3. Classes Puppeteer**

Dans `footerTemplate`, utiliser :
- `<span class="pageNumber"></span>` → Numéro page actuelle
- `<span class="totalPages"></span>` → Total pages du fichier

**Ne PAS mettre de variables JS** - Puppeteer remplace automatiquement.

---

## 📁 ORDRE DES MODIFICATIONS

1. **Étape 1:** Modifier CSS (fond gris)
2. **Étape 2:** Modifier converter (header/footer)
3. **Étape 3:** Tester avec 1 PDF
4. **Étape 4:** Modifier route.ts (fileNumber)
5. **Étape 5:** Tester avec ZIP multi-PDF

---

## 🚀 RÉSULTAT FINAL ATTENDU

**Page 1 fichier 1:**
```
┌─────────────────────────┐
│ 🎯 Bandhu export        │ ← Header Puppeteer
├─────────────────────────┤
│ [FOND GRIS]             │
│  ┌──────────────────┐   │
│  │ CONTAINER BLEU   │   │
│  │ [Logo] Bandhu    │   │
│  │ Ombrelien + Stats│   │
│  │ Messages...      │   │
│  └──────────────────┘   │
├─────────────────────────┤
│ Fichier 1/1 page 1/5    │ ← Footer Puppeteer
└─────────────────────────┘
```

**Page 2 fichier 1:**
```
┌─────────────────────────┐
│ 🎯 Bandhu export        │
├─────────────────────────┤
│ [FOND GRIS]             │
│  ┌──────────────────┐   │
│  │ CONTAINER BLEU   │   │
│  │ (suite messages) │   │ ← PAS de header HTML
│  └──────────────────┘   │
├─────────────────────────┤
│ Fichier 1/1 page 2/5    │
└─────────────────────────┘
```

---

**Voilà le cahier des charges complet !** 🎯