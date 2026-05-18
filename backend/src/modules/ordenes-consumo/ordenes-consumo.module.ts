import { Module } from '@nestjs/common';
import { OrdenesConsumoController } from './ordenes-consumo.controller';
import { OrdenesConsumoService } from './ordenes-consumo.service';

@Module({
  controllers: [OrdenesConsumoController],
  providers: [OrdenesConsumoService],
  exports: [OrdenesConsumoService],
})
export class OrdenesConsumoModule {}
