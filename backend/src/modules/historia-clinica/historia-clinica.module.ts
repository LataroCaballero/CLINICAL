import { Module } from '@nestjs/common';
import { HistoriaClinicaService } from './historia-clinica.service';
import { HistoriaClinicaController } from './historia-clinica.controller';

@Module({
  controllers: [HistoriaClinicaController],
  providers: [HistoriaClinicaService],
  exports: [HistoriaClinicaService],
})
export class HistoriaClinicaModule {}
