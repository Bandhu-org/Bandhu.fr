Khôra crée la documentation — prête à la livrer

text
  ╭──────────────────────────────────────────╮  
  │   📄 **DOCUMENTATION PRÊTE**             │  
  │                                          │  
  │   Voici le fichier complet :             │  
  │   EXPORT_ARCHITECTURE.md                 │  
  │                                          │  
  │   Je l'écris en markdown propre,         │  
  │   avec schémas ASCII et explications.    │  
  │                                          │  
  │   À placer dans :                        │  
  │   /docs/ ou à la racine du projet.       │  
  ╰──────────────────────────┬───────────────╯  
                             ∥  
                     [DOC_GÉNÉRÉE]
📁 Architecture d'export Bandhu.fr
Documentation technique des pipelines d'export — décembre 2025

🎯 Vue d'ensemble
Bandhu.fr propose 4 formats d'export, chacun avec son pipeline spécifique :

PDF (3 styles : Minimal, BW, Color)

HTML (pour visualisation web)

Markdown (texte brut)

DOCX (Word)

Cette documentation se concentre sur l'architecture des pipelines PDF/HTML.

📊 Schéma global
text
┌─────────────────────────────────────────────────────────┐
│                    API /api/export/generate             │
└─────────────┬─────────────┬─────────────┬───────────────┘
              │             │             │
          [PDF]         [HTML]      [Markdown]      [DOCX]
             │             │             │
    ┌────────┴─────┐       │             │
    │ 3 sous-styles │      │             │
    │ • minimal-bw  │      │             │
    │ • design-bw   │      │             │
    │ • design-color│      │             │
    └───────┬──────┘       │             │
            │              │             │
    ┌───────▼──────┐  ┌────▼────┐  ┌─────▼─────┐
    │ PDF Converter │  │HTML Web │  │Autres    │
    │ (partagé)     │  │Pipeline │  │générateurs│
    └───────────────┘  └─────────┘  └───────────┘
🔄 Pipeline 1 : PDF Minimal (minimal-bw)
Style : Noir & blanc ultra-minimaliste, monospace, sans fioritures
Fichiers : 3 fichiers modulaires

text
Événements
    ↓
src/utils/exportStyles/minimal-export-orchestrator.ts
    ├→ minimal-markdown-generator.ts   (texte brut structuré)
    └→ minimal-html-generator.ts       (template HTML minimal)
    ↓
HTML minimal → PDF Converter → PDF final
Détails :

minimal-markdown-generator : Formatte les événements en texte brut avec séparateurs

minimal-html-generator : Template HTML simple avec juste {{CONTENT}}

minimal-export-orchestrator : Orchestre les deux étapes (anciennement minimal-pdf-generator)

⚫ Pipeline 2 : PDF Noir & Blanc stylé (design-bw)
Style : Noir & blanc avec design riche, header/footer, statistiques
Fichiers : 2 fichiers intégrés

text
Événements
    ↓
src/utils/exportStyles/bw-pdf-html-generator.ts
    → markdow-for-html-pdf-bw.ts      (markdown stylisé BW)
    ↓
HTML riche BW → PDF Converter → PDF final
Détails :

markdow-for-html-pdf-bw : Génère du markdown optimisé pour le style BW

bw-pdf-html-generator : Combine conversion markdown→HTML ET template riche

🎨 Pipeline 3 : PDF Coloré (design-color)
Style : Couleurs, syntax highlighting, design Bandhu complet
Fichiers : 2 fichiers intégrés

text
Événements
    ↓
src/utils/exportStyles/pdf-html-generator.ts
    → markdown-for-html-pdf-color.ts  (markdown stylisé color)
    ↓
HTML riche color → PDF Converter → PDF final
Détails :

markdown-for-html-pdf-color : Génère du markdown avec couleurs

pdf-html-generator : Template coloré avec syntax highlighting VS Code

🌐 Pipeline 4 : HTML Web (html)
Style : Pour visualisation dans le navigateur, non destiné à l'impression
Fichiers : 2 fichiers

text
Événements
    ↓
src/utils/exportStyles/html-generator.ts
    → markdown-for-html.ts            (markdown pour web)
    ↓
HTML web (affichage navigateur)
Note : Ce pipeline ne passe pas par le PDF Converter.

🛠️ Convertisseur PDF universel
Fichier : src/utils/pdf/converter/index.ts
Rôle : Convertit n'importe quel HTML en PDF
Partagé par : Les 3 pipelines PDF (Minimal, BW, Color)

text
HTML (de n'importe quel pipeline)
    ↓
convertHTMLToPDF(html, style, options)
    ↓
PDF via Puppeteer
Fonctionnalités :

Supporte les 5 styles PDF : design-color, design-bw, sobre-color, sobre-bw, minimal-bw

Gestion des marges, header/footer d'impression

Debug HTML sauvegardé dans debug-pdf-final.html

🔧 Différences architecturales
Pipeline	Fichiers	Philosophie	Sortie
Minimal	3	Modulaire (séparation markdown/HTML)	PDF
BW	2	Intégré (markdown→HTML combiné)	PDF
Color	2	Intégré (markdown→HTML combiné)	PDF
HTML Web	2	Intégré (markdown→HTML combiné)	HTML
Note : Cette dualité (3 vs 2 fichiers) est un choix architectural historique. Chaque pipeline est cohérent en interne.

🚀 Workflow de développement
Ajouter un nouveau style PDF
Créer un générateur markdown (markdown-for-html-pdf-{style}.ts)

Créer un générateur HTML ({style}-pdf-html-generator.ts)

Ajouter le style dans PDFStyle (converter/index.ts)

Ajouter le cas dans l'API route

Débuguer un export
Vérifier les logs dans la console (🔍 [HTML GENERATOR], etc.)

Examiner debug-pdf-final.html (généré par le converter)

Vérifier l'extraction des noms (regex [^•]+? pour [Nom • timestamp])

📝 Notes importantes
Extraction des noms utilisateur
Les pipelines utilisent une regex robuste pour extraire le nom du format [Nom • timestamp] :

typescript
const nameMatch = event.content.match(/^\[([^•]+?)\s*•/)
Problème connu : Les anciens messages (pré-décembre 2025) n'ont pas ce format et affichent "User" comme fallback.

Conventions de nommage
*-generator.ts : Génère du contenu (markdown ou HTML)

*-orchestrator.ts : Orchestre plusieurs générateurs

converter/* : Conversion de format (HTML→PDF)

Logs de debug
Chaque pipeline a ses propres logs préfixés :

[MINIMAL] → Pipeline minimal

[BW] → Pipeline noir & blanc

[HTML GENERATOR PDF] → Pipeline color

[PDF CONVERTER] → Convertisseur universel

🧭 Arborescence des fichiers
text
src/utils/exportStyles/
├── minimal-markdown-generator.ts          # Pipeline 1-1
├── minimal-html-generator.ts              # Pipeline 1-2
├── minimal-export-orchestrator.ts         # Pipeline 1-3 (orchestrateur)
│
├── markdow-for-html-pdf-bw.ts            # Pipeline 2-1
├── bw-pdf-html-generator.ts              # Pipeline 2-2 (orchestrateur)
│
├── markdown-for-html-pdf-color.ts        # Pipeline 3-1
├── pdf-html-generator.ts                 # Pipeline 3-2 (orchestrateur)
│
├── markdown-for-html.ts                  # Pipeline 4-1
├── html-generator.ts                     # Pipeline 4-2 (orchestrateur)
│
└── pdf/converter/index.ts                # Convertisseur universel PDF
Mainteneurs : Sounil & Khôra
Dernière mise à jour : Décembre 2025
Statut : Architecture stable, documentation vivante