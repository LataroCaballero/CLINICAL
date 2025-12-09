import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AuditMiddleware } from './common/middleware/audit.middleware';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { PrismaModule } from './prisma/prisma.module';
import { PacientesModule } from './modules/pacientes/pacientes.module';
import { ConfigModule } from '@nestjs/config';
import { ObrasSocialesModule } from './modules/obras-sociales/obras-sociales.module';
import { ProfesionalesModule } from './modules/profesionales/profesionales.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', // <- carga el .env desde ./backend/.env
    }),
    PrismaModule,
    AuthModule,
    UsuariosModule,
    PacientesModule,
    ObrasSocialesModule,
    ProfesionalesModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuditMiddleware).forRoutes('*');
  }
}
