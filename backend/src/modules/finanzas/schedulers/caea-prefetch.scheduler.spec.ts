/**
 * CaeaPrefetchScheduler unit tests — CAEA-01, CAEA-04
 *
 * Coverage:
 *   CAEA-01: prefetchAllTenants — calls solicitarYPersistir for each ConfiguracionAFIP tenant
 *   CAEA-01: prefetchAllTenants — logs error but continues if one tenant fails
 *   CAEA-04: checkDeadlines — sends email when daysUntilDeadline <= 2 AND pendingCount > 0
 *   CAEA-04: checkDeadlines — does NOT send email when pendingCount === 0
 *   CAEA-04: checkDeadlines — does NOT send email when daysUntilDeadline > 2
 */

import * as nodemailer from 'nodemailer';
import { CaeaPrefetchScheduler } from './caea-prefetch.scheduler';
import { AfipTransientError } from '../afip/afip.errors';

jest.mock('nodemailer');

const mockedNodemailer = nodemailer as jest.Mocked<typeof nodemailer>;

// Helper to build an AFIP date string (YYYYMMDD) offset by N days from today (UTC)
function afipDateInDays(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

describe('CaeaPrefetchScheduler', () => {
  let scheduler: CaeaPrefetchScheduler;
  let mockPrisma: any;
  let mockCaeaService: any;
  let mockConfig: any;
  let mockSendMail: jest.Mock;

  beforeEach(() => {
    mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test' });
    mockedNodemailer.createTransport = jest.fn().mockReturnValue({
      sendMail: mockSendMail,
    }) as any;

    mockPrisma = {
      configuracionAFIP: {
        findMany: jest.fn(),
      },
      caeaVigente: {
        findMany: jest.fn(),
      },
      factura: {
        count: jest.fn(),
      },
    };

    mockCaeaService = {
      solicitarYPersistir: jest.fn().mockResolvedValue(undefined),
    };

    mockConfig = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        const values: Record<string, string> = {
          SMTP_HOST: 'smtp.example.com',
          SMTP_USER: 'user@example.com',
          SMTP_PASS: 'secret',
          SMTP_FROM: 'noreply@clinical.com',
        };
        return values[key] ?? defaultValue;
      }),
    };

    scheduler = new CaeaPrefetchScheduler(
      mockPrisma,
      mockCaeaService,
      mockConfig,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // CAEA-01: prefetchAllTenants
  // ---------------------------------------------------------------------------

  describe('prefetchAllTenants', () => {
    it('Test 1: calls solicitarYPersistir for each ConfiguracionAFIP tenant', async () => {
      mockPrisma.configuracionAFIP.findMany.mockResolvedValue([
        { profesionalId: 'p1' },
        { profesionalId: 'p2' },
      ]);
      // checkDeadlines() is called internally — stub it out
      mockPrisma.caeaVigente.findMany.mockResolvedValue([]);

      await scheduler.prefetchAllTenants();

      expect(mockCaeaService.solicitarYPersistir).toHaveBeenCalledTimes(2);
      expect(mockCaeaService.solicitarYPersistir).toHaveBeenCalledWith(
        'p1',
        expect.any(String),
        expect.any(Number),
      );
      expect(mockCaeaService.solicitarYPersistir).toHaveBeenCalledWith(
        'p2',
        expect.any(String),
        expect.any(Number),
      );
    });

    it('Test 2: logs error but continues if one tenant fails', async () => {
      mockPrisma.configuracionAFIP.findMany.mockResolvedValue([
        { profesionalId: 'p1' },
        { profesionalId: 'p2' },
      ]);
      mockCaeaService.solicitarYPersistir
        .mockRejectedValueOnce(new AfipTransientError('AFIP down'))
        .mockResolvedValueOnce(undefined);
      mockPrisma.caeaVigente.findMany.mockResolvedValue([]);

      // Should NOT throw
      await expect(scheduler.prefetchAllTenants()).resolves.toBeUndefined();

      expect(mockCaeaService.solicitarYPersistir).toHaveBeenCalledTimes(2);
    });
  });

  // ---------------------------------------------------------------------------
  // CAEA-04: checkDeadlines
  // ---------------------------------------------------------------------------

  describe('checkDeadlines', () => {
    it('Test 3: sends email when daysUntilDeadline <= 2 AND pendingCount > 0', async () => {
      const fchTopeInf = afipDateInDays(1); // 1 day from now → daysUntilDeadline ≈ 1
      mockPrisma.caeaVigente.findMany.mockResolvedValue([
        {
          profesionalId: 'p1',
          cuit: '20123456789',
          fchTopeInf,
          profesional: {
            usuario: { email: 'a@b.com' },
            configClinica: null,
          },
        },
      ]);
      mockPrisma.factura.count.mockResolvedValue(3);

      await scheduler.checkDeadlines();

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const callArg = mockSendMail.mock.calls[0][0];
      expect(callArg.subject).toMatch(/CAEA/);
      expect(callArg.to).toBe('a@b.com');
    });

    it('Test 4: does NOT send email when pendingCount === 0', async () => {
      const fchTopeInf = afipDateInDays(1);
      mockPrisma.caeaVigente.findMany.mockResolvedValue([
        {
          profesionalId: 'p1',
          cuit: '20123456789',
          fchTopeInf,
          profesional: {
            usuario: { email: 'a@b.com' },
            configClinica: null,
          },
        },
      ]);
      mockPrisma.factura.count.mockResolvedValue(0);

      await scheduler.checkDeadlines();

      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('Test 5: does NOT send email when daysUntilDeadline > 2', async () => {
      const fchTopeInf = afipDateInDays(5); // 5 days from now
      mockPrisma.caeaVigente.findMany.mockResolvedValue([
        {
          profesionalId: 'p1',
          cuit: '20123456789',
          fchTopeInf,
          profesional: {
            usuario: { email: 'a@b.com' },
            configClinica: null,
          },
        },
      ]);
      mockPrisma.factura.count.mockResolvedValue(5);

      await scheduler.checkDeadlines();

      expect(mockSendMail).not.toHaveBeenCalled();
    });
  });
});
