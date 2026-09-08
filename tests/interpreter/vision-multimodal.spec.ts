import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LLMAIAdapter } from '../../src/adapters/ai/llm-ai.adapter'

test('LLMAIAdapter monta payload multimodal com image_url quando context possui imageBase64', async () => {
  let capturedBody: any = null

  // Mock do fetch global
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    capturedBody = JSON.parse(init?.body as string)
    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                relevant: true,
                events: [
                  {
                    type: 'aniversario',
                    title: 'Aniversário da Maria Clara',
                    due_date: '2026-09-29T15:30:00',
                    action_required: false,
                    description: 'Condomínio Quintas do Tamboré - Salão de Festas (Al. Terras Altas, 433)',
                  },
                ],
              }),
            },
          },
        ],
      }),
    } as Response
  }) as typeof globalThis.fetch

  try {
    const adapter = new LLMAIAdapter({
      apiKey: 'test-api-key',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
    })

    const result = await adapter.extractEvents({
      messageContent: '[IMAGEM/FOTO RECEBIDA]',
      receivedAt: new Date('2026-09-07T12:00:00Z'),
      familyName: 'Carlos B.',
      imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      imageMimeType: 'image/png',
    })

    assert.ok(capturedBody)
    assert.equal(capturedBody.model, 'gpt-4o-mini')
    const userMsg = capturedBody.messages.find((m: any) => m.role === 'user')
    assert.ok(Array.isArray(userMsg.content))
    assert.equal(userMsg.content[0].type, 'text')
    assert.equal(userMsg.content[1].type, 'image_url')
    assert.ok(userMsg.content[1].image_url.url.startsWith('data:image/png;base64,'))

    assert.equal(result.relevant, true)
    assert.equal(result.events.length, 1)
    assert.equal(result.events[0].title, 'Aniversário da Maria Clara')
    assert.equal(result.events[0].due_date, '2026-09-29T15:30:00')
  } finally {
    globalThis.fetch = originalFetch
  }
})
