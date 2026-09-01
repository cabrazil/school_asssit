# School Assist — Deploy no VPS

## Pré-requisitos do VPS

- Ubuntu 22.04 LTS (ou similar)
- Docker + Docker Compose instalados
- Porta 3000 (ou a que escolher) aberta no firewall

---

## 1. Preparar o servidor

### Instalar Docker

```bash
# Atualizar pacotes
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com | bash
sudo usermod -aG docker $USER

# Verificar instalação
docker --version
docker compose version
```

---

## 2. Clonar o projeto no VPS

```bash
git clone <seu-repositorio> /opt/school-assist
cd /opt/school-assist
```

---

## 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
nano .env  # ou vim .env
```

Preencha com as credenciais reais:

```env
NODE_ENV=production
LOG_LEVEL=info
PORT=3000

DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

WA_SESSION_DIR=/app/wa-session
WA_BOT_PHONE=5511999999999
```

---

## 4. Executar as migrations

Antes de subir o container, execute as migrations apontando para o banco de produção:

```bash
# Instalar dependências apenas para rodar o migrate
npm ci
npx prisma migrate deploy
```

> Use `migrate deploy` em produção (não `migrate dev`).

---

## 5. Primeira execução — autenticar WhatsApp

Na primeira vez, é necessário escanear o QR Code no terminal. Execute **sem** o modo daemon:

```bash
docker compose up --build
```

Aguarde o QR Code aparecer nos logs, escaneie com o WhatsApp do número dedicado e aguarde a mensagem `✅ WhatsApp conectado`. Então pressione `Ctrl+C` — a sessão foi salva em `./wa-session/`.

---

## 6. Executar em background (produção)

```bash
docker compose up -d --build
```

Verificar status:
```bash
docker compose ps
docker compose logs -f
```

---

## 7. Health check

```bash
curl http://localhost:3000/health
# Ou com IP público:
curl http://<IP-DO-VPS>:3000/health
```

---

## 8. Atualizar a aplicação

```bash
git pull origin main
docker compose up -d --build
```

As migrations novas são aplicadas automaticamente se você executar:
```bash
npx prisma migrate deploy
docker compose up -d --build
```

---

## 9. Monitoramento de logs

```bash
# Logs em tempo real
docker compose logs -f app

# Últimas 100 linhas
docker compose logs --tail=100 app

# Filtrar por nível (requer jq)
docker compose logs -f app | grep '"level":50'  # errors
```

---

## 10. Backup da sessão WhatsApp

O diretório `./wa-session/` contém as chaves criptográficas da sessão. Faça backup regularmente:

```bash
tar -czf wa-session-backup-$(date +%Y%m%d).tar.gz wa-session/
```

Se a sessão for perdida, execute novamente o passo 5 para re-autenticar.

---

## 11. Alternativa sem Docker — PM2

Se preferir não usar Docker:

```bash
npm install -g pm2
npm ci
npm run build
npx prisma migrate deploy

pm2 start dist/main.js --name school-assist
pm2 save
pm2 startup  # para reiniciar no boot
```

Monitorar:
```bash
pm2 status
pm2 logs school-assist
pm2 monit
```

---

## Firewall (ufw)

```bash
# Permitir porta da aplicação (se não usar nginx como proxy)
sudo ufw allow 3000/tcp

# Recomendado: usar nginx como proxy reverso na porta 80/443
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

---

## Renovação automática da sessão

A sessão do Baileys pode expirar. Configure um health check externo (ex: UptimeRobot) monitorando o endpoint `/health`. Se o serviço cair, o Docker reiniciará automaticamente (`restart: unless-stopped`).
