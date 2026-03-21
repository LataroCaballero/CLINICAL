import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, UnrecoverableError } from 'bullmq';
import { AFIP_SERVICE } from '../afip/afip.constants';
import { AfipService } from '../afip/afip.interfaces';
import { AfipBusinessError } from '../afip/afip.errors';

export const CAE_QUEUE = 'cae-emission';

export interface CaeJobData {
  facturaId: string;
  profesionalId: string;
}

@Injectable()
@Processor(CAE_QUEUE)
export class CaeEmissionProcessor extends WorkerHost {
  private readonly logger = new Logger(CaeEmissionProcessor.name);

  constructor(
    @Inject(AFIP_SERVICE) private readonly afipService: AfipService,
  ) {
    super();
  }

  async process(job: Job<CaeJobData>): Promise<void> {
    const { facturaId, profesionalId } = job.data;
    this.logger.log(`Processing CAE job ${job.id} — facturaId: ${facturaId}`);

    try {
      // AfipRealService reads all required data (amounts, docTipo, etc.) from DB by facturaId.
      // We only pass the identifiers to prevent trusting client-supplied monetary data.
      await (this.afipService as any).emitirComprobante({ facturaId, profesionalId });
    } catch (err) {
      if (err instanceof AfipBusinessError) {
        // Permanent failure — bad data that retrying will never fix.
        // UnrecoverableError moves job to BullMQ failed set immediately (no retries).
        this.logger.error(
          `CAE business error — facturaId: ${facturaId}, message: ${err.spanishMessage}`,
        );
        throw new UnrecoverableError(err.spanishMessage);
      }

      // Transient: AfipTransientError, AxiosError timeout, network error, etc.
      // Re-throw so BullMQ applies exponential backoff (attempts: 3, delay: 2s base).
      this.logger.warn(
        `CAE transient error — facturaId: ${facturaId}, retrying: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.log(`CAE job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job): void {
    this.logger.error(`CAE job ${job.id} failed: ${job.failedReason}`);
  }
}
