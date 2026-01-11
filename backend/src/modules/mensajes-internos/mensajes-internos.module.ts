import { Module } from '@nestjs/common';
import { MensajesInternosController } from './mensajes-internos.controller';
import { MensajesInternosService } from './mensajes-internos.service';

@Module({
  controllers: [MensajesInternosController],
  providers: [MensajesInternosService],
  exports: [MensajesInternosService],
})
export class MensajesInternosModule {}
