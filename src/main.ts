import 'dotenv/config'
import { env } from './config/env'
import { buildServer } from './api/server'
import { connectDatabase, disconnectDatabase } from './infrastructure/database/prisma.client'
import { BaileysAdapter } from './adapters/whatsapp/baileys.adapter'
import { FamilyRepository } from './infrastructure/database/repositories/family.repository'
import { MessageRepository } from './infrastructure/database/repositories/message.repository'
import { FamilyService } from './domain/family/family.service'
import { MessageService } from './domain/message/message.service'
import pino from 'pino'

import { LLMAIAdapter } from './adapters/ai/llm-ai.adapter'
import { MockAIAdapter } from './adapters/ai/mock-ai.adapter'
import { SchoolEventRepository } from './infrastructure/database/repositories/school-event.repository'
import { SchoolMessageInterpreter } from './domain/interpreter/school-message-interpreter.service'

const logger = pino({ level: env.LOG_LEVEL, name: 'main' })

async function main() {
  logger.info({ nodeEnv: env.NODE_ENV }, '🚀 Iniciando School Assist...')

  // ---- Banco de dados ------------------------------------------------
  logger.info('Conectando ao banco de dados...')
  await connectDatabase()
  logger.info('✅ Banco de dados conectado')

  // ---- Provedor de IA & Interpretador --------------------------------
  const aiProvider = process.env.AI_PROVIDER === 'llm'
    ? new LLMAIAdapter()
    : new MockAIAdapter()

  logger.info(
    { provider: process.env.AI_PROVIDER === 'llm' ? 'LLM / OpenRouter' : 'Mock (Testes)' },
    'Provedor de IA configurado',
  )

  const schoolEventRepo = new SchoolEventRepository()
  const interpreter = new SchoolMessageInterpreter(aiProvider, schoolEventRepo)

  // ---- Composição de dependências ------------------------------------
  const familyRepo = new FamilyRepository()
  const messageRepo = new MessageRepository()
  const familyService = new FamilyService(familyRepo)
  const whatsappAdapter = new BaileysAdapter()
  const messageService = new MessageService(messageRepo, familyService, whatsappAdapter, interpreter)

  // ---- Adaptador WhatsApp --------------------------------------------
  whatsappAdapter.onMessage(async (message) => {
    await messageService.processIncoming(message)
  })

  logger.info('Conectando ao WhatsApp (Baileys)...')
  await whatsappAdapter.connect()

  // ---- Servidor HTTP -------------------------------------------------
  const app = buildServer()

  await app.listen({ port: env.PORT, host: '0.0.0.0' })
  logger.info(`✅ Servidor HTTP rodando na porta ${env.PORT}`)

  // ---- Graceful shutdown --------------------------------------------
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Sinal recebido — encerrando graciosamente...')

    await app.close()
    logger.info('Servidor HTTP encerrado')

    await whatsappAdapter.disconnect()
    logger.info('WhatsApp desconectado')

    await disconnectDatabase()
    logger.info('Banco de dados desconectado')

    logger.info('👋 School Assist encerrado')
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  process.on('uncaughtException', (error: Error) => {
    logger.fatal({ error }, 'Exceção não capturada')
    process.exit(1)
  })

  process.on('unhandledRejection', (reason: unknown) => {
    logger.fatal({ reason }, 'Promise rejeitada sem tratamento')
    process.exit(1)
  })
}

main().catch((error) => {
  console.error('❌ Falha fatal na inicialização:', error)
  process.exit(1)
})
