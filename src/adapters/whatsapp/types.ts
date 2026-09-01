/**
 * Tipos internos do adaptador WhatsApp.
 * Isola os tipos do Baileys da lógica de domínio.
 */

export interface IncomingMessage {
  /** ID único da mensagem no WhatsApp (usado para idempotência) */
  id: string
  /** Número do remetente no formato E.164 sem "+" (ex: 5511999999999) */
  senderPhone: string
  /** JID exato do remetente ou da conversa no Baileys (ex: 12345@s.whatsapp.net ou 12345@lid) */
  senderJid?: string
  /** Conteúdo textual da mensagem */
  content: string
  /** Timestamp de recebimento */
  receivedAt: Date
  /**
   * Payload bruto original.
   * Armazenado para auditoria; nunca deve aparecer em logs.
   */
  rawPayload?: Record<string, unknown>
}
