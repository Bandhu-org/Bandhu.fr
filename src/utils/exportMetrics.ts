// utils/exportMetrics.ts - VERSION COMPATIBLE ES5

export interface ExportMetrics {
  estimatedPages: number;
  fileSize: string;
  messageCount: number;
  estimatedTime: string;
  characterCount: number;
  wordCount: number;
}

// Configuration des métriques par format
const FORMAT_METRICS = {
  pdf: {
    charsPerPage: 1800, // PDF a généralement moins de texte par page
    sizeMultiplier: 1.2 // PDF prend plus de place
  },
  docx: {
    charsPerPage: 2000,
    sizeMultiplier: 1.1 // DOCX a du métadata
  },
  markdown: {
    charsPerPage: 2500, // Markdown est plus dense
    sizeMultiplier: 1.0 // Format le plus léger
  }
} as const;

// Facteurs de lecture selon le format
const READING_SPEED = {
  pdf: 180, // PDF se lit plus lentement
  docx: 200,
  markdown: 220 // Markdown se lit plus vite
} as const;

export const calculateMetrics = (
  content: string, 
  format: 'pdf' | 'docx' | 'markdown',
  messageCount: number
): ExportMetrics => {
  // Comptages de base
  const characterCount = content.length;
  const wordCount = countWords(content);
  
  // Calcul des pages estimées selon le format
  const formatConfig = FORMAT_METRICS[format];
  const estimatedPages = Math.max(1, Math.ceil(characterCount / formatConfig.charsPerPage));
  
  // Calcul de la taille avec multiplicateur de format
  const baseSize = new Blob([content]).size;
  const adjustedSize = Math.ceil(baseSize * formatConfig.sizeMultiplier);
  const fileSize = formatFileSize(adjustedSize);
  
  // Temps de lecture adapté au format
  const readingSpeed = READING_SPEED[format];
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / readingSpeed));
  const estimatedTime = formatReadingTime(readingTimeMinutes);

  return {
    estimatedPages,
    fileSize,
    messageCount,
    estimatedTime,
    characterCount,
    wordCount
  };
};

// Comptage de mots compatible ES5 (sans flag Unicode)
const countWords = (text: string): number => {
  if (!text.trim()) return 0;
  
  // Version compatible ES5 - supprime la ponctuation
  const cleanText = text
    .replace(/[^\w\u00C0-\u017F\s-]/g, ' ') // Support étendu pour caractères accentués
    .replace(/\s+/g, ' ')
    .trim();
  
  return cleanText ? cleanText.split(' ').filter(word => word.length > 0).length : 0;
};

// Formatage du temps de lecture
const formatReadingTime = (minutes: number): string => {
  if (minutes < 1) return 'Moins de 1 min';
  if (minutes === 1) return '1 min de lecture';
  if (minutes < 60) return `${minutes} min de lecture`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} h de lecture`;
  }
  
  return `${hours} h ${remainingMinutes} min de lecture`;
};

// Formatage de la taille de fichier (version améliorée)
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  const value = bytes / Math.pow(k, i);
  
  // Formatage intelligent selon la taille
  if (value < 10) {
    return `${value.toFixed(1)} ${sizes[i]}`;
  } else if (value < 100) {
    return `${value.toFixed(1)} ${sizes[i]}`;
  } else {
    return `${Math.round(value)} ${sizes[i]}`;
  }
};

// Fonction utilitaire pour obtenir des métriques rapides (pour l'UI)
export const getQuickMetrics = (
  selectedEventsCount: number,
  format: 'pdf' | 'docx' | 'markdown'
): Pick<ExportMetrics, 'estimatedPages' | 'estimatedTime'> => {
  // Estimation basée sur le nombre de messages (moyenne 150 caractères/message)
  const estimatedChars = selectedEventsCount * 150;
  const formatConfig = FORMAT_METRICS[format];
  
  const estimatedPages = Math.max(1, Math.ceil(estimatedChars / formatConfig.charsPerPage));
  const estimatedWords = Math.ceil(estimatedChars / 5); // ~5 caractères/mot
  const readingSpeed = READING_SPEED[format];
  const readingTimeMinutes = Math.max(1, Math.ceil(estimatedWords / readingSpeed));
  
  return {
    estimatedPages,
    estimatedTime: formatReadingTime(readingTimeMinutes)
  };
};