/**
 * CaeEmissionProcessor unit tests — scaffold (Wave 0)
 * Tests are xit (skipped) until Plan 03 implements CaeEmissionProcessor.
 *
 * Coverage:
 *   CAE-04: AfipBusinessError → UnrecoverableError (DLQ immediately)
 *   CAE-04: AfipTransientError → re-throw (BullMQ retries with backoff)
 *   CAE-04: Axios timeout → re-throw (BullMQ retries with backoff)
 */

describe('CaeEmissionProcessor', () => {
  // CAE-04: Business error → permanent failure
  xit('throws UnrecoverableError when AfipService throws AfipBusinessError', async () => {
    // TODO Plan 03: mock afipService.emitirComprobante to throw AfipBusinessError
    // expect processor.process() to throw UnrecoverableError
    // UnrecoverableError means BullMQ moves job to failed set with no retries
  });

  // CAE-04: Transient error → BullMQ retry
  xit('re-throws AfipTransientError so BullMQ applies exponential backoff', async () => {
    // TODO Plan 03: mock afipService.emitirComprobante to throw AfipTransientError
    // expect processor.process() to throw (not UnrecoverableError)
  });

  // CAE-04: Axios timeout → BullMQ retry
  xit('re-throws AxiosError timeout so BullMQ applies exponential backoff', async () => {
    // TODO Plan 03: mock axios timeout error
    // expect processor.process() to throw (not UnrecoverableError)
  });
});
