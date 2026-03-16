import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CertExpiryScheduler } from './cert-expiry.scheduler';

jest.mock('nodemailer');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodemailer = require('nodemailer');

describe('CertExpiryScheduler', () => {
  let scheduler: CertExpiryScheduler;
  let prisma: { configuracionAFIP: { findMany: jest.Mock } };
  let configService: { get: jest.Mock };
  let sendMailMock: jest.Mock;
  let module: TestingModule;

  const makeConfig = (daysLeft: number, configClinicaOverride?: any) => {
    const now = new Date();
    const certExpiresAt = new Date(now.getTime() + daysLeft * 24 * 60 * 60 * 1000);
    return {
      cuit: '20123456789',
      ambiente: 'HOMOLOGACION',
      certExpiresAt,
      profesional: {
        usuario: { email: 'admin@clinic.com' },
        configClinica:
          configClinicaOverride !== undefined
            ? configClinicaOverride
            : {
                smtpHost: 'smtp.example.com',
                smtpPort: 587,
                smtpUser: 'user',
                smtpFrom: 'from@example.com',
              },
      },
    };
  };

  beforeEach(async () => {
    sendMailMock = jest.fn().mockResolvedValue({});
    nodemailer.createTransport.mockReturnValue({ sendMail: sendMailMock });

    prisma = { configuracionAFIP: { findMany: jest.fn() } };
    configService = {
      get: jest.fn((key: string, def?: any) => {
        const map: Record<string, any> = {
          SMTP_HOST: 'smtp.example.com',
          SMTP_PORT: 587,
          SMTP_USER: 'user',
          SMTP_PASS: 'pass',
          SMTP_FROM: 'noreply@clinical.com',
        };
        return map[key] ?? def;
      }),
    };

    module = await Test.createTestingModule({
      providers: [
        CertExpiryScheduler,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    scheduler = module.get<CertExpiryScheduler>(CertExpiryScheduler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkCertExpiry', () => {
    it('CERT-03: sends alert when daysLeft === 60', async () => {
      prisma.configuracionAFIP.findMany.mockResolvedValue([makeConfig(60)]);
      await scheduler.checkCertExpiry();
      expect(sendMailMock).toHaveBeenCalledTimes(1);
      expect(sendMailMock.mock.calls[0][0].subject).toContain('60');
    });

    it('CERT-03: sends alert when daysLeft === 30', async () => {
      prisma.configuracionAFIP.findMany.mockResolvedValue([makeConfig(30)]);
      await scheduler.checkCertExpiry();
      expect(sendMailMock).toHaveBeenCalledTimes(1);
      expect(sendMailMock.mock.calls[0][0].subject).toContain('30');
    });

    it('CERT-03: does NOT send alert when daysLeft === 45', async () => {
      prisma.configuracionAFIP.findMany.mockResolvedValue([makeConfig(45)]);
      await scheduler.checkCertExpiry();
      expect(sendMailMock).not.toHaveBeenCalled();
    });

    it('CERT-03: sends alert (URGENTE) when daysLeft <= 5', async () => {
      prisma.configuracionAFIP.findMany.mockResolvedValue([makeConfig(3)]);
      await scheduler.checkCertExpiry();
      expect(sendMailMock).toHaveBeenCalledTimes(1);
      expect(sendMailMock.mock.calls[0][0].subject).toContain('URGENTE');
      expect(sendMailMock.mock.calls[0][0].subject).toContain('3');
    });

    it('CERT-03: does not call sendMail when SMTP is not configured', async () => {
      // ConfigClinica is null and env vars are undefined
      prisma.configuracionAFIP.findMany.mockResolvedValue([
        makeConfig(30, null), // null configClinica
      ]);
      // Override ConfigService to return undefined for SMTP vars
      configService.get.mockReturnValue(undefined);
      await scheduler.checkCertExpiry();
      expect(sendMailMock).not.toHaveBeenCalled();
    });
  });
});
