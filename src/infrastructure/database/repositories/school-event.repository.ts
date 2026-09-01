import type { SchoolEvent } from '@prisma/client'
import { prisma } from '../prisma.client'

export interface CreateSchoolEventData {
  family_id: string
  child_id?: string | null
  message_id?: string | null
  type: string
  subject?: string | null
  title: string
  description?: string | null
  start_date?: Date | null
  due_date?: Date | null
  action_required?: boolean
  target_scope?: string | null
  target_grade?: string | null
  url?: string | null
  status?: string
  confidence?: number | null
}

export class SchoolEventRepository {
  async create(data: CreateSchoolEventData): Promise<SchoolEvent> {
    return prisma.schoolEvent.create({
      data: {
        family_id: data.family_id,
        child_id: data.child_id ?? null,
        message_id: data.message_id ?? null,
        type: data.type,
        subject: data.subject ?? null,
        title: data.title,
        description: data.description ?? null,
        start_date: data.start_date ?? null,
        due_date: data.due_date ?? null,
        action_required: data.action_required ?? false,
        target_scope: data.target_scope ?? null,
        target_grade: data.target_grade ?? null,
        url: data.url ?? null,
        status: data.status ?? 'pending',
        confidence: data.confidence ?? null,
      },
    })
  }

  async createMany(eventsData: CreateSchoolEventData[]): Promise<SchoolEvent[]> {
    const created: SchoolEvent[] = []
    for (const data of eventsData) {
      const event = await this.create(data)
      created.push(event)
    }
    return created
  }

  async findByFamilyId(familyId: string): Promise<SchoolEvent[]> {
    return prisma.schoolEvent.findMany({
      where: { family_id: familyId },
      orderBy: { due_date: 'asc' },
    })
  }

  async findByMessageId(messageId: string): Promise<SchoolEvent[]> {
    return prisma.schoolEvent.findMany({
      where: { message_id: messageId },
    })
  }
}
