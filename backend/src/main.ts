import * as crypto from 'crypto';

// Polyfill for crypto (required by @nestjs/schedule in some environments)
if (!globalThis.crypto) {
  (globalThis as any).crypto = crypto;
}

import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaClientExceptionFilter } from './prisma-client-exception/prisma-client-exception.filter';

async function bootstrap() {
  console.log('DATABASE_URL desde Nest:', process.env.DATABASE_URL);

  const app = await NestFactory.create(AppModule);

  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://clinical-azure.vercel.app',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Permitir herramientas sin origin (curl, Postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error('CORS bloqueado para origen:', origin);
      return callback(
        new Error('Origen no permitido por CORS: ' + origin),
        false,
      );
    },
    credentials: true,
  });

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new PrismaClientExceptionFilter(httpAdapter));

  const port = process.env.PORT || 3001;
  await app.listen(3001, '0.0.0.0');
}
bootstrap();
