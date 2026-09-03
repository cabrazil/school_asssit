import type { Family } from '@prisma/client'
import { prisma } from '../prisma.client'

export class FamilyRepository {
  /**
   * Localiza uma família pelo número de telefone WhatsApp ou pelo LID.
   * Normaliza o número removendo caracteres não numéricos.
   */
  async findByPhone(identifier: string) {
    const normalized = normalizePhone(identifier)
    const lastDigits = normalized.slice(-8)

    // 1. Busca por correspondência exata em whatsapp_phone OU whatsapp_lid
    const exact = await prisma.family.findFirst({
      where: {
        OR: [
          { whatsapp_phone: { in: [identifier, normalized] } },
          { whatsapp_lid: { in: [identifier, normalized] } },
        ],
      },
      include: {
        children: true,
      },
    })

    if (exact) return exact

    // 2. Se não encontrou exato e for um telefone (não um LID), busca pelos últimos 8+ dígitos
    if (lastDigits.length >= 8 && normalized.length <= 13) {
      const allFamilies = await prisma.family.findMany({
        include: { children: true },
      })

      const matched = allFamilies.find((f: { whatsapp_phone: string }) => {
        const fNormalized = normalizePhone(f.whatsapp_phone)
        return fNormalized.endsWith(lastDigits) || normalized.endsWith(fNormalized.slice(-8))
      })

      if (matched) return matched
    }

    return null
  }

  /**
   * Vincula o LID do WhatsApp a uma família já cadastrada.
   */
  async linkLid(familyId: string, lid: string) {
    const normalizedLid = normalizePhone(lid)
    return prisma.family.update({
      where: { id: familyId },
      data: { whatsapp_lid: normalizedLid },
      include: { children: true },
    })
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
