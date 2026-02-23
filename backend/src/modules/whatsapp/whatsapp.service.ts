import { Injectable, NotImplementedException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WHATSAPP_QUEUE } from './processors/whatsapp-message.processor';

@Injectable()
export class WhatsappService {
  constructor(
    @InjectQueue(WHATSAPP_QUEUE) private readonly whatsappQueue: Queue,
  ) {}

  /**
   * Encola un job de prueba para verificar que BullMQ + NestJS v10 funcionen.
   * Usado por el endpoint POST /whatsapp/test-queue durante Phase 1 smoke test.
   */
  async enqueueTestJob(): Promise<{ queued: boolean; jobId: string }> {
    const job = await this.whatsappQueue.add(
      'test-job',
      { test: true, timestamp: new Date().toISOString() },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: false, // Mantener para inspección post-test
      },
    );
    return { queued: true, jobId: job.id as string };
  }

  /**
   * Placeholder para validación de credenciales WABA.
   * Se implementa en Phase 4 junto con la integración de Meta WABA API.
   */
  async validateWABACredentials(
    _phoneNumberId: string,
    _accessToken: string,
  ): Promise<void> {
    throw new NotImplementedException(
      'WABA credentials validation will be implemented in Phase 4',
    );
  }
}
