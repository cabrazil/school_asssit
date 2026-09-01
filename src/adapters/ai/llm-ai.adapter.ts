import pino from 'pino'
import { env } from '../../config/env'
import type { IAIProvider } from './ai-provider.interface'
import type { InterpretationContext, InterpretationResult } from '../../domain/interpreter/types'
import { InterpretationResultSchema } from '../../domain/interpreter/types'
import { buildSystemPrompt, buildUserPrompt } from '../../domain/interpreter/prompt.template'

const logger = pino({ level: env.LOG_LEVEL, name: 'llm-ai-adapter' })

export interface LLMConfig {
  apiKey?: string
  baseUrl?: string
  model?: string
}

/**
 * Adaptador de IA de Produção.
 * Utiliza APIs compatíveis com OpenAI / Groq / Gemini (Chat Completions com JSON Mode).
 */
export class LLMAIAdapter implements IAIProvider {
  private apiKey: string
  private baseUrl: string
  private model: string

  constructor(config?: LLMConfig) {
    this.apiKey = config?.apiKey ?? process.env.AI_API_KEY ?? ''
    this.baseUrl = config?.baseUrl ?? process.env.AI_BASE_URL ?? 'https://api.openai.com/v1'
    this.model = config?.model ?? process.env.AI_MODEL ?? 'gpt-4o-mini'
  }

  async extractEvents(context: InterpretationContext): Promise<InterpretationResult> {
    if (!this.apiKey) {
      logger.warn('AI_API_KEY não configurada. Retornando resultado vazio por segurança.')
      return { relevant: false, events: [] }
    }

    const systemPrompt = buildSystemPrompt()
    const userPrompt = buildUserPrompt(context)

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      }

      // Se for OpenRouter, inclui cabeçalhos de identificação recomendados
      if (this.baseUrl.includes('openrouter')) {
        headers['HTTP-Referer'] = 'https://github.com/school-assist'
        headers['X-Title'] = 'School Assist'
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        logger.error({ status: response.status, errorText }, 'Erro na resposta da API de LLM')
        return { relevant: false, events: [] }
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>
      }

      let contentString = data.choices?.[0]?.message?.content
      if (!contentString) {
        logger.warn('Resposta da LLM não contém conteúdo')
        return { relevant: false, events: [] }
      }

      // Se o modelo for um modelo de raciocínio (como DeepSeek R1), remove as tags <think>...</think>
      contentString = contentString.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()

      // Remove blocos de código ```json ... ``` se o modelo retornar o JSON formatado em markdown (ex: DeepSeek V3)
      contentString = contentString.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim()

      const parsedJson = JSON.parse(contentString)
      const validatedResult = InterpretationResultSchema.parse(parsedJson)

      logger.info(
        { relevant: validatedResult.relevant, eventsCount: validatedResult.events.length },
        'Interpretação de mensagem concluída via LLM',
      )

      return validatedResult
    } catch (error) {
      logger.error({ error }, 'Falha ao processar mensagem na LLM')
      return { relevant: false, events: [] }
    }
  }
}
