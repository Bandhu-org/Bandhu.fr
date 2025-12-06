import { Document, Page, Text } from '@react-pdf/renderer'
import type { PDFEvent, PDFOptions } from '../types'

export const DesignBW = ({ events, options }: { events: PDFEvent[], options: PDFOptions }) => (
  <Document>
    <Page>
      <Text>Design BW Template - À implémenter</Text>
    </Page>
  </Document>
)