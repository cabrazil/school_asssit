import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { SchoolMessageInterpreter } from '../../src/domain/interpreter/school-message-interpreter.service'
import { MockAIAdapter } from '../../src/adapters/ai/mock-ai.adapter'

describe('SchoolMessageInterpreter — Suíte de Testes da 2ª Etapa', () => {
  const aiProvider = new MockAIAdapter()
  const interpreter = new SchoolMessageInterpreter(aiProvider)

  const defaultInput = {
    familyId: 'family-vanessa-uuid',
    familyName: 'Vanessa',
    children: [{ id: 'child-felipe-uuid', name: 'Felipe' }],
    receivedAt: new Date('2026-08-27T10:00:00Z'),
  }

  it('1. Comunicado do Fichário (Anglo 3º Ano) — Deve gerar 3 eventos distintos', async () => {
    const messageContent = `Prezadas famílias dos 3° ANOS,

No 1º trimestre, a nota referente à organização do fichário foi de 5,0 pontos para todos os alunos. Nesse primeiro momento, nós, professoras, acompanhamos e auxiliamos as crianças durante todo o processo, ensinando como organizar corretamente as atividades e os materiais no fichário.
A partir do 2º trimestre, iniciaremos uma nova etapa desse processo, conforme já comunicado às famílias em nossa primeira reunião de pais, quando explicamos que, após esse período inicial de orientação e aprendizagem, a responsabilidade pela organização do fichário passaria gradativamente para as crianças. Essa mudança tem como objetivo desenvolver cada vez mais a autonomia, a responsabilidade e a organização dos alunos.
O fichário será enviado para casa no dia 27 de agosto e cada criança deverá organizá-lo, colocando nele todas as atividades que estiverem na pasta sanfonada, incluindo as atividades realizadas em sala e as avaliações, mantendo os materiais organizados adequadamente.
Após essa organização, o fichário deverá retornar à escola no dia 4 de setembro, para que nós, professoras, possamos realizar a conferência e atribuir a nota correspondente à organização do fichário.
Observação importante: pedimos às famílias que verifiquem se todas as provas e atividades avaliativas estão devidamente assinadas pelos responsáveis antes do retorno do fichário à escola.
Contamos com a parceria das famílias para orientar e acompanhar, sempre que necessário, mas é muito importante que a organização seja realizada, principalmente, pela própria criança. Esse processo faz parte da aprendizagem e contribui para que nossos alunos desenvolvam hábitos de organização, cuidado com seus materiais e maior independência na vida escolar.
Agradecemos, como sempre, a parceria e o apoio das famílias! ❤️
Com carinho,
Professoras Karina e Naíma`

    const { result } = await interpreter.interpret({
      ...defaultInput,
      content: messageContent,
    })

    assert.equal(result.relevant, true)
    assert.equal(result.events.length, 3)

    // Evento 1: Organizar fichário
    const ev1 = result.events[0]
    assert.equal(ev1.action_required, true)
    assert.equal(ev1.target_grade, '3º Ano')
    assert.equal(ev1.due_date, '2026-09-04')

    // Evento 2: Assinaturas dos responsáveis
    const ev2 = result.events[1]
    assert.equal(ev2.action_required, true)
    assert.equal(ev2.type, 'acao_familia')

    // Evento 3: Retornar fichário
    const ev3 = result.events[2]
    assert.equal(ev3.action_required, true)
    assert.equal(ev3.due_date, '2026-09-04')
  })

  it('2. Amigo Secreto de Cartas (Anglo 3º Ano) — Deve ser RELEVANT = FALSE e 0 eventos', async () => {
    const messageContent = `📬💌 AMIGO SECRETO DE CARTAS – 3º ANO AM 💌📬

Nossa aula de Produção de Texto ganhou um significado ainda mais especial! Para colocar em prática os conhecimentos trabalhados na apostila de Língua Portuguesa, os alunos do 3º ano participaram de um divertido Amigo Secreto de Cartas. ✍️
Cada criança sorteou um colega e teve o desafio de escrever uma carta especialmente para ele, seguindo atentamente a estrutura desse gênero textual:
📍 Local e data
💬 Vocativo
✏️ Corpo da carta
💗 Despedida
🖊️ Assinatura
Durante a produção, os alunos puderam planejar suas ideias, organizar o texto, expressar sentimentos e colocar em prática tudo o que aprenderam sobre a escrita de uma carta.
E o momento da entrega foi cheio de expectativa e alegria!Além de desenvolver habilidades de leitura, escrita e comunicação, a atividade proporcionou uma troca afetiva entre os colegas, fortalecendo os vínculos da turma e mostrando que escrever também é uma linda forma de demonstrar carinho.
Aprender fica ainda mais significativo quando aquilo que escrevemos encontra um leitor de verdade! 📚`

    const { result } = await interpreter.interpret({
      ...defaultInput,
      content: messageContent,
    })

    assert.equal(result.relevant, false)
    assert.equal(result.events.length, 0)
  })

  it('3. Pesquisa de Impactos - O Líder em Mim — Deve capturar a URL e o prazo final', async () => {
    const messageContent = `💙 *Pesquisa de Impactos – O Líder em Mim*

Olá, famílias! Tudo bem?

O 2º semestre já começou e desejamos que seja um período de muitas aprendizagens e conquistas para todos!

Estamos iniciando a *Pesquisa de Impactos do Líder em Mim* e gostaríamos de contar com a participação de vocês.

A pesquisa busca conhecer a percepção das famílias sobre os impactos do programa em nossa comunidade escolar, contribuindo para que possamos compreender o que estamos fazendo bem, identificar oportunidades de melhoria e planejar ações cada vez mais alinhadas às necessidades da nossa escola.

A participação das famílias é muito importante, pois *cada voz contribui para transformar dados em decisões e decisões em ações que façam a diferença*. 💙💚

📅 *Período da pesquisa:* 24/08/2026 a 22/09/2026

👨👩👧 *Acesse a pesquisa pelo link:*
https://www.leaderinme.com/s/inspira-mudanca-participacoes-sa-1b9747/families

Contamos com a participação e o apoio de todas as famílias!

Muito obrigada pela parceria de sempre! 💙`

    const { result } = await interpreter.interpret({
      ...defaultInput,
      content: messageContent,
    })

    assert.equal(result.relevant, true)
    assert.equal(result.events.length, 1)

    const ev = result.events[0]
    assert.equal(ev.type, 'pesquisa')
    assert.equal(ev.action_required, true)
    assert.equal(ev.due_date, '2026-09-22')
    assert.equal(
      ev.url,
      'https://www.leaderinme.com/s/inspira-mudanca-participacoes-sa-1b9747/families',
    )
  })

  it('4. Equipe Farol de Pais — Deve capturar prazo curto e link do Google Forms', async () => {
    const messageContent = `Queridas famílias,

Acolhendo a solicitação de algumas famílias, *reabrimos o formulário de inscrição para participação na Equipe Farol de Pais.*

O formulário ficará disponível até amanhã, 28/08, no link: https://forms.gle/Dxx1JxQZj4GyNWuG6. Caso alguma família ainda tenha interesse em participar e não tenha realizado sua inscrição, esta é uma nova oportunidade. 💛

*Será uma alegria contar com a participação e parceria de vocês!*

Atenciosamente,
Coordenação`

    const { result } = await interpreter.interpret({
      ...defaultInput,
      content: messageContent,
    })

    assert.equal(result.relevant, true)
    assert.equal(result.events.length, 1)

    const ev = result.events[0]
    assert.equal(ev.action_required, true)
    assert.equal(ev.due_date, '2026-08-28')
    assert.equal(ev.url, 'https://forms.gle/Dxx1JxQZj4GyNWuG6')
  })

  it('5. Prova de Matemática — Deve ser relevante com action_required = false', async () => {
    const messageContent = 'Aviso de Prova de Matemática para o 3º Ano no dia 10 de setembro.'
    const { result } = await interpreter.interpret({
      ...defaultInput,
      content: messageContent,
    })

    assert.equal(result.relevant, true)
    assert.equal(result.events[0].type, 'prova')
    assert.equal(result.events[0].action_required, false)
    assert.equal(result.events[0].subject, 'Matemática')
  })

  it('6. Lição de Casa — Deve ser relevante com action_required = true', async () => {
    const messageContent = 'Favor realizar a lição de casa das páginas 45 a 48 de História para 02/09.'
    const { result } = await interpreter.interpret({
      ...defaultInput,
      content: messageContent,
    })

    assert.equal(result.relevant, true)
    assert.equal(result.events[0].type, 'licao_de_casa')
    assert.equal(result.events[0].action_required, true)
  })

  it('7. Trazer Material — Deve requerer ação dos pais', async () => {
    const messageContent = 'Trazer 1 cartolina guache para a feira de ciências até 05/09.'
    const { result } = await interpreter.interpret({
      ...defaultInput,
      content: messageContent,
    })

    assert.equal(result.relevant, true)
    assert.equal(result.events[0].type, 'material')
    assert.equal(result.events[0].action_required, true)
  })

  it('8. Alteração de Data — Deve registrar nova data informativa', async () => {
    const messageContent = 'Informamos a alteração de data da feira de ciências para 15 de setembro.'
    const { result } = await interpreter.interpret({
      ...defaultInput,
      content: messageContent,
    })

    assert.equal(result.relevant, true)
    assert.equal(result.events[0].due_date, '2026-09-15')
  })

  it('9. Mensagem sem data específica — Deve manter datas como null sem inventar', async () => {
    const messageContent = 'Solicitação de aviso sem data específica para atualizar carteira de vacinação.'
    const { result } = await interpreter.interpret({
      ...defaultInput,
      content: messageContent,
    })

    assert.equal(result.relevant, true)
    assert.equal(result.events[0].start_date, null)
    assert.equal(result.events[0].due_date, null)
  })

  it('10. Mensagem com data relativa "amanhã" — Deve calcular com base em receivedAt', async () => {
    const messageContent = 'Trazer dicionário de Português amanhã.'
    const receivedAt = new Date('2026-08-27T10:00:00Z')

    const { result } = await interpreter.interpret({
      ...defaultInput,
      receivedAt,
      content: messageContent,
    })

    assert.equal(result.relevant, true)
    assert.equal(result.events[0].due_date, '2026-08-28')
  })

  it('11. Mensagem para toda a série (target_scope: grade)', async () => {
    const messageContent = 'Prezadas famílias dos 3° ANOS, comunicado sobre o fichário dia 27 de agosto e retorno 4 de setembro.'
    const { result } = await interpreter.interpret({
      ...defaultInput,
      content: messageContent,
    })

    assert.equal(result.events[0].target_scope, 'grade')
    assert.equal(result.events[0].target_grade, '3º Ano')
  })

  it('12. Mensagem específica para um filho (target_scope: child)', async () => {
    const messageContent = 'Aviso específico para Felipe sobre reunião pedagógica individual em 08/09.'
    const { result } = await interpreter.interpret({
      ...defaultInput,
      content: messageContent,
    })

    assert.equal(result.events[0].target_scope, 'child')
    assert.equal(result.events[0].child_name, 'Felipe')
  })
})
