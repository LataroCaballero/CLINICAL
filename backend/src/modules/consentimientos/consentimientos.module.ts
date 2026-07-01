import { Module } from '@nestjs/common';
import { ConsentimientosController } from './consentimientos.controller';
import { ConsentimientosService } from './consentimientos.service';
import { ConsentStampService } from './consent-stamp.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule], // provides StorageService for injection
  controllers: [ConsentimientosController],
  providers: [ConsentimientosService, ConsentStampService],
  exports: [ConsentimientosService, ConsentStampService],
})
export class ConsentimientosModule {}
