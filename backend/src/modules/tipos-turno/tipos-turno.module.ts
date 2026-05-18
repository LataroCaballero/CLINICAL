import { Module } from '@nestjs/common';
import { TiposTurnoService } from './tipos-turno.service';
import { TiposTurnoController } from './tipos-turno.controller';

@Module({
  controllers: [TiposTurnoController],
  providers: [TiposTurnoService],
})
export class TiposTurnoModule {}
