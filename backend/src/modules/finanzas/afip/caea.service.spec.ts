import { Logger } from '@nestjs/common';
import { CaeaService } from './caea.service';
import { AfipBusinessError, AfipTransientError } from './afip.errors';
import { EstadoFactura } from '@prisma/client';

// Mock axios at module level
jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CaeaService', () => {
  let service: CaeaService;
  let mockPrisma: any;
  let mockWsaaService: any;
  let mockConfig: any;
  let mockLogger: any;

  beforeEach(() => {
    mockWsaaService = {
      getTicket: jest.fn().mockResolvedValue({ token: 'tok', sign: 'sig' }),
    };

    mockPrisma = {
      configuracionAFIP: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          cuit: '20123456789',
          ptoVta: 1,
          ambiente: 'HOMO',
        }),
      },
      caeaVigente: {
        upsert: jest.fn().mockResolvedValue({}),
        findFirst: jest.fn(),
      },
      factura: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    mockConfig = {
      get: jest.fn((key: string, defaultValue: string) => defaultValue),
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    service = new CaeaService(mockWsaaService, mockPrisma, mockConfig);
    // Inject mock logger to avoid console output in tests
    (service as any).logger = mockLogger;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('solicitarYPersistir', () => {
    const successXml = `
      <?xml version="1.0"?>
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
        <soapenv:Body>
          <FECAEASolicitarResponse>
            <FECAEASolicitarResult>
              <ResultGet>
                <CAEA>12345678901234</CAEA>
                <Periodo>202601</Periodo>
                <Orden>1</Orden>
                <FchVigDesde>20260101</FchVigDesde>
                <FchVigHasta>20260115</FchVigHasta>
                <FchTopeInf>20260123</FchTopeInf>
              </ResultGet>
              <Resultado>A</Resultado>
            </FECAEASolicitarResult>
          </FECAEASolicitarResponse>
        </soapenv:Body>
      </soapenv:Envelope>
    `;

    it('Test 1: calls FECAEASolicitar SOAP and upserts CaeaVigente with correct caea code', async () => {
      mockedAxios.post = jest.fn().mockResolvedValue({ data: successXml });

      await service.solicitarYPersistir('prof-1', '202601', 1);

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockPrisma.caeaVigente.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            profesionalId_periodo_orden: {
              profesionalId: 'prof-1',
              periodo: '202601',
              orden: 1,
            },
          },
          create: expect.objectContaining({ caea: '12345678901234' }),
          update: expect.objectContaining({ caea: '12345678901234' }),
        }),
      );
    });

    it('Test 2: Resultado=R throws AfipBusinessError', async () => {
      const rejectedXml = `
        <?xml version="1.0"?>
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
          <soapenv:Body>
            <FECAEASolicitarResponse>
              <FECAEASolicitarResult>
                <Resultado>R</Resultado>
                <Errors><Err><Msg>Error periodo incorrecto</Msg></Err></Errors>
              </FECAEASolicitarResult>
            </FECAEASolicitarResponse>
          </soapenv:Body>
        </soapenv:Envelope>
      `;
      mockedAxios.post = jest.fn().mockResolvedValue({ data: rejectedXml });

      await expect(
        service.solicitarYPersistir('prof-1', '202601', 1),
      ).rejects.toBeInstanceOf(AfipBusinessError);
    });

    it('Test 3: axios timeout throws AfipTransientError', async () => {
      mockedAxios.post = jest
        .fn()
        .mockRejectedValue(new Error('timeout of 30000ms exceeded'));

      await expect(
        service.solicitarYPersistir('prof-1', '202601', 1),
      ).rejects.toBeInstanceOf(AfipTransientError);
    });
  });

  describe('asignarCaeaFallback', () => {
    it('Test 4: assigns CAEA_PENDIENTE_INFORMAR when CaeaVigente found', async () => {
      mockPrisma.caeaVigente.findFirst.mockResolvedValue({
        caea: '12345678901234',
        fchTopeInf: '20260123',
        fchVigDesde: '20260101',
        fchVigHasta: '20260115',
      });

      await service.asignarCaeaFallback('factura-1', 'prof-1');

      expect(mockPrisma.factura.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'factura-1' },
          data: expect.objectContaining({
            cae: '12345678901234',
            estado: EstadoFactura.CAEA_PENDIENTE_INFORMAR,
            cbteFchHsGen: expect.any(String),
          }),
        }),
      );
    });

    it('Test 5: resolves without throwing when no CaeaVigente; factura.update NOT called; logger.error called', async () => {
      mockPrisma.caeaVigente.findFirst.mockResolvedValue(null);

      await expect(
        service.asignarCaeaFallback('factura-1', 'prof-1'),
      ).resolves.not.toThrow();

      expect(mockPrisma.factura.update).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('informarFactura', () => {
    it('stub throws Not implemented error', async () => {
      await expect(
        service.informarFactura('factura-1', 'prof-1'),
      ).rejects.toThrow('Not implemented');
    });
  });
});
