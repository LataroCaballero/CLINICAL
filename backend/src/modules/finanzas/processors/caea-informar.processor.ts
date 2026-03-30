import { Injectable, Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, UnrecoverableError } from 'bullmq';
import { CaeaService } from '../afip/caea.service';
import { AfipBusinessError } from '../afip/afip.errors';

export const CAEA_INFORMAR_QUEUE = 'caea-informar';

export interface CaeaInformarJobData {
  facturaId: string;
  profesionalId: string;
}

/**
 * BullMQ processor for FECAEARegInformativo SOAP calls.
 *
 * Retry config: 72 attempts over 8 days, fixed 160-minute delay between retries.
 * This matches the RG 5782/2025 CAEA inform deadline (8 days from CAEA period end).
 *
 * Job enqueue config (used in CaeaService.asignarCaeaFallback):
 *   { attempts: 72, backoff: { type: 'fixed', delay: 9_600_000 } }
 */
@Injectable()
@Processor(CAEA_INFORMAR_QUEUE)
export class CaeaInformarProcessor extends WorkerHost {
  private readonly logger = new Logger(CaeaInformarProcessor.name);

  constructor(private readonly caeaService: CaeaService) {
    super();
  }

  async process(job: Job<CaeaInformarJobData>): Promise<void> {
    const { facturaId, profesionalId } = job.data;
    this.logger.log(`Processing CAEA inform job ${job.id} — facturaId: ${facturaId}`);

    try {
      await this.caeaService.informarFactura(facturaId, profesionalId);
    } catch (err) {
      if (err instanceof AfipBusinessError) {
        // Permanent AFIP business rejection — wrap in UnrecoverableError so BullMQ
        // moves the job to the failed set immediately without further retries.
        this.logger.error(
          `CAEA inform business error — facturaId: ${facturaId}, message: ${err.spanishMessage}`,
        );
        throw new UnrecoverableError(err.spanishMessage);
      }

      // AfipTransientError or network error — re-throw so BullMQ applies fixed
      // 160-minute delay backoff (configured at enqueue time: { attempts: 72 }).
      this.logger.warn(
        `CAEA inform transient error — facturaId: ${facturaId}, retrying: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.log(`CAEA inform job ${job.id} completed — facturaId: ${(job.data as CaeaInformarJobData).facturaId}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job): void {
    this.logger.error(
      `CAEA inform job ${job.id} failed — facturaId: ${(job.data as CaeaInformarJobData).facturaId}: ${job.failedReason}`,
    );
  }
}
