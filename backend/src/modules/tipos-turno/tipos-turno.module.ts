import { Module } from '@nestjs/common';
import { TiposTurnoService } from './tipos-turno.service';
import { TiposTurnoController } from './tipos-turno.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TiposTurnoController],
  providers: [TiposTurnoService],
})
export class TiposTurnoModule {}
