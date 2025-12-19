// src/types/timeline.ts

/**
 * Métadonnées légères - TOUJOURS en mémoire
 * Utilisé pour : Bars, Mini-containers, calcul positions
 */
export interface EventMetadata {
  id: string
  createdAt: Date
  role: 'user' | 'assistant' | 'system'
  threadId: string
}

/**
 * Détails lourds - Chargés à la demande
 * Utilisé pour : Mode Discrete (full containers)
 */
export interface EventDetails {
  id: string
  contentPreview: string
  threadLabel: string
  userName?: string
}

/**
 * Event complet (pour usage interne si besoin)
 */
export interface TimelineEvent extends EventMetadata {
  contentPreview: string
  threadLabel: string
  userName?: string
  userId: string
}

/**
 * Thread data (inchangé)
 */
export interface ThreadData {
  id: string
  label: string
  messageCount: number
  lastActivity: Date
}

/**
 * View mode
 */
export type ViewMode = 'timeline' | 'threads'

/**
 * Timeline range
 */
export interface TimelineRange {
  start: Date
  end: Date
}

/**
 * API Response - Metadata
 */
export interface MetadataResponse {
  events: Array<{
    id: string
    createdAt: string
    role: 'user' | 'assistant' | 'system'
    threadId: string
  }>
  meta: {
    total: number
    firstEventDate: string
    lastEventDate: string
  }
}

/**
 * API Response - Details
 */
export interface DetailsResponse {
  details: Record<string, {
    contentPreview: string
    threadLabel: string
    userName?: string
  }>
}