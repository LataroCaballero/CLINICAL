import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { HCTemplatesController } from './hc-templates.controller';
import { HCRunnerController } from './hc-runner.controller';
import { HCTemplatesService } from './hc-templates.service';

@Module({
  imports: [PrismaModule],
  controllers: [HCTemplatesController, HCRunnerController],
  providers: [HCTemplatesService],
  exports: [HCTemplatesService],
})
export class HCTemplatesModule {}
