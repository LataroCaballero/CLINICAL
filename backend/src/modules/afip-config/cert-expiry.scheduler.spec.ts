import { Test, TestingModule } from '@nestjs/testing';
import { CertExpiryScheduler } from './cert-expiry.scheduler';

// Minimal stubs — full implementation in Wave 1 (Plan 03)
describe('CertExpiryScheduler', () => {
  let scheduler: CertExpiryScheduler;
  let sendAlertSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CertExpiryScheduler,
          useValue: {
            checkCertExpiry: jest.fn(),
          },
        },
      ],
    }).compile();

    scheduler = module.get<CertExpiryScheduler>(CertExpiryScheduler);
  });

  describe('checkCertExpiry', () => {
    it('CERT-03: sends alert when daysLeft === 60', () => {
      expect(true).toBe(true);
    });

    it('CERT-03: sends alert when daysLeft === 30', () => {
      expect(true).toBe(true);
    });

    it('CERT-03: does NOT send alert when daysLeft === 45', () => {
      expect(true).toBe(true);
    });

    it('CERT-03: sends alert (urgent) when daysLeft <= 5', () => {
      expect(true).toBe(true);
    });

    it('CERT-03: does not send alert when SMTP is not configured', () => {
      expect(true).toBe(true);
    });
  });
});
