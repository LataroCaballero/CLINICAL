import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { SaveWabaConfigDto } from './dto/save-waba-config.dto';

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

  /**
   * GET /whatsapp/config
   * Returns WABA configuration for the current professional (safe fields only).
   * SECURITY: accessTokenEncrypted is never included in the response.
   */
  @Get('config')
  @Auth('ADMIN', 'PROFESIONAL')
  async getConfig(@Req() req: any) {
    const profesionalId = req.user.profesionalId as string;
    return this.whatsappService.getWabaConfig(profesionalId);
  }

  /**
   * POST /whatsapp/config
   * Saves WABA credentials for the current professional.
   * Validates against Meta Graph API before encrypting and persisting.
   * SECURITY: accessToken is never stored in plaintext.
   */
  @Post('config')
  @Auth('ADMIN', 'PROFESIONAL')
  async saveConfig(@Req() req: any, @Body() dto: SaveWabaConfigDto) {
    const profesionalId = req.user.profesionalId as string;
    return this.whatsappService.saveWabaConfig(profesionalId, dto);
  }
}
