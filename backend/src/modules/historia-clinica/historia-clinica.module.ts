import { Module } from '@nestjs/common';
import { HistoriaClinicaService } from './historia-clinica.service';
import { HistoriaClinicaController } from './historia-clinica.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule, // acceso a PrismaService
  ],
  controllers: [HistoriaClinicaController],
  providers: [HistoriaClinicaService],
  exports: [
    HistoriaClinicaService, // por si otro módulo lo necesita más adelante
  ],
})
export class HistoriaClinicaModule {}
