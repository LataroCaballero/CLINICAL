FROM node:20-alpine

WORKDIR /app

# Copiar dependencias primero
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar resto del código
COPY . .

# Generar Prisma Client sin engines (NO necesita DATABASE_URL)
RUN npx prisma generate --no-engine

# Compilar NestJS
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
