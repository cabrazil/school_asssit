import pino from 'pino'
import { env } from '../../config/env'
import type { IAIProvider } from '../../adapters/ai/ai-provider.interface'
import type { InterpretationContext, InterpretationResult, ExtractedEvent } from './types'
import type { SchoolEventRepository, CreateSchoolEventData } from '../../infrastructure/database/repositories/school-event.repository'

const logger = pino({ level: env.LOG_LEVEL, name: 'school-message-interpreter' })

export interface InterpretMessageInput {
  messageId?: string
  content: string
  receivedAt: Date
  familyId: string
  familyName?: string
  children?: Array<{ id: string; name: string }>
}

export interface InterpretMessageOutput {
  result: InterpretationResult
  persistedEventsCount: number
}

/**
 * Servidor de interpretação de mensagens escolares.
 *
 * Princípio fundamental:
 *  - Transforma mensagens acionáveis/relevantes em `SchoolEvent`.
 *  - Mensagens puramente informativas ou relatos passados geram `relevant = false` e 0 eventos.
 *  - Isolado do WhatsApp e da implementação concreta da LLM.
 */
export class SchoolMessageInterpreter {
  constructor(
    private readonly aiProvider: IAIProvider,
    private readonly schoolEventRepo?: SchoolEventRepository,
  ) {}

  async interpret(input: InterpretMessageInput): Promise<InterpretMessageOutput> {
    const context: InterpretationContext = {
      messageContent: input.content,
      receivedAt: input.receivedAt,
      familyName: input.familyName,
      childrenNames: input.children?.map((c) => c.name),
      currentDate: new Date(),
    }

    logger.info(
      { familyId: input.familyId, messageId: input.messageId },
      'Iniciando interpretação de mensagem escolar por IA',
    )

    const result = await this.aiProvider.extractEvents(context)

    logger.info(
      {
        relevant: result.relevant,
        eventsFound: result.events.length,
      },
      'Extração de IA concluída',
    )

    if (result.relevant && result.events.length > 0) {
      logPrettyEvents(result.events)
    } else {
      console.log('\nℹ️  Mensagem interpretada como NÃO RELEVANTE (nenhum evento gerado).\n')
    }

    let persistedEventsCount = 0

    // Se relevante e possuir repositório, persiste os eventos no banco
    if (result.relevant && result.events.length > 0 && this.schoolEventRepo) {
      const eventsToCreate: CreateSchoolEventData[] = result.events.map((extracted) =>
        this.mapExtractedToCreateData(extracted, input),
      )

      const createdEvents = await this.schoolEventRepo.createMany(eventsToCreate)
      persistedEventsCount = createdEvents.length

      logger.info(
        { persistedEventsCount },
        'Eventos escolares persistidos no banco de dados',
      )
    }

    return {
      result,
      persistedEventsCount,
    }
  }

  private mapExtractedToCreateData(
    extracted: ExtractedEvent,
    input: InterpretMessageInput,
  ): CreateSchoolEventData {
    // Tenta vincular child_id se o nome bater com um dos filhos cadastrados
    let matchedChildId: string | null = null
    if (extracted.child_name && input.children) {
      const found = input.children.find(
        (c) => c.name.toLowerCase() === extracted.child_name?.toLowerCase(),
      )
      if (found) {
        matchedChildId = found.id
      }
    }

    return {
      family_id: input.familyId,
      child_id: matchedChildId,
      message_id: input.messageId ?? null,
      type: extracted.type,
      subject: extracted.subject ?? null,
      title: extracted.title,
      description: extracted.description ?? null,
      start_date: parseNullableDate(extracted.start_date),
      due_date: parseNullableDate(extracted.due_date),
      action_required: extracted.action_required,
      target_scope: extracted.target_scope ?? 'school',
      target_grade: extracted.target_grade ?? null,
      url: extracted.url ?? null,
      confidence: extracted.confidence ?? 1.0,
      status: 'pending',
    }
  }
}

function parseNullableDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null
  const parsed = new Date(dateStr)
  return isNaN(parsed.getTime()) ? null : parsed
}

function logPrettyEvents(events: ExtractedEvent[]): void {
  console.log('\n======================================================================')
  console.log(`📋 EVENTOS ESCOLARES GERADOS PELA IA (${events.length}):`)
  console.log('======================================================================')

  events.forEach((ev, idx) => {
    const actionTag = ev.action_required ? ' [⚠️ AÇÃO DA FAMÍLIA NECESSÁRIA]' : ''
    const subjectTag = ev.subject ? ` (${ev.subject})` : ''
    const dateRange = ev.start_date && ev.due_date && ev.start_date !== ev.due_date
      ? `${ev.start_date} até ${ev.due_date}`
      : ev.due_date ?? ev.start_date ?? 'Sem data fixa'

    console.log(`\n ${idx + 1}. 📌 ${ev.title.toUpperCase()}${subjectTag}${actionTag}`)
    console.log(`    • Tipo: ${ev.type}`)
    console.log(`    • Data / Prazo: ${dateRange}`)
    console.log(`    • Público-alvo: ${ev.target_scope ?? 'escola'}${ev.target_grade ? ` (${ev.target_grade})` : ''}`)
    if (ev.description) {
      console.log(`    • Detalhes: ${ev.description}`)
    }
    if (ev.url) {
      console.log(`    • Link: ${ev.url}`)
    }
  })

  console.log('\n======================================================================\n')
}
