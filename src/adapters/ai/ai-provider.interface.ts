import type { InterpretationContext, InterpretationResult } from '../../domain/interpreter/types'

/**
 * Contrato para o Provedor de IA.
 * Permite trocar a implementação (OpenAI, Gemini, Groq, Mock)
 * sem alterar o domínio do aplicativo.
 */
export interface IAIProvider {
  extractEvents(context: InterpretationContext): Promise<InterpretationResult>
}
