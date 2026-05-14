import { Module } from '@nestjs/common';
import { ObrasSocialesController } from './obras-sociales.controller';
import { ObrasSocialesService } from './obras-sociales.service';

@Module({
  controllers: [ObrasSocialesController],
  providers: [ObrasSocialesService],
})
export class ObrasSocialesModule {}
