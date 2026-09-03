import { FamilyRepository } from '../../infrastructure/database/repositories/family.repository'

export class FamilyService {
  constructor(private readonly familyRepo: FamilyRepository) {}

  /**
   * Localiza uma família pelo número de telefone WhatsApp ou LID.
   * Retorna null se não encontrada (número não cadastrado).
   */
  async findByPhone(phone: string) {
    return this.familyRepo.findByPhone(phone)
  }

  /**
   * Vincula o LID do WhatsApp a uma família já cadastrada.
   */
  async linkLid(familyId: string, lid: string) {
    return this.familyRepo.linkLid(familyId, lid)
  }
}
