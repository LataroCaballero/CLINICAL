import { UnrecoverableError } from 'bullmq';
import { CaeaInformarProcessor, CAEA_INFORMAR_QUEUE } from './caea-informar.processor';
import { AfipBusinessError, AfipTransientError } from '../afip/afip.errors';

describe('CaeaInformarProcessor', () => {
  let processor: CaeaInformarProcessor;
  let mockCaeaService: any;

  const makeJob = (data: { facturaId: string; profesionalId: string }) =>
    ({ data } as any);

  beforeEach(() => {
    mockCaeaService = {
      informarFactura: jest.fn(),
    };
    processor = new CaeaInformarProcessor(mockCaeaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('exports CAEA_INFORMAR_QUEUE constant', () => {
    expect(CAEA_INFORMAR_QUEUE).toBe('caea-informar');
  });

  describe('process()', () => {
    it('Test 1: calls caeaService.informarFactura and resolves', async () => {
      mockCaeaService.informarFactura.mockResolvedValue(undefined);

      await expect(
        processor.process(makeJob({ facturaId: 'f1', profesionalId: 'p1' })),
      ).resolves.toBeUndefined();

      expect(mockCaeaService.informarFactura).toHaveBeenCalledWith('f1', 'p1');
    });

    it('Test 2: AfipBusinessError is wrapped as UnrecoverableError', async () => {
      mockCaeaService.informarFactura.mockRejectedValue(
        new AfipBusinessError(['Error CAEA incorrecto'], {} as any),
      );

      await expect(
        processor.process(makeJob({ facturaId: 'f1', profesionalId: 'p1' })),
      ).rejects.toBeInstanceOf(UnrecoverableError);
    });

    it('Test 3: AfipTransientError propagates (not wrapped in UnrecoverableError)', async () => {
      const transientErr = new AfipTransientError('timeout');
      mockCaeaService.informarFactura.mockRejectedValue(transientErr);

      await expect(
        processor.process(makeJob({ facturaId: 'f1', profesionalId: 'p1' })),
      ).rejects.toBeInstanceOf(AfipTransientError);

      await expect(
        processor.process(makeJob({ facturaId: 'f1', profesionalId: 'p1' })),
      ).rejects.not.toBeInstanceOf(UnrecoverableError);
    });
  });
});
