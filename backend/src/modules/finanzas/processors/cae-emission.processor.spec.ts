/**
 * CaeEmissionProcessor unit tests — CAE-04, CAEA-02
 *
 * Coverage:
 *   CAE-04: AfipBusinessError → UnrecoverableError (DLQ immediately, no retries)
 *   CAE-04: AfipTransientError → re-throw (BullMQ retries with exponential backoff)
 *   CAE-04: Axios timeout → re-throw (BullMQ retries with exponential backoff)
 *   CAEA-02: onFailed with attemptsMade >= max → calls caeaService.asignarCaeaFallback
 *   CAEA-02: onFailed with attemptsMade < max → does NOT call asignarCaeaFallback
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UnrecoverableError } from 'bullmq';
import { CaeEmissionProcessor, CAE_QUEUE } from './cae-emission.processor';
import { AfipBusinessError, AfipTransientError } from '../afip/afip.errors';
import { AFIP_SERVICE } from '../afip/afip.constants';
import { CaeaService } from '../afip/caea.service';

const makeJob = (data: any) => ({ id: 'job-1', name: 'emit-cae', data } as any);

describe('CaeEmissionProcessor', () => {
  let processor: CaeEmissionProcessor;
  let mockAfipService: { emitirComprobante: jest.Mock };
  let mockCaeaService: { asignarCaeaFallback: jest.Mock };

  beforeEach(async () => {
    mockAfipService = { emitirComprobante: jest.fn() };
    mockCaeaService = { asignarCaeaFallback: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CaeEmissionProcessor,
        { provide: AFIP_SERVICE, useValue: mockAfipService },
        { provide: CaeaService, useValue: mockCaeaService },
      ],
    }).compile();

    processor = module.get<CaeEmissionProcessor>(CaeEmissionProcessor);
  });

  // CAE-04: Business error → permanent failure
  it('throws UnrecoverableError when AfipService throws AfipBusinessError', async () => {
    const rawResult = { cae: '', caeFchVto: '', cbtDesde: 0, cbtHasta: 0, resultado: 'R' as const };
    mockAfipService.emitirComprobante.mockRejectedValue(
      new AfipBusinessError(['Obs 10242: condicion IVA'], rawResult),
    );

    await expect(
      processor.process(makeJob({ facturaId: 'fac-1', profesionalId: 'pro-1' })),
    ).rejects.toBeInstanceOf(UnrecoverableError);
  });

  // CAE-04: Transient error → BullMQ retry
  it('re-throws AfipTransientError so BullMQ applies exponential backoff', async () => {
    mockAfipService.emitirComprobante.mockRejectedValue(
      new AfipTransientError('AFIP timeout'),
    );

    await expect(
      processor.process(makeJob({ facturaId: 'fac-1', profesionalId: 'pro-1' })),
    ).rejects.toBeInstanceOf(AfipTransientError);
    // Must NOT be UnrecoverableError (BullMQ would not retry if it were)
  });

  // CAE-04: Axios timeout → BullMQ retry
  it('re-throws AxiosError timeout so BullMQ applies exponential backoff', async () => {
    const axiosErr = Object.assign(new Error('timeout of 30000ms exceeded'), { code: 'ECONNABORTED' });
    mockAfipService.emitirComprobante.mockRejectedValue(axiosErr);

    await expect(
      processor.process(makeJob({ facturaId: 'fac-1', profesionalId: 'pro-1' })),
    ).rejects.not.toBeInstanceOf(UnrecoverableError);
  });

  // ---------------------------------------------------------------------------
  // CAEA-02: CAEA fallback in onFailed handler
  // ---------------------------------------------------------------------------

  describe('CAEA fallback', () => {
    it('Test 6: calls asignarCaeaFallback when attemptsMade >= opts.attempts', async () => {
      const job = {
        id: 'j1',
        attemptsMade: 3,
        opts: { attempts: 3 },
        data: { facturaId: 'f1', profesionalId: 'p1' },
        failedReason: 'timeout',
      } as any;

      await processor.onFailed(job);

      expect(mockCaeaService.asignarCaeaFallback).toHaveBeenCalledWith('f1', 'p1');
    });

    it('Test 7: does NOT call asignarCaeaFallback when attemptsMade < opts.attempts', async () => {
      const job = {
        id: 'j1',
        attemptsMade: 1,
        opts: { attempts: 3 },
        data: { facturaId: 'f1', profesionalId: 'p1' },
        failedReason: 'timeout',
      } as any;

      await processor.onFailed(job);

      expect(mockCaeaService.asignarCaeaFallback).not.toHaveBeenCalled();
    });
  });
});
