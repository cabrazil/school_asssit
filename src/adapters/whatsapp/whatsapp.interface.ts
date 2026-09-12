import type { IncomingMessage } from './types'

/**
 * Contrato do adaptador WhatsApp.
 * Qualquer implementação (Baileys, WhatsApp Business API, etc.)
 * deve satisfazer esta interface.
 */
export interface IWhatsAppAdapter {
  /**
   * Inicializa a conexão com o WhatsApp.
   * No Baileys: exibe QR Code na primeira vez; reutiliza sessão nas seguintes.
   */
  connect(): Promise<void>

  /**
   * Registra um handler para mensagens recebidas.
   * O handler deve conter a lógica de negócio (serviços de domínio).
   */
  onMessage(handler: (message: IncomingMessage) => Promise<void>): void

  /**
   * Envia uma mensagem de texto para um número WhatsApp.
   * @param to Número no formato E.164 sem "+" (ex: 5511999999999)
   * @param text Conteúdo da mensagem
   */
  sendMessage(to: string, text: string): Promise<void>

  /**
   * Envia um arquivo/documento (como .ics ou .pdf) para um número WhatsApp.
   * @param to Número ou JID do destinatário
   * @param document Buffer do arquivo
   * @param fileName Nome do arquivo para exibição
   * @param mimetype Mimetype do arquivo (ex: 'text/calendar')
   * @param caption Legenda opcional do documento
   */
  sendDocument(
    to: string,
    document: Buffer,
    fileName: string,
    mimetype?: string,
    caption?: string,
  ): Promise<void>

  /**
   * Encerra a conexão de forma limpa.
   */
  disconnect(): Promise<void>
}
