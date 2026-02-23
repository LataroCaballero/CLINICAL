import { Controller, Post } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { Auth } from '../auth/decorators/auth.decorator';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  /**
   * POST /whatsapp/test-queue
   * Encola un test-job en BullMQ para verificar que la queue funciona.
   * TEMPORAL: solo para smoke test Phase 1.
   * TODO: remover antes de Phase 4 o mover a admin-only route dedicada.
   */
  @Post('test-queue')
  @Auth('ADMIN')
  async testQueue(): Promise<{ queued: boolean; jobId: string }> {
    return this.whatsappService.enqueueTestJob();
  }
}
