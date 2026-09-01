import { z } from 'zod'

/**
 * Escopos do público-alvo de um evento escolar
 */
export const TargetScopeSchema = z.enum([
  'child',   // Especificamente para uma criança
  'class',   // Para uma turma específica
  'grade',   // Para um ano/série (ex: 3º Ano)
  'family',  // Para a família/responsáveis
  'school',  // Para toda a escola
])

export type TargetScope = z.infer<typeof TargetScopeSchema>

/**
 * Esquema de um evento escolar extraído por IA
 */
export const ExtractedEventSchema = z.object({
  type: z.string().describe('Tipo do evento (ex: material, prova, licao_de_casa, reuniao, acao_familia, atividade)'),
  title: z.string().describe('Título curto e claro do evento'),
  description: z.string().nullable().optional().describe('Descrição detalhada ou instruções relevantes'),
  subject: z.string().nullable().optional().describe('Matéria/Disciplina (ex: Língua Portuguesa, Matemática)'),
  start_date: z.string().nullable().optional().describe('Data de início ou entrega do material (ISO 8601 YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss)'),
  due_date: z.string().nullable().optional().describe('Data de término, entrega final ou prazo limite (ISO 8601 YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss)'),
  action_required: z.boolean().default(false).describe('true se a família precisa realizar uma ação concreta (ex: assinar, enviar, preencher)'),
  target_scope: TargetScopeSchema.optional().default('school').describe('Público-alvo do evento (child, class, grade, family, school)'),
  target_grade: z.string().nullable().optional().describe('Série/Ano alvo se especificado (ex: "3º Ano")'),
  child_name: z.string().nullable().optional().describe('Nome do filho caso o evento seja específico para uma criança'),
  url: z.string().nullable().optional().describe('URL ou link preservado da mensagem (ex: formulário, pesquisa, link externo)'),
  confidence: z.number().min(0).max(1).optional().default(1.0).describe('Nível de confiança na interpretação (0 a 1)'),
})

export type ExtractedEvent = z.infer<typeof ExtractedEventSchema>

/**
 * Esquema da resposta completa de interpretação da mensagem
 */
export const InterpretationResultSchema = z.object({
  relevant: z.boolean().describe('true se a mensagem contém informações que a família precisa saber, fazer ou acompanhar. false para relatos de aulas já ocorridas ou felicitações genéricas.'),
  events: z.array(ExtractedEventSchema).default([]).describe('Lista de eventos gerados a partir da mensagem (0, 1 ou vários)'),
})

export type InterpretationResult = z.infer<typeof InterpretationResultSchema>

/**
 * Contexto fornecido à IA para interpretar a mensagem
 */
export interface InterpretationContext {
  messageContent: string
  receivedAt: Date
  familyName?: string
  childrenNames?: string[]
  currentDate?: Date
}
