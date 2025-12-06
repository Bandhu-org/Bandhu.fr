import { Document, Page, Text } from '@react-pdf/renderer'
import type { PDFEvent, PDFOptions } from '../types'

export const SobreBW = ({ events, options }: { events: PDFEvent[], options: PDFOptions }) => (
  <Document>
    <Page>
      <Text>Sobre BW Template - À implémenter</Text>
    </Page>
  </Document>
)