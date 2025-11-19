FROM node:20-alpine

WORKDIR /app

# 1) Copiar package.json + package-lock.json
COPY package*.json ./

# 2) Instalar dependencias
RUN npm install

# 3) Copiar todo el código (incluye prisma/)
COPY . .

# 4) Generar Prisma Client
RUN npx prisma generate

# 5) Build NestJS
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
