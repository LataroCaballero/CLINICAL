import { Module } from '@nestjs/common';
import { ConsentimientosController } from './consentimientos.controller';
import { ConsentimientosService } from './consentimientos.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule], // provides StorageService for injection
  controllers: [ConsentimientosController],
  providers: [ConsentimientosService],
  exports: [ConsentimientosService],
})
export class ConsentimientosModule {}
