import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

const VERSION = process.env.npm_package_version ?? '0.1.0'

export async function healthRoute(app: FastifyInstance) {
  app.get('/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: VERSION,
      service: 'school-assist',
    })
  })
}
