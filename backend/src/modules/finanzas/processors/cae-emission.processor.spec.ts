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
import { PrismaService } from '../../../prisma/prisma.service';

const makeJob = (data: any) => ({ id: 'job-1', name: 'emit-cae', data } as any);

describe('CaeEmissionProcessor', () => {
  let processor: CaeEmissionProcessor;
  let mockAfipService: { emitirComprobante: jest.Mock };
  let mockCaeaService: { asignarCaeaFallback: jest.Mock };
  let mockPrismaService: { factura: { update: jest.Mock } };

  beforeEach(async () => {
    mockAfipService = { emitirComprobante: jest.fn() };
    mockCaeaService = { asignarCaeaFallback: jest.fn().mockResolvedValue(undefined) };
    mockPrismaService = { factura: { update: jest.fn().mockResolvedValue({}) } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CaeEmissionProcessor,
        { provide: AFIP_SERVICE, useValue: mockAfipService },
        { provide: CaeaService, useValue: mockCaeaService },
        { provide: PrismaService, useValue: mockPrismaService },
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

    it('Test 8: persists afipError in Factura when max retries reached', async () => {
      const job = {
        id: 'j1',
        attemptsMade: 3,
        opts: { attempts: 3 },
        data: { facturaId: 'f1', profesionalId: 'p1' },
        failedReason: 'IVA del receptor es inválido (10242).',
      } as any;

      await processor.onFailed(job);

      expect(mockPrismaService.factura.update).toHaveBeenCalledWith({
        where: { id: 'f1' },
        data: { afipError: 'IVA del receptor es inválido (10242).' },
      });
    });

    it('Test 9: persists afipError in Factura even when attemptsMade < maxAttempts (UnrecoverableError path)', async () => {
      const job = {
        id: 'j1',
        attemptsMade: 1,           // BullMQ fires onFailed with 1 for UnrecoverableError
        opts: { attempts: 5 },     // configured retries — does NOT match attemptsMade
        data: { facturaId: 'f1', profesionalId: 'p1' },
        failedReason: 'El receptor tiene condición de IVA inválida (10242).',
      } as any;

      await processor.onFailed(job);

      // BUG-1 fix target: update must be called regardless of attemptsMade
      expect(mockPrismaService.factura.update).toHaveBeenCalledWith({
        where: { id: 'f1' },
        data: { afipError: 'El receptor tiene condición de IVA inválida (10242).' },
      });
      // Guard still protects CAEA fallback — must NOT be called when attemptsMade < maxAttempts
      expect(mockCaeaService.asignarCaeaFallback).not.toHaveBeenCalled();
    });
  });
});
