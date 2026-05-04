import { Module } from '@nestjs/common';
import { OrdenesConsumoController } from './ordenes-consumo.controller';
import { OrdenesConsumoService } from './ordenes-consumo.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OrdenesConsumoController],
  providers: [OrdenesConsumoService],
  exports: [OrdenesConsumoService],
})
export class OrdenesConsumoModule {}
