import type { Family } from '@prisma/client'
import { prisma } from '../prisma.client'

export class FamilyRepository {
  /**
   * Localiza uma família pelo número de telefone WhatsApp.
   * Normaliza o número removendo caracteres não numéricos.
   */
  async findByPhone(phone: string) {
    const normalized = normalizePhone(phone)
    const lastDigits = normalized.slice(-8)

    // Busca por correspondência exata
    const exact = await prisma.family.findFirst({
      where: {
        whatsapp_phone: {
          in: [phone, normalized],
        },
      },
      include: {
        children: true,
      },
    })

    if (exact) return exact

    // Se não encontrou exato, busca por famílias cujo número termina com os mesmos 8+ dígitos
    if (lastDigits.length >= 8) {
      const allFamilies = await prisma.family.findMany({
        include: { children: true },
      })

      const matched = allFamilies.find((f: { whatsapp_phone: string }) => {
        const fNormalized = normalizePhone(f.whatsapp_phone)
        return fNormalized.endsWith(lastDigits) || normalized.endsWith(fNormalized.slice(-8))
      })

      if (matched) return matched

      // Fallback para desenvolvimento: se existir apenas 1 família cadastrada no sistema, associa a ela
      if (allFamilies.length === 1) {
        return allFamilies[0]
      }
    }

    return null
  }

  async findById(id: string): Promise<Family | null> {
    return prisma.family.findUnique({ where: { id } })
  }
}

/**
 * Remove todos os caracteres não numéricos do número de telefone.
 * Ex: "+55 (11) 9999-9999" → "5511999999999"
 */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}
