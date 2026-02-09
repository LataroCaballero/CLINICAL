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
import { DiagnosticosModule } from './diagnosticos/diagnosticos.module';
import { TratamientosModule } from './modules/tratamientos/tratamientos.module';
import { HistoriaClinicaModule } from './modules/historia-clinica/historia-clinica.module';
import { TurnosModule } from './modules/turnos/turnos.module';
import { TiposTurnoModule } from './modules/tipos-turno/tipos-turno.module';
import { CuentasCorrientesModule } from './modules/cuentas-corrientes/cuentas-corrientes.module';
import { PresupuestosModule } from './modules/presupuestos/presupuestos.module';
import { HCTemplatesModule } from './modules/hc-templates/hc-templates.module';
import { MensajesInternosModule } from './modules/mensajes-internos/mensajes-internos.module';
import { StockModule } from './modules/stock/stock.module';
import { FinanzasModule } from './modules/finanzas/finanzas.module';
import { AlertasModule } from './modules/alertas/alertas.module';
import { CuentasCorrientesProveedoresModule } from './modules/cuentas-corrientes-proveedores/cuentas-corrientes-proveedores.module';
import { ReportesModule } from './modules/reportes/reportes.module';

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
    DiagnosticosModule,
    TratamientosModule,
    HistoriaClinicaModule,
    HCTemplatesModule,
    TurnosModule,
    TiposTurnoModule,
    CuentasCorrientesModule,
    CuentasCorrientesProveedoresModule,
    PresupuestosModule,
    MensajesInternosModule,
    StockModule,
    FinanzasModule,
    AlertasModule,
    ReportesModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuditMiddleware).forRoutes('*');
  }
}
