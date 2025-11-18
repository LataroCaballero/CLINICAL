import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaService } from '../prisma/prisma.service';
import { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AuditMiddleware } from './common/middleware/audit.middleware';

@Module({
  imports: [AuthModule],
  controllers: [AppController],
  providers: [PrismaService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuditMiddleware).forRoutes('*'); // audita todo
  }
}
