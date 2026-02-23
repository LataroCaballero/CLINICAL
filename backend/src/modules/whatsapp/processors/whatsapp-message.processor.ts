import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

export const WHATSAPP_QUEUE = 'whatsapp-messages';

@Processor(WHATSAPP_QUEUE)
export class WhatsappMessageProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsappMessageProcessor.name);

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'send-whatsapp-message':
        // TODO Phase 4: implementar envío real via WABA API
        this.logger.log(
          `[Phase 1 smoke test] job procesado: ${JSON.stringify(job.data)}`,
        );
        break;

      case 'test-job':
        this.logger.log(
          `[Smoke test] test-job procesado: ${JSON.stringify(job.data)}`,
        );
        break;

      default:
        throw new Error(`Job desconocido: ${job.name}`);
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job): void {
    this.logger.error(`Job ${job.id} falló: ${job.failedReason}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.log(`Job ${job.id} completado`);
  }
}
