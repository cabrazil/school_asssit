import type { Message } from '@prisma/client'
import { prisma } from '../prisma.client'

// Tipo Prisma para campo Json anulável
type NullableJson = Parameters<typeof prisma.message.create>[0]['data']['raw_payload']

export interface CreateMessageData {
  family_id: string
  child_id?: string | null
  whatsapp_message_id: string
  sender_phone: string
  content: string
  received_at: Date
  raw_payload?: Record<string, unknown> | null
}

export class MessageRepository {
  /**
   * Persiste uma nova mensagem no banco.
   *
   * Nota: Prisma exige um valor especial para null em campos Json.
   * Fazemos o mapeamento aqui para manter a interface pública limpa.
   */
  async create(data: CreateMessageData): Promise<Awaited<ReturnType<typeof prisma.message.create>>> {
    return prisma.message.create({
      data: {
        ...data,
        raw_payload: (data.raw_payload ?? null) as NullableJson,
      },
    })
  }

  /**
   * Verifica se uma mensagem com este ID do WhatsApp já foi processada.
   * Usado para garantir idempotência.
   */
  async existsByWhatsAppId(whatsappMessageId: string): Promise<boolean> {
    const count = await prisma.message.count({
      where: { whatsapp_message_id: whatsappMessageId },
    })
    return count > 0
  }

  async findById(id: string): Promise<Message | null> {
    return prisma.message.findUnique({ where: { id } })
  }
}
