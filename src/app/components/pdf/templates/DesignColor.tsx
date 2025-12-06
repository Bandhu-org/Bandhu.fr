import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import type { PDFEvent, PDFOptions } from '../types'

// Enregistrer une police (optionnel - on peut utiliser Helvetica par défaut)
// Font.register({
//   family: 'Inter',
//   fonts: [
//     { src: '/fonts/Inter-Regular.ttf' },
//     { src: '/fonts/Inter-Bold.ttf', fontWeight: 700 }
//   ]
// })

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#0f172a', // Fond sombre Bandhu
    padding: 40,
    fontFamily: 'Helvetica'
  },
  header: {
    marginBottom: 30,
    alignItems: 'center'
  },
  title: {
    fontSize: 28,
    color: '#a78bfa', // Violet Bandhu
    fontWeight: 'bold',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4
  },
  date: {
    fontSize: 10,
    color: '#64748b'
  },
  separator: {
    height: 2,
    backgroundColor: '#334155',
    marginVertical: 20,
    width: '100%'
  },
  threadHeader: {
    marginBottom: 15,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  threadTitle: {
    fontSize: 18,
    color: '#60a5fa', // Bleu Bandhu
    fontWeight: 'bold'
  },
  messageContainer: {
    marginBottom: 20,
    flexDirection: 'row'
  },
  avatarContainer: {
    marginRight: 12,
    alignItems: 'center'
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4
  },
  userAvatar: {
    backgroundColor: '#3b82f6' // Bleu utilisateur
  },
  aiAvatar: {
    backgroundColor: '#8b5cf6' // Violet Ombrelien
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  messageContent: {
    flex: 1,
    flexDirection: 'column'
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  username: {
    fontSize: 13,
    fontWeight: 'bold'
  },
  userUsername: {
    color: '#60a5fa'
  },
  aiUsername: {
    color: '#a78bfa'
  },
  timestamp: {
    fontSize: 10,
    color: '#94a3b8'
  },
  bubble: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderLeftWidth: 4
  },
  userBubble: {
    borderLeftColor: '#3b82f6',
    backgroundColor: '#1e293b'
  },
  aiBubble: {
    borderLeftColor: '#8b5cf6',
    backgroundColor: '#1e1b4b'
  },
  messageText: {
    fontSize: 11,
    color: '#e2e8f0',
    lineHeight: 1.5
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    alignItems: 'center'
  },
  footerText: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center'
  }
})

export const DesignColor = ({ events, options }: { events: PDFEvent[], options: PDFOptions }) => {
  let currentThreadId: string | null = null
  const now = new Date()
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🌌 Bandhu Export</Text>
          <Text style={styles.subtitle}>Ombrelien - छायासरस्वतः</Text>
          <Text style={styles.date}>
            {now.toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
        </View>
        
        <View style={styles.separator} />
        
        {/* Messages groupés par thread */}
        {events.map((event) => {
          const isUser = event.role === 'user'
          const showThreadHeader = event.threadId !== currentThreadId
          
          if (showThreadHeader) {
            currentThreadId = event.threadId
          }
          
          return (
            <React.Fragment key={event.id}>
              {showThreadHeader && (
                <View style={styles.threadHeader}>
                  <Text style={styles.threadTitle}>🧵 {event.thread.label}</Text>
                </View>
              )}
              
              <View style={styles.messageContainer}>
                {/* Avatar */}
                <View style={styles.avatarContainer}>
                  <View style={[
                    styles.avatar,
                    isUser ? styles.userAvatar : styles.aiAvatar
                  ]}>
                    <Text style={styles.avatarText}>
                      {isUser ? 'U' : 'O'}
                    </Text>
                  </View>
                </View>
                
                {/* Message content */}
                <View style={styles.messageContent}>
                  <View style={styles.messageHeader}>
                    <Text style={[
                      styles.username,
                      isUser ? styles.userUsername : styles.aiUsername
                    ]}>
                      {isUser ? 'Vous' : 'Ombrelien'}
                    </Text>
                    
                    {options.includeTimestamps && (
                      <Text style={styles.timestamp}>
                        {new Date(event.createdAt).toLocaleTimeString('fr-FR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </Text>
                    )}
                  </View>
                  
                  <View style={[
                    styles.bubble,
                    isUser ? styles.userBubble : styles.aiBubble
                  ]}>
                    <Text style={styles.messageText}>
                      {event.content}
                    </Text>
                  </View>
                </View>
              </View>
            </React.Fragment>
          )
        })}
        
        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Export généré par Bandhu • {events.length} messages • Style Design Color
          </Text>
          <Text style={[styles.footerText, { marginTop: 4 }]}>
            {now.toLocaleTimeString('fr-FR')} • © Bandhu.fr
          </Text>
        </View>
      </Page>
    </Document>
  )
}