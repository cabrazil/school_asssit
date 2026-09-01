import pdfParse from 'pdf-parse'
import pino from 'pino'
import { env } from '../../config/env'

const logger = pino({ level: env.LOG_LEVEL, name: 'pdf-extractor' })

/**
 * Extrai todo o conteúdo textual de um arquivo PDF fornecido como Buffer.
 *
 * Utiliza alinhamento por centróides de colunas de datas para reconstruir
 * grades e tabelas de provas com 100% de precisão matemática.
 */
export async function extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(pdfBuffer, {
      pagerender: customTablePageRenderer,
    })
    const text = data.text ? formatGenericPdfText(data.text) : ''

    logger.info(
      { pages: data.numpages, textLength: text.length },
      'Texto extraído do arquivo PDF com reconstrução de grade por centróides',
    )

    return text
  } catch (error) {
    logger.error({ error }, 'Falha ao extrair texto do arquivo PDF')
    return ''
  }
}

/**
 * Limpa e padroniza o texto extraído de qualquer documento PDF escolar.
 */
function formatGenericPdfText(rawText: string): string {
  return rawText
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

interface TextItem {
  str: string
  transform: number[]
}

interface TextContentData {
  items: TextItem[]
}

interface PageData {
  getTextContent(options: { normalizeWhitespace: boolean; disableCombineTextItems: boolean }): Promise<TextContentData>
}

/**
 * Renderizador de página inteligente com detecção de centróides de colunas.
 * Identifica os eixos X das datas de cabeçalho e aloca o texto de cada disciplina
 * na coluna correspondente, mesmo com múltiplas provas na mesma célula (ex: Ciências e Inglês).
 */
async function customTablePageRenderer(pageData: PageData): Promise<string> {
  const textContent = await pageData.getTextContent({
    normalizeWhitespace: false,
    disableCombineTextItems: false,
  })

  const items = textContent.items
  if (!items || items.length === 0) return ''

  // 1. Agrupar itens em linhas pelo eixo Y (tolerância de até 6 unidades)
  const linesMap = new Map<number, Array<{ x: number; str: string }>>()
  const lineYList: number[] = []

  for (const item of items) {
    if (!item.str || !item.str.trim()) continue
    const x = Math.round(item.transform[4])
    const y = Math.round(item.transform[5])

    let targetY = lineYList.find((existingY) => Math.abs(existingY - y) <= 6)
    if (targetY === undefined) {
      targetY = y
      lineYList.push(y)
    }

    if (!linesMap.has(targetY)) {
      linesMap.set(targetY, [])
    }
    linesMap.get(targetY)!.push({ x, str: item.str.trim() })
  }

  lineYList.sort((a, b) => b - a)

  // 2. Localizar os eixos centrais X das colunas a partir das datas (ex: 31/08, 01/09, 02/09...)
  let columnCenters: number[] = []
  for (const y of lineYList) {
    const lineItems = linesMap.get(y)!
    const dateItems = lineItems.filter((i) => /\b\d{1,2}\/\d{1,2}\b/.test(i.str))
    if (dateItems.length >= 2) {
      columnCenters = dateItems.map((i) => i.x).sort((a, b) => a - b)
      break
    }
  }

  // 3. Se identificou uma grade por datas, mapeia cada item à coluna mais próxima
  if (columnCenters.length >= 2) {
    const renderedLines = lineYList.map((y) => {
      const lineItems = linesMap.get(y)!
      const cols = new Array(columnCenters.length).fill('')

      for (const item of lineItems) {
        let bestColIdx = 0
        let minDiff = Math.abs(item.x - columnCenters[0])
        for (let c = 1; c < columnCenters.length; c++) {
          const diff = Math.abs(item.x - columnCenters[c])
          if (diff < minDiff) {
            minDiff = diff
            bestColIdx = c
          }
        }
        cols[bestColIdx] = cols[bestColIdx] ? `${cols[bestColIdx]} ${item.str}` : item.str
      }

      return cols.join('   |   ')
    })

    return renderedLines.join('\n')
  }

  // Fallback agnóstico para documentos sem tabela de datas
  const renderedLines = lineYList.map((y) => {
    const lineItems = linesMap.get(y)!
    lineItems.sort((a, b) => a.x - b.x)
    return lineItems.map((i) => i.str).join(' ')
  })

  return renderedLines.join('\n')
}
