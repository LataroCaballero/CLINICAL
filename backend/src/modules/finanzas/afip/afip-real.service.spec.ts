/**
 * AfipRealService unit tests — Plan 02 implementation + Phase 15 QR extension
 *
 * Coverage:
 *   CAE-02: FECAESolicitar SOAP called correctly, advisory lock acquired, CAE+nroComprobante persisted
 *   CAE-03: Error 10242 → AfipBusinessError → spanishMessage in human-readable Spanish
 *   QR-01: qrData computed from CAE result + factura fields and persisted in same factura.update
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AfipRealService, EmitirComprobanteRealParams } from './afip-real.service';
import { AfipBusinessError } from './afip.errors';
import { WSAA_SERVICE } from '../../wsaa/wsaa.constants';
import { PrismaService } from '../../../prisma/prisma.service';

// Mock axios module-wide
jest.mock('axios');
import axios from 'axios';
const mockAxiosPost = axios.post as jest.MockedFunction<typeof axios.post>;

// --- XML fixtures ---

const ULTIMO_AUTORIZADO_XML = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <FECompUltimoAutorizadoResponse>
      <CbteNro>42</CbteNro>
    </FECompUltimoAutorizadoResponse>
  </soapenv:Body>
</soapenv:Envelope>`;

const FECAE_APPROVED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <FECAESolicitarResponse>
      <Resultado>A</Resultado>
      <CAE>74397704790943</CAE>
      <CAEFchVto>20260323</CAEFchVto>
      <CbteDesde>43</CbteDesde>
      <CbteHasta>43</CbteHasta>
    </FECAESolicitarResponse>
  </soapenv:Body>
</soapenv:Envelope>`;

const FECAE_REJECTED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <FECAESolicitarResponse>
      <Resultado>R</Resultado>
      <Msg>Obs 10242: El campo Condicion IVA receptor es requerido</Msg>
    </FECAESolicitarResponse>
  </soapenv:Body>
</soapenv:Envelope>`;

// --- Mock factories ---

const mockTicket = { token: 'tok', sign: 'sig', expiresAt: new Date() };
const mockConfig = { cuit: '20123456789', ptoVta: 1, ambiente: 'HOMOLOGACION' };
const mockFacturaFields = {
  moneda: 'ARS',
  tipoCambio: 1.0,
  total: 1210.00,
  cuit: null,
};

function buildMockPrisma(overrides: Record<string, any> = {}) {
  const mockQueryRawUnsafe = jest.fn().mockResolvedValue(undefined);
  const mockFacturaUpdate = jest.fn().mockResolvedValue({});
  const mockAfipConfigFindUniqueOrThrow = jest.fn().mockResolvedValue(mockConfig);
  const mockFacturaFindUniqueOrThrow = jest.fn().mockResolvedValue(mockFacturaFields);

  const mockTx = {
    $queryRawUnsafe: mockQueryRawUnsafe,
    factura: { update: mockFacturaUpdate },
    configuracionAFIP: { findUniqueOrThrow: mockAfipConfigFindUniqueOrThrow },
  };

  const mockTransaction = jest.fn().mockImplementation(async (fn: (tx: any) => Promise<any>) => fn(mockTx));

  return {
    $transaction: mockTransaction,
    configuracionAFIP: { findUniqueOrThrow: mockAfipConfigFindUniqueOrThrow },
    factura: { findUniqueOrThrow: mockFacturaFindUniqueOrThrow },
    mockQueryRawUnsafe,
    mockFacturaUpdate,
    mockAfipConfigFindUniqueOrThrow,
    mockFacturaFindUniqueOrThrow,
    ...overrides,
  };
}

function buildBaseParams(): EmitirComprobanteRealParams {
  return {
    cuitEmisor: '20123456789',
    puntoVenta: 1,
    tipoComprobante: 6,
    cbteDesde: 0,
    cbteHasta: 0,
    importeTotal: 121,
    importeNeto: 100,
    importeIVA: 21,
    concepto: 2,
    docTipo: 96,
    docNro: '12345678',
    profesionalId: 'prof-uuid-123',
    facturaId: 'fact-uuid-456',
    condicionIVAReceptorId: 5,
    fecha: new Date('2026-03-20'),
  };
}

async function buildService(mockPrisma: any) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AfipRealService,
      {
        provide: WSAA_SERVICE,
        useValue: { getTicket: jest.fn().mockResolvedValue(mockTicket) },
      },
      {
        provide: PrismaService,
        useValue: mockPrisma,
      },
      {
        provide: ConfigService,
        useValue: { get: jest.fn().mockReturnValue(undefined) },
      },
    ],
  }).compile();

  return module.get<AfipRealService>(AfipRealService);
}

describe('AfipRealService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // CAE-02: Happy path
  it('calls FECAESolicitar with correct SOAP envelope and returns CAE 14 digits', async () => {
    const mockPrisma = buildMockPrisma();
    mockAxiosPost
      .mockResolvedValueOnce({ data: ULTIMO_AUTORIZADO_XML }) // FECompUltimoAutorizado
      .mockResolvedValueOnce({ data: FECAE_APPROVED_XML });   // FECAESolicitar

    const service = await buildService(mockPrisma);
    const result = await service.emitirComprobante(buildBaseParams());

    expect(result.cae).toBe('74397704790943');
    expect(result.cae).toHaveLength(14);
    expect(result.resultado).toBe('A');
  });

  // CAE-02: Advisory lock + sequence
  it('acquires pg_advisory_xact_lock before calling FECAESolicitar', async () => {
    const mockPrisma = buildMockPrisma();
    mockAxiosPost
      .mockResolvedValueOnce({ data: ULTIMO_AUTORIZADO_XML })
      .mockResolvedValueOnce({ data: FECAE_APPROVED_XML });

    const service = await buildService(mockPrisma);
    await service.emitirComprobante(buildBaseParams());

    expect(mockPrisma.mockQueryRawUnsafe).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      '20123456789:1:6',
    );
    expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { timeout: 45000 });
  });

  // CAE-02: Persistence — now includes qrData
  it('persists CAE, caeFchVto, nroComprobante, ptoVta, estado=EMITIDA, qrData on Factura after successful emission', async () => {
    const mockPrisma = buildMockPrisma();
    mockAxiosPost
      .mockResolvedValueOnce({ data: ULTIMO_AUTORIZADO_XML })
      .mockResolvedValueOnce({ data: FECAE_APPROVED_XML });

    const service = await buildService(mockPrisma);
    await service.emitirComprobante(buildBaseParams());

    expect(mockPrisma.mockFacturaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'fact-uuid-456' },
        data: expect.objectContaining({
          cae: '74397704790943',
          caeFchVto: '20260323',
          nroComprobante: 43,
          ptoVta: 1,
          estado: 'EMITIDA',
        }),
      }),
    );
  });

  // CAE-02: getUltimoAutorizado
  it('calls FECompUltimoAutorizado and uses lastNro+1 as cbteDesde', async () => {
    const mockPrisma = buildMockPrisma();
    mockAxiosPost
      .mockResolvedValueOnce({ data: ULTIMO_AUTORIZADO_XML }) // returns CbteNro=42
      .mockResolvedValueOnce({ data: FECAE_APPROVED_XML });   // expects cbteDesde=43

    const service = await buildService(mockPrisma);
    const result = await service.emitirComprobante(buildBaseParams());

    // FECAESolicitar should have cbteDesde=43 in the envelope (lastNro 42 + 1)
    const fecaeSoapCall = mockAxiosPost.mock.calls[1];
    const envelope = fecaeSoapCall[1] as string;
    expect(envelope).toContain('<ar:CbteDesde>43</ar:CbteDesde>');
    expect(result.cbtDesde).toBe(43);
  });

  // CAE-03: Business error translation
  it('throws AfipBusinessError with Spanish message when resultado=R', async () => {
    const mockPrisma = buildMockPrisma();
    mockAxiosPost
      .mockResolvedValueOnce({ data: ULTIMO_AUTORIZADO_XML })
      .mockResolvedValueOnce({ data: FECAE_REJECTED_XML });

    const service = await buildService(mockPrisma);

    await expect(service.emitirComprobante(buildBaseParams())).rejects.toThrow(AfipBusinessError);
  });

  // CAE-03: Error 10242 specific translation
  it('AfipBusinessError.spanishMessage for code 10242 mentions condicion IVA', async () => {
    const mockPrisma = buildMockPrisma();
    mockAxiosPost
      .mockResolvedValueOnce({ data: ULTIMO_AUTORIZADO_XML })
      .mockResolvedValueOnce({ data: FECAE_REJECTED_XML });

    const service = await buildService(mockPrisma);

    let caughtError: AfipBusinessError | undefined;
    try {
      await service.emitirComprobante(buildBaseParams());
    } catch (err) {
      if (err instanceof AfipBusinessError) caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError!.spanishMessage).toMatch(/IVA|condición/i);
    expect(caughtError!.spanishMessage).toContain('condición de IVA');
  });

  // QR-01: qrData persisted after successful CAE
  it('QR-01: factura.update is called with qrData starting with AFIP QR base URL', async () => {
    const mockPrisma = buildMockPrisma();
    mockAxiosPost
      .mockResolvedValueOnce({ data: ULTIMO_AUTORIZADO_XML })
      .mockResolvedValueOnce({ data: FECAE_APPROVED_XML });

    const service = await buildService(mockPrisma);
    await service.emitirComprobante(buildBaseParams());

    const updateCall = mockPrisma.mockFacturaUpdate.mock.calls[0][0];
    expect(updateCall.data.qrData).toMatch(/^https:\/\/www\.afip\.gob\.ar\/fe\/qr\/\?p=/);
  });

  // QR-01: qrData decoded base64 contains emisor CUIT as number
  it('QR-01: decoded qrData base64 contains cfg.cuit as a number', async () => {
    const mockPrisma = buildMockPrisma();
    mockAxiosPost
      .mockResolvedValueOnce({ data: ULTIMO_AUTORIZADO_XML })
      .mockResolvedValueOnce({ data: FECAE_APPROVED_XML });

    const service = await buildService(mockPrisma);
    await service.emitirComprobante(buildBaseParams());

    const updateCall = mockPrisma.mockFacturaUpdate.mock.calls[0][0];
    const qrUrl: string = updateCall.data.qrData;
    const b64 = qrUrl.replace('https://www.afip.gob.ar/fe/qr/?p=', '');
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));

    // cfg.cuit = '20123456789' → must be number 20123456789 in payload
    expect(payload.cuit).toBe(20123456789);
    expect(typeof payload.cuit).toBe('number');
  });
});
