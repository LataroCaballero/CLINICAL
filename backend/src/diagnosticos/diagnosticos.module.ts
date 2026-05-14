import { Module } from '@nestjs/common';
import { DiagnosticosService } from './diagnosticos.service';
import { DiagnosticosController } from './diagnosticos.controller';

@Module({
  controllers: [DiagnosticosController],
  providers: [DiagnosticosService],
})
export class DiagnosticosModule {}
