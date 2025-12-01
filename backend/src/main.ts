import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
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

  const port = process.env.PORT || 3001;
  await app.listen(3001, '0.0.0.0');
}
bootstrap();
