import 'dotenv/config'
import { LLMAIAdapter } from '../adapters/ai/llm-ai.adapter'
import { formatWhatsAppEventResponse } from '../domain/message/message.service'

async function main() {
  const customMessage = process.argv.slice(2).join(' ').trim()

  const messageToTest =
    customMessage ||
    `Prezados responsáveis,

Em razão do alerta emitido pela Defesa Civil do Estado de São Paulo para condições climáticas severas, com previsão de chuvas intensas e ventos fortes nesta sexta-feira, 11 de setembro, o Colégio Anglo Leonardo da Vinci - unidade Alphaville comunica que as aulas serão mantidas normalmente, com todo o cuidado e estrutura necessários para receber os alunos com segurança.

Diante do cenário de risco nos deslocamentos, recomendamos que as famílias que preferirem manter seus filhos em casa o façam, sem qualquer prejuízo pedagógico. Para isso, informamos que:

	•	As aulas desta sexta-feira não abordarão conteúdo novo, sendo dedicadas à revisão e consolidação de conteúdos já trabalhados;
	•	Os alunos que permanecerem em casa não terão perdas em relação à matriz curricular e poderão acompanhar normalmente as aulas na próxima semana.

Reforçamos que a decisão de comparecer ou não à escola fica a critério de cada família, considerando as condições de deslocamento em sua região. Caso optem por trazer os filhos, nossa equipe estará preparada para recebê-los com toda a atenção e segurança de sempre.

Continuaremos acompanhando as orientações da Defesa Civil e comunicaremos novas atualizações caso sejam necessárias.

A segurança de nossos alunos e famílias é sempre a nossa prioridade.

Atenciosamente,
Direção de unidade
Colégio Anglo Leonardo da Vinci`

  console.log('======================================================================')
  console.log('🤖 TESTANDO INTERPRETAÇÃO COM LLM REAL (OpenRouter / DeepSeek)')
  console.log('======================================================================\n')
  console.log('📨 Mensagem avaliada:\n"""\n' + messageToTest + '\n"""\n')

  const adapter = new LLMAIAdapter()

  console.log('⏳ Enviando para a API de IA...')
  const startTime = Date.now()

  const result = await adapter.extractEvents({
    messageContent: messageToTest,
    receivedAt: new Date('2026-09-10T15:00:00Z'),
    familyName: 'Vanessa',
  })

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(`✅ Resposta recebida em ${elapsed}s!\n`)

  console.log('--- 📋 JSON RETORNADO PELA IA ---')
  console.log(JSON.stringify(result, null, 2))

  console.log('\n--- 📱 MENSAGEM FINAL FORMATADA PARA O WHATSAPP ---')
  console.log(formatWhatsAppEventResponse(result, 'Vanessa', 'GOOGLE_PERSONAL'))
  console.log('\n======================================================================')
}

main().catch((err) => {
  console.error('❌ Erro no teste:', err)
  process.exit(1)
})
