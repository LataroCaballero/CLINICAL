import { Module } from '@nestjs/common';
import { AutorizacionesController } from './autorizaciones.controller';
import { AutorizacionesService } from './autorizaciones.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [AutorizacionesController],
  providers: [AutorizacionesService, PrismaService],
  exports: [AutorizacionesService],
})
export class AutorizacionesModule {}
