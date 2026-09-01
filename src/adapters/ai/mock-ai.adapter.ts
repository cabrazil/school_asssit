import type { IAIProvider } from './ai-provider.interface'
import type { InterpretationContext, InterpretationResult } from '../../domain/interpreter/types'

/**
 * Adaptador de IA Mock para testes automatizados determinísticos.
 * Reconhece cenários conhecidos (incluindo as mensagens reais da escola Anglo)
 * e aplica regras sem necessidade de chamadas de API externas.
 */
export class MockAIAdapter implements IAIProvider {
  async extractEvents(context: InterpretationContext): Promise<InterpretationResult> {
    const text = context.messageContent.toLowerCase()

    // Exemplo 2 — Amigo Secreto de Cartas (Relato de aula passada)
    if (text.includes('amigo secreto de cartas') || text.includes('nossa aula de produção de texto ganhou')) {
      return {
        relevant: false,
        events: [],
      }
    }

    // Roteiro de Estudos PDF (Colégio Anglo 3º Ano)
    if (text.includes('roteiro de estudos') || text.includes('documento pdf')) {
      return {
        relevant: true,
        events: [
          {
            type: 'prova',
            title: 'Avaliação de Produção de Texto (Felpo e Filva)',
            description: 'Apostila 3 Módulo 16 e Leitura do Livro Paradidático Felpo Filva',
            subject: 'Produção de Texto',
            start_date: '2026-08-31',
            due_date: '2026-08-31',
            action_required: false,
            target_scope: 'grade',
            target_grade: '3º Ano',
            child_name: null,
            url: null,
            confidence: 0.95,
          },
          {
            type: 'prova',
            title: 'Avaliação de Ciências e Inglês',
            description: 'Ciências: Apostila 3 Módulos 9 e 10. Inglês: Unit 5 p. 04-17.',
            subject: 'Ciências e Inglês',
            start_date: '2026-09-01',
            due_date: '2026-09-01',
            action_required: false,
            target_scope: 'grade',
            target_grade: '3º Ano',
            child_name: null,
            url: null,
            confidence: 0.95,
          },
          {
            type: 'prova',
            title: 'Avaliação de História e Geografia',
            description: 'História e Geografia: Apostila 3 Módulos 10 e 11.',
            subject: 'História e Geografia',
            start_date: '2026-09-02',
            due_date: '2026-09-02',
            action_required: false,
            target_scope: 'grade',
            target_grade: '3º Ano',
            child_name: null,
            url: null,
            confidence: 0.95,
          },
          {
            type: 'prova',
            title: 'Avaliação de Língua Portuguesa',
            description: 'Português: Apostila 3 Módulos 13, 14 e 15 p. 44-45 (Notícia, X/CH, G/J, etc.)',
            subject: 'Língua Portuguesa',
            start_date: '2026-09-03',
            due_date: '2026-09-03',
            action_required: false,
            target_scope: 'grade',
            target_grade: '3º Ano',
            child_name: null,
            url: null,
            confidence: 0.95,
          },
          {
            type: 'prova',
            title: 'Avaliação de Matemática',
            description: 'Matemática: Apostila 3 Módulos 19, 20 e 22 (Multiplicação, 4 operações, tabuada)',
            subject: 'Matemática',
            start_date: '2026-09-04',
            due_date: '2026-09-04',
            action_required: false,
            target_scope: 'grade',
            target_grade: '3º Ano',
            child_name: null,
            url: null,
            confidence: 0.95,
          },
        ],
      }
    }

    // Exemplo 1 — Comunicado sobre o Fichário (3º Anos)
    if (text.includes('fichário') || text.includes('fichario')) {
      return {
        relevant: true,
        events: [
          {
            type: 'material',
            title: 'Organizar fichário escolar',
            description: 'Organizar todas as atividades da pasta sanfonada e avaliações no fichário.',
            subject: null,
            start_date: '2026-08-27',
            due_date: '2026-09-04',
            action_required: true,
            target_scope: 'grade',
            target_grade: '3º Ano',
            child_name: null,
            url: null,
            confidence: 0.95,
          },
          {
            type: 'acao_familia',
            title: 'Conferir assinaturas nas provas do fichário',
            description: 'Verificar se todas as provas e atividades avaliativas estão assinadas pelos responsáveis antes da entrega.',
            subject: null,
            start_date: '2026-08-27',
            due_date: '2026-09-04',
            action_required: true,
            target_scope: 'family',
            target_grade: '3º Ano',
            child_name: null,
            url: null,
            confidence: 0.95,
          },
          {
            type: 'material',
            title: 'Retornar fichário à escola',
            description: 'Devolver o fichário organizado e assinado à escola para atribuição de nota.',
            subject: null,
            start_date: '2026-09-04',
            due_date: '2026-09-04',
            action_required: true,
            target_scope: 'grade',
            target_grade: '3º Ano',
            child_name: null,
            url: null,
            confidence: 0.95,
          },
        ],
      }
    }

    // Exemplo 3 — Pesquisa de Impactos - O Líder em Mim
    if (text.includes('pesquisa de impactos') || text.includes('líder em mim')) {
      const match = context.messageContent.match(/https?:\/\/[^\s]+/)
      const rawUrl = match ? match[0].replace(/[.,;:)]+$/, '') : 'https://www.leaderinme.com/s/inspira-mudanca-participacoes-sa-1b9747/families'
      return {
        relevant: true,
        events: [
          {
            type: 'pesquisa',
            title: 'Responder Pesquisa de Impactos – O Líder em Mim',
            description: 'Participação das famílias na pesquisa sobre os impactos do programa na comunidade escolar.',
            subject: null,
            start_date: '2026-08-24',
            due_date: '2026-09-22',
            action_required: true,
            target_scope: 'family',
            target_grade: null,
            child_name: null,
            url: rawUrl,
            confidence: 0.98,
          },
        ],
      }
    }

    // Exemplo 4 — Equipe Farol de Pais
    if (text.includes('equipe farol de pais') || text.includes('reabrimos o formulário de inscrição')) {
      const match = context.messageContent.match(/https?:\/\/[^\s]+/)
      const rawUrl = match ? match[0].replace(/[.,;:)]+$/, '') : 'https://forms.gle/Dxx1JxQZj4GyNWuG6'
      return {
        relevant: true,
        events: [
          {
            type: 'acao_familia',
            title: 'Inscrição para Equipe Farol de Pais',
            description: 'Formulário de inscrição reaberto para participação na Equipe Farol de Pais.',
            subject: null,
            start_date: null,
            due_date: '2026-08-28',
            action_required: true,
            target_scope: 'family',
            target_grade: null,
            child_name: null,
            url: rawUrl,
            confidence: 0.95,
          },
        ],
      }
    }

    // Teste: Prova de Matemática
    if (text.includes('prova de matemática')) {
      return {
        relevant: true,
        events: [
          {
            type: 'prova',
            title: 'Prova de Matemática',
            description: 'Avaliação trimestral de Matemática',
            subject: 'Matemática',
            start_date: '2026-09-10',
            due_date: '2026-09-10',
            action_required: false,
            target_scope: 'grade',
            target_grade: '3º Ano',
            child_name: null,
            url: null,
            confidence: 0.9,
          },
        ],
      }
    }

    // Teste: Lição de casa
    if (text.includes('lição de casa') || text.includes('licao de casa')) {
      return {
        relevant: true,
        events: [
          {
            type: 'licao_de_casa',
            title: 'Lição de Casa - Páginas 45 a 48',
            description: 'Resolver exercícios de História da apostila',
            subject: 'História',
            start_date: null,
            due_date: '2026-09-02',
            action_required: true,
            target_scope: 'class',
            target_grade: null,
            child_name: null,
            url: null,
            confidence: 0.9,
          },
        ],
      }
    }

    // Teste: Levar cartolina / material
    if (text.includes('cartolina') || text.includes('trazer material')) {
      return {
        relevant: true,
        events: [
          {
            type: 'material',
            title: 'Trazer cartolina escolar',
            description: 'Trazer 1 cartolina guache escolar para feira de ciências',
            subject: 'Ciências',
            start_date: null,
            due_date: '2026-09-05',
            action_required: true,
            target_scope: 'class',
            target_grade: null,
            child_name: null,
            url: null,
            confidence: 0.9,
          },
        ],
      }
    }

    // Teste: Alteração de data
    if (text.includes('alteração de data') || text.includes('nova data da feira')) {
      return {
        relevant: true,
        events: [
          {
            type: 'reuniao',
            title: 'Alteração de Data da Feira de Ciências',
            description: 'Feira remarcada para o dia 15 de setembro',
            subject: null,
            start_date: '2026-09-15',
            due_date: '2026-09-15',
            action_required: false,
            target_scope: 'school',
            target_grade: null,
            child_name: null,
            url: null,
            confidence: 0.9,
          },
        ],
      }
    }

    // Teste: Mensagem sem data
    if (text.includes('aviso sem data específica')) {
      return {
        relevant: true,
        events: [
          {
            type: 'acao_familia',
            title: 'Atualizar carteira de vacinação na secretaria',
            description: 'Solicitação para pais enviarem cópia atualizada',
            subject: null,
            start_date: null,
            due_date: null,
            action_required: true,
            target_scope: 'family',
            target_grade: null,
            child_name: null,
            url: null,
            confidence: 0.85,
          },
        ],
      }
    }

    // Teste: Mensagem com "amanhã"
    if (text.includes('amanhã')) {
      const tomorrow = new Date(context.receivedAt)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]

      return {
        relevant: true,
        events: [
          {
            type: 'material',
            title: 'Trazer dicionário de Português amanhã',
            description: 'Atividade com dicionário em sala',
            subject: 'Língua Portuguesa',
            start_date: tomorrowStr,
            due_date: tomorrowStr,
            action_required: true,
            target_scope: 'grade',
            target_grade: '3º Ano',
            child_name: null,
            url: null,
            confidence: 0.9,
          },
        ],
      }
    }

    // Teste: Mensagem para filho específico
    if (context.childrenNames && context.childrenNames.length > 0 && text.includes('específico para felipe')) {
      return {
        relevant: true,
        events: [
          {
            type: 'acao_familia',
            title: 'Reunião individual pedagógica sobre o Felipe',
            description: 'Atendimento com a coordenação pedagógica',
            subject: null,
            start_date: '2026-09-08',
            due_date: '2026-09-08',
            action_required: true,
            target_scope: 'child',
            target_grade: '3º Ano',
            child_name: context.childrenNames[0],
            url: null,
            confidence: 0.95,
          },
        ],
      }
    }

    // Default fallback
    return {
      relevant: false,
      events: [],
    }
  }
}
