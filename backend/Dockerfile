FROM node:20-alpine

WORKDIR /app

# Copiar dependencias primero
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Ahora sí copiar el resto del código (incluye /prisma)
COPY . .

# Generar prisma client
RUN npx prisma generate

# Compilar NestJS
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
