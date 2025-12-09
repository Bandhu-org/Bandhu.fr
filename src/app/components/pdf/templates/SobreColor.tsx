import { Document, Page, Text } from '@react-pdf/renderer'
import type { PDFEvent, PDFOptions } from '../types'

export const SobreColor = ({ events, options }: { events: PDFEvent[], options: PDFOptions }) => (
  <Document>
    <Page>
      <Text>Sobre Color Template - À implémenter</Text>
    </Page>
  </Document>
)