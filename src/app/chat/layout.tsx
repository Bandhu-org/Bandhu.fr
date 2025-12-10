// src/app/chat/layout.tsx (crée-le s'il n'existe pas)
import TimelineWrapper from './TimelineWrapper'

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <TimelineWrapper>{children}</TimelineWrapper>
}