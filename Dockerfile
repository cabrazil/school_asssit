# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app

# ---- Instalar dependências de produção ----
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production

# ---- Build TypeScript ----
FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- Imagem final enxuta ----
FROM base AS runner
ENV NODE_ENV=production

# Copiar apenas o necessário
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY package.json ./

# Criar diretório para sessão WhatsApp (montado como volume)
RUN mkdir -p /app/wa-session

# Usuário não-root para segurança
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000

CMD ["node", "dist/main.js"]
