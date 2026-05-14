import { Module } from '@nestjs/common';
import { HCTemplatesController } from './hc-templates.controller';
import { HCRunnerController } from './hc-runner.controller';
import { HCTemplatesService } from './hc-templates.service';

@Module({
  controllers: [HCTemplatesController, HCRunnerController],
  providers: [HCTemplatesService],
  exports: [HCTemplatesService],
})
export class HCTemplatesModule {}
