import 'dotenv/config'
import { z } from 'zod'

/**
 * Validação de variáveis de ambiente na inicialização da aplicação.
 * Se alguma variável obrigatória estiver faltando, a aplicação não sobe
 * e exibe uma mensagem de erro clara.
 */
const envSchema = z.object({
  // Servidor
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),

  // Banco de dados
  DATABASE_URL: z.string().url('DATABASE_URL deve ser uma URL válida').default('postgresql://postgres:postgres@localhost:5432/postgres'),
  DIRECT_URL: z.string().url('DIRECT_URL deve ser uma URL válida').optional(),

  // WhatsApp / Baileys
  WA_SESSION_DIR: z.string().default('./wa-session'),
  WA_BOT_PHONE: z.string().optional(),
})

function parseEnv() {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n')

    console.error(
      `\n❌ Erro de configuração — variáveis de ambiente inválidas:\n${issues}\n\nConsulte o arquivo .env.example para referência.\n`,
    )
    process.exit(1)
  }

  return result.data
}

export const env = parseEnv()
export type Env = typeof env
