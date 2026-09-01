import pdfParse from 'pdf-parse'
import pino from 'pino'
import { env } from '../../config/env'

const logger = pino({ level: env.LOG_LEVEL, name: 'pdf-extractor' })

/**
 * Extrai todo o conteúdo textual de um arquivo PDF fornecido como Buffer.
 *
 * Utiliza alinhamento por blocos verticais de colunas (Vertical Block Extraction)
 * para reconstruir tabelas multicolunas com células verticais de múltiplas linhas.
 */
export async function extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(pdfBuffer, {
      pagerender: customTablePageRenderer,
    })
    const text = data.text ? formatGenericPdfText(data.text) : ''

    logger.info(
      { pages: data.numpages, textLength: text.length },
      'Texto extraído do arquivo PDF com reconstrução vertical de colunas',
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
 * Renderizador de página inteligente com extração por blocos verticais de colunas.
 * Varre toda a página para localizar os eixos X de TODAS as datas do cabeçalho
 * e agrupa TODO o conteúdo de cada coluna de cima a baixo antes de passar para a próxima.
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
  const allDateItems: Array<{ x: number; str: string }> = []

  for (const item of items) {
    if (!item.str || !item.str.trim()) continue
    const x = Math.round(item.transform[4])
    const y = Math.round(item.transform[5])
    const str = item.str.trim()

    let targetY = lineYList.find((existingY) => Math.abs(existingY - y) <= 6)
    if (targetY === undefined) {
      targetY = y
      lineYList.push(y)
    }

    if (!linesMap.has(targetY)) {
      linesMap.set(targetY, [])
    }
    linesMap.get(targetY)!.push({ x, str })

    if (/\b\d{1,2}\/\d{1,2}\b/.test(str)) {
      allDateItems.push({ x, str })
    }
  }

  lineYList.sort((a, b) => b - a)

  // 2. Coletar os eixos centrais X de TODAS as datas encontradas na página (agrupando por proximidade X)
  const rawDateX = allDateItems.map((d) => d.x).sort((a, b) => a - b)
  const columnCenters: number[] = []
  for (const x of rawDateX) {
    const existing = columnCenters.find((cx) => Math.abs(cx - x) <= 30)
    if (existing === undefined) {
      columnCenters.push(x)
    }
  }
  columnCenters.sort((a, b) => a - b)

  // 3. Se identificou 2 ou mais colunas de datas, agrupa o conteúdo por blocos verticais de coluna
  if (columnCenters.length >= 2) {
    const columnBlocks: string[][] = Array.from({ length: columnCenters.length }, () => [])

    for (const y of lineYList) {
      const lineItems = linesMap.get(y)!
      lineItems.sort((a, b) => a.x - b.x)

      const lineColMap = new Map<number, string[]>()
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
        if (!lineColMap.has(bestColIdx)) {
          lineColMap.set(bestColIdx, [])
        }
        lineColMap.get(bestColIdx)!.push(item.str)
      }

      lineColMap.forEach((words, colIdx) => {
        columnBlocks[colIdx].push(words.join(' '))
      })
    }

    const resultBlocks = columnBlocks.map((lines, colIdx) => {
      return `--- [COLUNA DA TABELA ${colIdx + 1}] ---\n${lines.join('\n')}`
    })

    return resultBlocks.join('\n\n')
  }

  // Fallback para documentos textuais sem tabelas de datas
  const renderedLines = lineYList.map((y) => {
    const lineItems = linesMap.get(y)!
    lineItems.sort((a, b) => a.x - b.x)
    return lineItems.map((i) => i.str).join(' ')
  })

  return renderedLines.join('\n')
}
