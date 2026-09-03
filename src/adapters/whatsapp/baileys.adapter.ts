import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  downloadMediaMessage,
  type WASocket,
  type proto,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import fs from 'fs'
import pino from 'pino'
import qrcodeTerminal from 'qrcode-terminal'
import { env } from '../../config/env'
import type { IWhatsAppAdapter } from './whatsapp.interface'
import type { IncomingMessage } from './types'
import { extractTextFromPdf } from '../pdf/pdf-extractor'

/**
 * Adaptador Baileys para o WhatsApp.
 *
 * Responsabilidades:
 *  - Gerenciar conexão e autenticação (QR Code / sessão)
 *  - Receber mensagens e convertê-las para IncomingMessage
 *  - Enviar respostas
 *  - NÃO conter lógica de negócio
 *
 * Privacidade:
 *  - O conteúdo das mensagens nunca é escrito nos logs
 *  - Apenas metadados (ID, telefone mascarado) são logados
 */
export class BaileysAdapter implements IWhatsAppAdapter {
  private socket: WASocket | null = null
  private messageHandler: ((message: IncomingMessage) => Promise<void>) | null = null
  private logger = pino({ level: env.LOG_LEVEL, name: 'baileys' })

  onMessage(handler: (message: IncomingMessage) => Promise<void>): void {
    this.messageHandler = handler
  }

  async connect(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(env.WA_SESSION_DIR)

    this.socket = makeWASocket({
      auth: state,
      // Usar logger silencioso do Baileys — logs de protocolo são muito verbosos
      logger: pino({ level: 'silent' }),
      // Não baixar histórico de mensagens antigas
      syncFullHistory: false,
    })

    this.socket.ev.on('creds.update', saveCreds)

    this.socket.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        console.log('\n=================== QR CODE WHATSAPP ===================\n')
        qrcodeTerminal.generate(qr, { small: true })
        console.log('\nEscaneie o QR Code acima com o WhatsApp do número dedicado.\n=======================================================\n')
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut

        this.logger.warn(
          { statusCode, shouldReconnect },
          'Conexão WhatsApp encerrada',
        )

        if (shouldReconnect) {
          this.logger.info('Reconectando em 5 segundos...')
          setTimeout(() => this.connect(), 5000)
        } else {
          this.logger.error(
            'Sessão invalidada (HTTP 401). Limpando credenciais expiradas e aguardando novo QR Code em 5 segundos...',
          )
          try {
            if (fs.existsSync(env.WA_SESSION_DIR)) {
              fs.rmSync(env.WA_SESSION_DIR, { recursive: true, force: true })
            }
          } catch (err) {
            this.logger.error({ err }, 'Erro ao limpar diretório de sessão expirada')
          }
          setTimeout(() => this.connect(), 5000)
        }
      }

      if (connection === 'open') {
        this.logger.info('✅ WhatsApp conectado com sucesso')
      }
    })

    this.socket.ev.on('messages.upsert', async ({ messages, type }) => {
      // Processar apenas mensagens novas (não histórico)
      if (type !== 'notify') return

      for (const msg of messages) {
        await this.handleRawMessage(msg)
      }
    })
  }

  async sendMessage(to: string, text: string): Promise<void> {
    if (!this.socket) {
      throw new Error('WhatsApp não conectado')
    }

    // Baileys espera o JID no formato "número@s.whatsapp.net"
    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`

    await this.socket.sendMessage(jid, { text })
    this.logger.info({ to: maskPhone(to) }, 'Mensagem enviada')
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      await this.socket.logout()
      this.socket = null
      this.logger.info('WhatsApp desconectado')
    }
  }

  // ------------------------------------------------------------------
  // Privado
  // ------------------------------------------------------------------

  private async handleRawMessage(msg: proto.IWebMessageInfo): Promise<void> {
    // Ignorar mensagens do próprio bot
    if (msg.key.fromMe) return
    // Ignorar mensagens sem conteúdo
    if (!msg.message) return

    const id = msg.key.id
    if (!id) {
      this.logger.warn('Mensagem recebida sem ID — ignorando')
      return
    }

    // Extrair número do remetente (prioriza senderPn/participantPn se presente no pacote)
    const key = msg.key as any
    const senderPn = key?.senderPn ? jidToPhone(key.senderPn) : (key?.participantPn ? jidToPhone(key.participantPn) : null)
    const senderJid = msg.key.remoteJid ?? ''
    const senderPhone = senderPn || jidToPhone(senderJid)

    if (!senderPhone) {
      this.logger.warn({ jid: senderJid }, 'JID inválido — ignorando mensagem')
      return
    }

    // Extrair conteúdo textual (legenda, conversa, etc.)
    let content = extractTextContent(msg)

    // Se a mensagem contiver um anexo PDF, baixa e extrai o texto do documento
    const pdfBuffer = await this.tryDownloadPdfBuffer(msg)
    if (pdfBuffer) {
      const pdfText = await extractTextFromPdf(pdfBuffer)
      if (pdfText) {
        content = content ? `${content}\n\n[CONTEÚDO DO DOCUMENTO PDF]:\n${pdfText}` : pdfText
      }
    }

    if (!content) {
      this.logger.info(
        { messageId: id, sender: maskPhone(senderPhone) },
        'Mensagem sem conteúdo textual — ignorando',
      )
      return
    }

    const timestamp = msg.messageTimestamp
    const receivedAt = timestamp
      ? new Date(Number(timestamp) * 1000)
      : new Date()

    const incomingMessage: IncomingMessage = {
      id,
      senderPhone,
      senderJid,
      content,
      receivedAt,
      rawPayload: msg as unknown as Record<string, unknown>,
    }

    // Log sem conteúdo (privacidade)
    this.logger.info(
      {
        messageId: id,
        sender: maskPhone(senderPhone),
        receivedAt,
      },
      'Mensagem recebida',
    )

    if (this.messageHandler) {
      try {
        await this.messageHandler(incomingMessage)
      } catch (error) {
        this.logger.error(
          { messageId: id, error },
          'Erro ao processar mensagem',
        )
      }
    }
  }

  private async tryDownloadPdfBuffer(msg: proto.IWebMessageInfo): Promise<Buffer | null> {
    try {
      let m = msg.message
      if (m?.ephemeralMessage?.message) m = m.ephemeralMessage.message
      if (m?.viewOnceMessage?.message) m = m.viewOnceMessage.message
      if (m?.viewOnceMessageV2?.message) m = m.viewOnceMessageV2.message
      if (m?.documentWithCaptionMessage?.message) m = m.documentWithCaptionMessage.message

      const doc = m?.documentMessage
      if (doc) {
        const isPdf =
          doc.mimetype === 'application/pdf' ||
          doc.fileName?.toLowerCase().endsWith('.pdf') ||
          doc.title?.toLowerCase().endsWith('.pdf')

        if (isPdf) {
          this.logger.info({ fileName: doc.fileName ?? doc.title }, 'Documento PDF detectado — baixando arquivo...')
          const buffer = await downloadMediaMessage(msg, 'buffer', {})
          return buffer as Buffer
        }
      }
    } catch (error) {
      this.logger.error({ error }, 'Erro ao baixar arquivo PDF do WhatsApp')
    }
    return null
  }
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/** Converte JID do Baileys para número de telefone puro */
function jidToPhone(jid: string): string | null {
  const match = jid.match(/^(\d+)@/)
  return match ? match[1] : null
}

/** Mascara os últimos 4 dígitos do telefone para logs */
function maskPhone(phone: string): string {
  if (phone.length <= 4) return '****'
  return phone.slice(0, -4) + '****'
}

/** Extrai conteúdo textual de diferentes tipos de mensagem */
function extractTextContent(msg: proto.IWebMessageInfo): string | null {
  let m = msg.message
  if (!m) return null

  // Desembrulhar invólucros do WhatsApp (mensagens temporárias, viewOnce, etc.)
  if (m.ephemeralMessage?.message) {
    m = m.ephemeralMessage.message
  }
  if (m.viewOnceMessage?.message) {
    m = m.viewOnceMessage.message
  }
  if (m.viewOnceMessageV2?.message) {
    m = m.viewOnceMessageV2.message
  }
  if (m.documentWithCaptionMessage?.message) {
    m = m.documentWithCaptionMessage.message
  }

  return (
    m.conversation ??
    m.extendedTextMessage?.text ??
    m.imageMessage?.caption ??
    m.videoMessage?.caption ??
    m.documentMessage?.caption ??
    m.documentMessage?.title ??
    null
  )
}
