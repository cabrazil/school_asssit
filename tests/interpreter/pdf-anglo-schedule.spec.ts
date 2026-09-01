import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { SchoolMessageInterpreter } from '../../src/domain/interpreter/school-message-interpreter.service'
import { MockAIAdapter } from '../../src/adapters/ai/mock-ai.adapter'

describe('PDF Roteiro de Estudos — Teste de Interpretação do Colégio Anglo', () => {
  const aiProvider = new MockAIAdapter()
  const interpreter = new SchoolMessageInterpreter(aiProvider)

  it('Deve interpretar o Roteiro de Estudos de 31/08 a 04/09 extraindo os eventos das avaliações', async () => {
    const pdfTextContent = `[CONTEÚDO DO DOCUMENTO PDF]:
ROTEIRO DE ESTUDOS – 2º TRIMESTRE
3ºs anos A/BM

31/08 (Segunda-feira): PRODUÇÃO DE TEXTO – LIVRO FELPO E FILVA
01/09 (Terça-feira): CIÊNCIAS e INGLÊS
02/09 (Quarta-feira): HISTÓRIA E GEOGRAFIA
03/09 (Quinta-feira): LÍNGUA PORTUGUESA
04/09 (Sexta-feira): MATEMÁTICA

Português: Apostila 3: Módulos 13 e 14. Módulo 15: páginas 44 e 45.
Matemática: Apostila 3: Módulos: 19, 20 e 22.
História e Geografia: Apostila 3: Módulos 10 e 11.
Ciências: Apostila 3: Módulos 9 e 10.
Inglês: WHAT DO YOU DO ON MONDAYS? UNIT 5.
OBS: A avaliação trimestral de Produção de Texto será substituída por uma atividade avaliativa baseada no livro paradidático Felpo Filva.`

    const { result } = await interpreter.interpret({
      familyId: 'family-vanessa-uuid',
      familyName: 'Vanessa',
      children: [{ id: 'child-felipe-uuid', name: 'Felipe' }],
      receivedAt: new Date('2026-08-25T10:00:00Z'),
      content: pdfTextContent,
    })

    assert.equal(result.relevant, true)
    assert.ok(result.events.length >= 1)
  })
})
