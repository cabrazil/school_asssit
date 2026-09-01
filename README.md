# School Assist

Assistente que ajuda pais e responsáveis a organizar informações escolares recebidas pelo WhatsApp.

## Fluxo atual (MVP)

```
Mensagem WhatsApp → Baileys → Fastify → Identifica família → Salva no Supabase → Responde no WhatsApp
```

## Stack

- **Runtime**: Node.js 20 + TypeScript
- **HTTP**: Fastify
- **WhatsApp**: Baileys (adaptador isolado)
- **ORM**: Prisma
- **Banco**: Supabase / PostgreSQL
- **Container**: Docker / Docker Compose

## Início rápido

Consulte a documentação completa:

- 📖 [Configuração local](docs/local-setup.md)
- 🚀 [Deploy no VPS](docs/vps-deploy.md)

## Estrutura do projeto

```
src/
├── adapters/whatsapp/   # Adaptador Baileys (isolado da lógica de negócio)
├── api/                 # Fastify + rotas
├── config/              # Variáveis de ambiente (Zod)
├── domain/              # Serviços de domínio (regras de negócio)
│   ├── family/
│   └── message/
└── infrastructure/
    └── database/        # Prisma client + repositórios
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
docs/
├── local-setup.md
└── vps-deploy.md
```

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | Health check |

## Privacidade

- Conteúdo de mensagens nunca aparece em logs
- Sessão WhatsApp não é versionada (`.gitignore`)
- `raw_payload` só é armazenado em ambiente de desenvolvimento
- Dados mínimos armazenados (LGPD)
