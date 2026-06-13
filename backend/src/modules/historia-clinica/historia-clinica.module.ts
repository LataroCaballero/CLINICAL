import { Module } from '@nestjs/common';
import { HistoriaClinicaService } from './historia-clinica.service';
import { HistoriaClinicaController } from './historia-clinica.controller';
import { CatalogoHCModule } from '../catalogo-hc/catalogo-hc.module';

@Module({
  imports: [CatalogoHCModule],
  controllers: [HistoriaClinicaController],
  providers: [HistoriaClinicaService],
  exports: [HistoriaClinicaService],
})
export class HistoriaClinicaModule {}
