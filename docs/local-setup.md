# School Assist — Configuração Local

## Pré-requisitos

| Ferramenta | Versão mínima |
|---|---|
| Node.js | 20+ |
| npm | 10+ |
| Conta Supabase | — |

---

## 1. Clonar o repositório

```bash
git clone <seu-repositorio>
cd schoolad
```

---

## 2. Instalar dependências

```bash
npm install
```

---

## 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais reais do Supabase:

```env
DATABASE_URL="postgresql://postgres.[SEU-PROJECT-REF]:[SUA-SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[SEU-PROJECT-REF]:[SUA-SENHA]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
WA_BOT_PHONE=5511999999999   # número do chip dedicado
```

---

## 4. Gerar o cliente Prisma

```bash
npx prisma generate
```

---

## 5. Executar a migration inicial

Isso criará todas as tabelas no Supabase:

```bash
npx prisma migrate dev --name init
```

---

## 6. Popular o banco com dados de teste (seed)

```bash
npm run prisma:seed
```

Isso criará:
- Família **Vanessa** (telefone `5511999999999`)
- Filho **Felipe**

---

## 7. Iniciar em modo desenvolvimento

```bash
npm run dev
```

Na primeira execução, um **QR Code** aparecerá no terminal. Escaneie com o WhatsApp do número dedicado ao School Assist.

> ⚠️ Use um número dedicado, não o seu pessoal. O Baileys substitui o aplicativo naquele número.

---

## 8. Verificar o health check

```bash
curl http://localhost:3000/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "version": "0.1.0",
  "service": "school-assist"
}
```

---

## 9. Testar o fluxo completo

1. Certifique-se que o QR foi escaneado e o log mostra `✅ WhatsApp conectado`
2. Adicione o número de telefone da família Vanessa (`5511999999999`) ao seed (ou use o número cadastrado)
3. De outro número WhatsApp, envie uma mensagem para o número do School Assist
4. Verifique:
   - Log: `Mensagem persistida com sucesso` (sem exibir o conteúdo)
   - Banco Supabase: novo registro em `messages`
   - WhatsApp: resposta `✅ Mensagem recebida pelo School Assist.`

---

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Desenvolvimento com hot-reload |
| `npm run build` | Compilar TypeScript |
| `npm run start` | Executar build de produção |
| `npm run typecheck` | Verificar tipos sem compilar |
| `npm run prisma:migrate` | Criar/executar migrations |
| `npm run prisma:seed` | Popular banco com seed |
| `npm run prisma:studio` | Abrir Prisma Studio (GUI) |

---

## Sessão WhatsApp

A sessão autenticada é salva em `./wa-session/` (ignorada pelo git). Se precisar reconectar do zero:

```bash
rm -rf wa-session/
npm run dev
```

Um novo QR Code será gerado.
