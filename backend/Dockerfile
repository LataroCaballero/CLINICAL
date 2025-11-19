# ==========
# 1. Builder
# ==========
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar package.json + prisma
COPY package*.json ./
COPY prisma ./prisma

# ======== FIX CRÍTICO PARA RAILWAY ========
# Prisma necesita *algo* en DATABASE_URL durante el build,
# aunque luego el valor real se cargue en runtime.
ENV DATABASE_URL="postgresql://fake:fake@localhost:5432/fake"

# Instalar dependencias
RUN npm install

# Generar Prisma Client
RUN npx prisma generate

# Copiar el resto del backend
COPY . .

# Compilar NestJS
RUN npm run build


# ==========
# 2. Runner
# ==========
FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

EXPOSE 3000

CMD ["node", "dist/main.js"]
