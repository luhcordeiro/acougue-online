# Dockerfile para Sistema Açougue Online
# Multi-stage build para otimizar o tamanho da imagem

# Estágio 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package.json pnpm-lock.yaml ./

# Instalar pnpm e dependências
RUN npm install -g pnpm@latest && \
    pnpm install --frozen-lockfile

# Copiar código fonte
COPY . .

# Build da aplicação
RUN pnpm run build

# Estágio 2: Produção
FROM node:22-alpine AS production

WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm@latest

# Copiar arquivos de dependências
COPY package.json pnpm-lock.yaml ./

# Instalar apenas dependências de produção
RUN pnpm install --prod --frozen-lockfile

# Copiar build do estágio anterior
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Expor porta
EXPOSE 3000

# Variáveis de ambiente (serão fornecidas no docker-compose ou runtime)
ENV NODE_ENV=production

# Comando de inicialização
CMD ["node", "dist/server/index.js"]
