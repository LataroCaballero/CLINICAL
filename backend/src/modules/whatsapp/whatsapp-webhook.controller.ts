import { Controller, Get, Post, Query, Body, Res, HttpCode, Logger, UseGuards } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Response } from 'express';
import { WHATSAPP_QUEUE } from './processors/whatsapp-message.processor';
import { WhatsappHmacGuard } from './guards/whatsapp-hmac.guard';

// No @Auth() decorator — public endpoints required by Meta webhook verification
@Controller()
export class WhatsappWebhookController {
  private readonly logger = new Logger(WhatsappWebhookController.name);

  constructor(
    @InjectQueue(WHATSAPP_QUEUE) private readonly whatsappQueue: Queue,
  ) {}

  /**
   * GET /webhook/whatsapp
   * Meta webhook verification challenge.
   * Meta sends hub.mode=subscribe + hub.verify_token + hub.challenge.
   * We respond with the challenge value to confirm ownership.
   * No auth — this must be publicly accessible.
   */
  @Get('webhook/whatsapp')
  verifyWebhook(@Query() query: any, @Res() res: Response) {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WA_WEBHOOK_VERIFY_TOKEN) {
      this.logger.log('WhatsApp webhook verified successfully');
      return res.status(200).send(challenge);
    }

    this.logger.warn(
      `WhatsApp webhook verification failed — mode: ${mode}, token match: ${token === process.env.WA_WEBHOOK_VERIFY_TOKEN}`,
    );
    return res.status(403).send('Forbidden');
  }

  /**
   * POST /webhook/whatsapp
   * Receives Meta webhook events (status updates, inbound messages).
   * ALWAYS returns 200 immediately — Meta requires this within 20s or will retry.
   * Processing is async via BullMQ process-webhook job.
   * No auth — Meta does not send Bearer tokens (HMAC signature verified separately).
   */
  @Post('webhook/whatsapp')
  @HttpCode(200)
  @UseGuards(WhatsappHmacGuard)
  async handleWebhook(@Body() body: any): Promise<string> {
    // Enqueue async — NEVER block here; Meta requires 200 within 20s
    await this.whatsappQueue.add('process-webhook', body, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
    return 'OK';
  }
}
