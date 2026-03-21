/**
 * FacturaPdfService unit tests — Plan 15-01 (QR-01)
 *
 * Coverage:
 *   QR-01: buildAfipQrUrl produces valid RG 5616/2024 compliant URL
 *   QR-01: toAfipMonedaCodigo maps ARS→PES, USD→DOL
 *   QR-01: FacturaPdfService.generatePdfBuffer returns non-empty Buffer with QR embedded
 */

import { buildAfipQrUrl, toAfipMonedaCodigo, FacturaPdfService, AfipQrPayload, FacturaPdfData } from './factura-pdf.service';
import * as QRCode from 'qrcode';

// Mock QRCode to avoid PNG rendering in unit tests
jest.mock('qrcode');
const mockQrCodeToBuffer = QRCode.toBuffer as jest.MockedFunction<typeof QRCode.toBuffer>;

const SAMPLE_PAYLOAD: AfipQrPayload = {
  ver: 1,
  fecha: '2026-03-21',
  cuit: 20123456789,
  ptoVta: 1,
  tipoCmp: 6,
  nroCmp: 1,
  importe: 1210.00,
  moneda: 'PES',
  ctz: 1,
  tipoDocRec: 99,
  nroDocRec: 0,
  tipoCodAut: 'E',
  codAut: 74397704790943,
};

describe('buildAfipQrUrl', () => {
  it('Test 1: produces URL starting with https://www.afip.gob.ar/fe/qr/?p=', () => {
    const url = buildAfipQrUrl(SAMPLE_PAYLOAD);
    expect(url).toMatch(/^https:\/\/www\.afip\.gob\.ar\/fe\/qr\/\?p=/);
  });

  it('Test 2: decoded base64 parses as valid JSON with exactly 13 keys', () => {
    const url = buildAfipQrUrl(SAMPLE_PAYLOAD);
    const b64 = url.replace('https://www.afip.gob.ar/fe/qr/?p=', '');
    const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
    expect(Object.keys(json)).toHaveLength(13);
  });

  it('Test 3: cuit, nroCmp, codAut are JSON numbers (not strings)', () => {
    const url = buildAfipQrUrl(SAMPLE_PAYLOAD);
    const b64 = url.replace('https://www.afip.gob.ar/fe/qr/?p=', '');
    const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
    expect(typeof json.cuit).toBe('number');
    expect(typeof json.nroCmp).toBe('number');
    expect(typeof json.codAut).toBe('number');
  });

  it('Test 4: moneda field in payload is PES (not ARS) for ARS invoices', () => {
    const url = buildAfipQrUrl({ ...SAMPLE_PAYLOAD, moneda: 'PES' });
    const b64 = url.replace('https://www.afip.gob.ar/fe/qr/?p=', '');
    const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
    expect(json.moneda).toBe('PES');
  });
});

describe('toAfipMonedaCodigo', () => {
  it('Test 4a: toAfipMonedaCodigo("ARS") returns "PES"', () => {
    expect(toAfipMonedaCodigo('ARS')).toBe('PES');
  });

  it('Test 4b: toAfipMonedaCodigo("USD") returns "DOL"', () => {
    expect(toAfipMonedaCodigo('USD')).toBe('DOL');
  });
});

describe('FacturaPdfService', () => {
  let service: FacturaPdfService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FacturaPdfService();
    // Return a valid 1x1 transparent PNG buffer
    // Generated via: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
    const fakePng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    );
    (mockQrCodeToBuffer as jest.Mock).mockResolvedValue(fakePng);
  });

  it('Test 5: generatePdfBuffer returns non-empty Buffer when qrData is present', async () => {
    const data: FacturaPdfData = {
      id: 'fact-uuid-001',
      numero: '00001-00000001',
      fecha: '2026-03-21',
      tipo: 'Factura B',
      cae: '74397704790943',
      caeFchVto: '20260330',
      nroComprobante: 1,
      qrData: buildAfipQrUrl(SAMPLE_PAYLOAD),
      total: 1210.00,
      subtotal: 1000.00,
      impuestos: 210.00,
      moneda: 'ARS',
      tipoCambio: 1,
      razonSocial: null,
      cuit: null,
      concepto: 'Honorarios médicos',
      profesional: { nombre: 'Juan', apellido: 'Pérez' },
      config: { nombreClinica: 'Clínica Test', direccion: null, telefono: null },
    };

    const buffer = await service.generatePdfBuffer(data);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
