import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:3000', 'https://clinical-azure.vercel.app/'],
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port, 'localhost');
}
bootstrap();
