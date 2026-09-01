import Fastify, {
  type FastifyRequest,
  type FastifyReply,
} from 'fastify'
import { env } from '../config/env'
import { healthRoute } from './routes/health.route'

export function buildServer() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      ...(env.NODE_ENV === 'development'
        ? {
            transport: {
              target: 'pino-pretty',
              options: { colorize: true, translateTime: 'HH:MM:ss' },
            },
          }
        : {}),
    },
  })

  // Registrar rotas
  app.register(healthRoute)

  // Handler 404 global
  app.setNotFoundHandler((_req: FastifyRequest, reply: FastifyReply) => {
    reply.status(404).send({ error: 'Not Found' })
  })

  // Handler de erro global
  app.setErrorHandler((error: Error & { statusCode?: number }, _req: FastifyRequest, reply: FastifyReply) => {
    app.log.error(error)
    reply.status(error.statusCode ?? 500).send({
      error: error.message ?? 'Internal Server Error',
    })
  })

  return app
}
