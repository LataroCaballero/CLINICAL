import { Module } from '@nestjs/common';
import { TratamientosController } from './tratamientos.controller';
import { TratamientosService } from './tratamientos.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [TratamientosController],
  providers: [TratamientosService, PrismaService],
})
export class TratamientosModule {}
