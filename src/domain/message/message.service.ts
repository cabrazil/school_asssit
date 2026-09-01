import pino from 'pino'
import { env } from '../../config/env'
import type { IncomingMessage } from '../../adapters/whatsapp/types'
import type { IWhatsAppAdapter } from '../../adapters/whatsapp/whatsapp.interface'
import { FamilyService } from '../family/family.service'
import { MessageRepository } from '../../infrastructure/database/repositories/message.repository'
import type { SchoolMessageInterpreter } from '../interpreter/school-message-interpreter.service'

const logger = pino({ level: env.LOG_LEVEL, name: 'message-service' })

export class MessageService {
  constructor(
    private readonly messageRepo: MessageRepository,
    private readonly familyService: FamilyService,
    private readonly whatsapp: IWhatsAppAdapter,
    private readonly interpreter?: SchoolMessageInterpreter,
  ) {}

  /**
   * Processa uma mensagem recebida do WhatsApp.
   *
   * Fluxo:
   *  1. Verificar idempotência (mensagem já processada?)
   *  2. Localizar família pelo telefone
   *  3. Persistir mensagem no banco
   *  4. Enviar confirmação personalizada pelo WhatsApp
   *  5. Interpretar conteúdo via IA e gerar SchoolEvents
   *  6. Registrar log de diagnóstico
   */
  async processIncoming(message: IncomingMessage): Promise<void> {
    const { id: whatsappMessageId, senderPhone, receivedAt } = message

    // 1. Idempotência
    const alreadyProcessed = await this.messageRepo.existsByWhatsAppId(whatsappMessageId)
    if (alreadyProcessed) {
      logger.info(
        { messageId: whatsappMessageId },
        'Mensagem duplicada ignorada (idempotência)',
      )
      return
    }

    // 2. Localizar família
    const family = await this.familyService.findByPhone(senderPhone)

    if (!family) {
      logger.warn(
        { senderPhone, masked: maskPhone(senderPhone) },
        `Mensagem recebida de número não cadastrado (${senderPhone}) — ignorando`,
      )
      // Não responder a números desconhecidos (prevenção de spam/abuso)
      return
    }

    // 3. Persistir mensagem
    const savedMessage = await this.messageRepo.create({
      family_id: family.id,
      whatsapp_message_id: whatsappMessageId,
      sender_phone: senderPhone,
      content: message.content,
      received_at: receivedAt,
      raw_payload: env.NODE_ENV === 'development' ? message.rawPayload : null,
    })

    logger.info(
      {
        messageId: savedMessage.id,
        familyId: family.id,
        familyName: family.name,
        receivedAt,
      },
      'Mensagem persistida com sucesso',
    )

    const replyTarget = message.senderJid ?? senderPhone
    const isPdf = message.content.includes('[CONTEÚDO DO DOCUMENTO PDF]:')

    // Personaliza a mensagem com o nome do responsável (ex: Vanessa, Claudia, Ana, Fabio)
    const confirmationText = isPdf
      ? `📄 *Arquivo PDF recebido, ${family.name}!*\n⏳ *Estou lendo o documento e organizando o calendário de eventos da sua família... Aguarde alguns instantes!*`
      : `✅ *Mensagem recebida, ${family.name}!*`

    // 4. Confirmar recebimento pelo WhatsApp
    try {
      await this.whatsapp.sendMessage(replyTarget, confirmationText)
      logger.info(
        { messageId: savedMessage.id, target: maskPhone(replyTarget) },
        'Confirmação personalizada enviada',
      )
    } catch (error) {
      logger.error(
        { messageId: savedMessage.id, error },
        'Falha ao enviar confirmação — mensagem já foi salva',
      )
    }

    // 5. Interpretação por IA e geração de SchoolEvents
    if (this.interpreter) {
      try {
        const interpretation = await this.interpreter.interpret({
          messageId: savedMessage.id,
          content: message.content,
          receivedAt,
          familyId: family.id,
          familyName: family.name,
          children: family.children?.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })),
        })

        logger.info(
          {
            messageId: savedMessage.id,
            relevant: interpretation.result.relevant,
            eventsCreated: interpretation.persistedEventsCount,
          },
          'Interpretação por IA finalizada',
        )

        // Se a mensagem for irrelevante (sem ações/prazos), remove da base de dados
        if (!interpretation.result.relevant || interpretation.persistedEventsCount === 0) {
          try {
            await this.messageRepo.delete(savedMessage.id)
            logger.info({ messageId: savedMessage.id }, 'Mensagem sem relevância descartada do banco de dados')
          } catch (delError) {
            logger.warn({ messageId: savedMessage.id, delError }, 'Erro ao descarte de mensagem irrelevante')
          }
        }

        // 6. Enviar a resposta estruturada e amigável de volta pelo WhatsApp
        const formattedResponse = formatWhatsAppEventResponse(
          interpretation.result,
          family.name,
        )

        await this.whatsapp.sendMessage(replyTarget, formattedResponse)
        logger.info(
          { messageId: savedMessage.id, target: maskPhone(replyTarget) },
          'Resposta estruturada da IA enviada via WhatsApp',
        )
      } catch (error) {
        logger.error(
          { messageId: savedMessage.id, error },
          'Erro ao interpretar mensagem com IA',
        )
      }
    }
  }
}

/**
 * Formata os eventos escolares identificados pela IA em uma mensagem
 * extremamente objetiva e amigável para o responsável.
 */
function formatWhatsAppEventResponse(
  result: { relevant: boolean; events: Array<{ type: string; title: string; description?: string | null; subject?: string | null; start_date?: string | null; due_date?: string | null; action_required: boolean; target_scope?: string | null; target_grade?: string | null; url?: string | null }> },
  familyName: string,
): string {
  if (!result.relevant || result.events.length === 0) {
    return [
      `Olá, *${familyName}*! 👋`,
      `Analisei o conteúdo enviado e identifiquei que se trata de um comunicado informativo ou relato de atividade que não exige nenhuma ação, tarefa ou prazo futuro por parte da sua família.`,
    ].join('\n')
  }

  const count = result.events.length
  const header = `🎓 *School Assist — ${count} Compromisso${count > 1 ? 's' : ''} Registrado${count > 1 ? 's' : ''} para ${familyName}*\n`

  const eventsFormatted = result.events
    .map((ev, idx) => {
      const number = count > 1 ? `${idx + 1}. ` : ''
      const subjectTag = ev.subject ? ` (${ev.subject})` : ''
      
      const desc = ev.description ? ev.description.trim() : ''
      const isImportantNote = /\b(importante|obs|aten[çc][ãa]o|alerta|cuidado|urgente)\b/i.test(desc)

      let detailTag = ''
      if (desc) {
        if (isImportantNote) {
          detailTag = `\n🚨 *Observação Importante:* ${desc}`
        } else if (ev.action_required) {
          detailTag = `\n⚠️ *Sua Ação:* ${desc}`
        } else {
          detailTag = `\n📝 *Detalhes / Conteúdo:* ${desc}`
        }
      } else if (ev.action_required) {
        detailTag = `\n⚠️ *Sua Ação:* Acompanhar/realizar tarefa com a escola`
      }
      
      const dateRange = ev.start_date && ev.due_date && ev.start_date !== ev.due_date
        ? `${formatDate(ev.start_date)} até ${formatDate(ev.due_date)}`
        : ev.due_date ? formatDate(ev.due_date) : ev.start_date ? formatDate(ev.start_date) : 'Sem data fixa'

      let block = `📌 *${number}${ev.title.toUpperCase()}*${subjectTag}`
      block += `\n🗓️ *Prazo:* ${dateRange}`
      if (detailTag) block += detailTag
      if (ev.target_scope || ev.target_grade) {
        const targetStr = ev.target_grade ?? translateScope(ev.target_scope)
        block += `\n👤 *Público:* ${targetStr}`
      }
      if (ev.url) {
        block += `\n🔗 *Link:* ${ev.url}`
      }
      
      const outlookUrl = buildOutlookCalendarUrl(ev.title, ev.due_date ?? ev.start_date, ev.description)
      if (outlookUrl) {
        block += `\n📅 *MS Outlook:* ${outlookUrl}`
      }

      return block
    })
    .join('\n\n')

  const footer = `\n\n---\n💡 *${familyName}, estes compromissos foram salvos na agenda da sua família.* 💙`

  return header + '\n' + eventsFormatted + footer
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dateStr
}

function translateScope(scope?: string | null): string {
  switch (scope) {
    case 'child': return 'Criança'
    case 'class': return 'Turma'
    case 'grade': return 'Série'
    case 'family': return 'Responsáveis'
    case 'school': return 'Toda a escola'
    default: return 'Escola'
  }
}

/**
 * Gera URL de deep-link para salvar o evento diretamente no MS Outlook (Web/Mobile App).
 */
function buildOutlookCalendarUrl(title: string, dateStr?: string | null, details?: string | null): string | null {
  if (!dateStr) return null
  try {
    const startIso = `${dateStr}T08:00:00Z`
    const endIso = `${dateStr}T09:00:00Z`

    const params = new URLSearchParams({
      path: '/calendar/action/compose',
      rru: 'addevent',
      subject: `🎓 ${title}`,
      startdt: startIso,
      enddt: endIso,
      allday: 'true',
      body: details ? `Detalhes / Estudo: ${details}` : 'Compromisso registrado via School Assist',
    })

    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
  } catch {
    return null
  }
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return '****'
  return phone.slice(0, -4) + '****'
}
