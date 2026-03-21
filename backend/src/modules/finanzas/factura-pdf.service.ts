/**
 * FacturaPdfService — Phase 15, Plan 01
 *
 * Generates PDF invoices with embedded QR AFIP per RG 5616/2024.
 *
 * Exports:
 *   - AfipQrPayload (interface)
 *   - buildAfipQrUrl(payload): string — produces AFIP QR URL with base64-encoded JSON
 *   - toAfipMonedaCodigo(m): string — maps ARS→PES, USD→DOL
 *   - FacturaPdfData (interface)
 *   - FacturaPdfService — NestJS injectable service
 */

import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';

// ---- RG 5616/2024 QR Payload ----

export interface AfipQrPayload {
  ver: number;        // 1
  fecha: string;      // 'YYYY-MM-DD'
  cuit: number;       // CUIT del emisor como entero (sin guiones)
  ptoVta: number;
  tipoCmp: number;    // 1=FactA, 6=FactB, 11=FactC
  nroCmp: number;
  importe: number;
  moneda: string;     // 'PES' para ARS, 'DOL' para USD
  ctz: number;        // 1 para ARS
  tipoDocRec: number; // 80=CUIT, 96=DNI, 99=SIN_ID
  nroDocRec: number;
  tipoCodAut: string; // 'E' = CAE
  codAut: number;     // CAE como número (14 dígitos)
}

/**
 * buildAfipQrUrl — Serializa el payload a base64 y lo prepende a la URL AFIP.
 * Los valores numéricos se emiten como JSON numbers (no strings).
 */
export function buildAfipQrUrl(payload: AfipQrPayload): string {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json, 'utf-8').toString('base64');
  return `https://www.afip.gob.ar/fe/qr/?p=${b64}`;
}

/**
 * toAfipMonedaCodigo — Convierte el código de moneda del sistema al código AFIP.
 * AFIP usa 'PES' para ARS y 'DOL' para USD (no los estándares ISO 4217).
 */
export function toAfipMonedaCodigo(m: string): string {
  if (m === 'USD') return 'DOL';
  return 'PES'; // ARS y cualquier otro → PES por defecto
}

// ---- PDF Data ----

export interface FacturaPdfData {
  id: string;
  numero: string;          // Ej: '00001-00000001'
  fecha: string;           // 'YYYY-MM-DD'
  tipo: string;            // Ej: 'Factura B'
  cae: string;
  caeFchVto: string;       // 'YYYYMMDD'
  nroComprobante: number;
  qrData: string;          // URL AFIP QR (output de buildAfipQrUrl)
  total: number;
  subtotal: number;
  impuestos: number;
  moneda: string;          // 'ARS' | 'USD'
  tipoCambio: number;
  razonSocial: string | null;
  cuit: string | null;
  concepto: string | null;
  profesional: { nombre: string; apellido: string };
  config?: {
    nombreClinica?: string | null;
    direccion?: string | null;
    telefono?: string | null;
  };
}

// ---- Helper ----

function formatCaeFchVto(yyyymmdd: string): string {
  // '20260330' → '30/03/2026'
  if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd;
  const dd = yyyymmdd.slice(6, 8);
  const mm = yyyymmdd.slice(4, 6);
  const yyyy = yyyymmdd.slice(0, 4);
  return `${dd}/${mm}/${yyyy}`;
}

// ---- Service ----

@Injectable()
export class FacturaPdfService {
  async generatePdfBuffer(data: FacturaPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.buildContent(doc, data).then(() => doc.end()).catch(reject);
    });
  }

  private async buildContent(doc: PDFKit.PDFDocument, data: FacturaPdfData): Promise<void> {
    // Header
    const clinicaNombre = data.config?.nombreClinica ?? 'Clínica';
    doc.fontSize(18).font('Helvetica-Bold').text(clinicaNombre, { align: 'center' });
    doc.moveDown(0.5);

    if (data.config?.direccion) {
      doc.fontSize(10).font('Helvetica').text(data.config.direccion, { align: 'center' });
    }
    if (data.config?.telefono) {
      doc.fontSize(10).text(`Tel: ${data.config.telefono}`, { align: 'center' });
    }
    doc.moveDown(1);

    // Comprobante info
    doc.fontSize(14).font('Helvetica-Bold').text(`${data.tipo} N° ${data.numero}`);
    doc.fontSize(10).font('Helvetica').text(`Fecha: ${data.fecha}`);
    doc.moveDown(0.5);

    // Profesional
    doc.text(`Profesional: ${data.profesional.nombre} ${data.profesional.apellido}`);
    doc.moveDown(0.5);

    // Receptor
    if (data.razonSocial) {
      doc.text(`Razón Social: ${data.razonSocial}`);
    }
    if (data.cuit) {
      doc.text(`CUIT: ${data.cuit}`);
    }
    doc.moveDown(1);

    // Concepto
    if (data.concepto) {
      doc.fontSize(11).font('Helvetica-Bold').text('Concepto:');
      doc.fontSize(10).font('Helvetica').text(data.concepto);
      doc.moveDown(0.5);
    }

    // Montos
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica-Bold').text('Montos:');
    doc.fontSize(10).font('Helvetica');

    const monedaSym = data.moneda === 'USD' ? 'USD' : '$';
    doc.text(`Subtotal: ${monedaSym} ${data.subtotal.toFixed(2)}`);
    doc.text(`Impuestos: ${monedaSym} ${data.impuestos.toFixed(2)}`);
    doc.fontSize(12).font('Helvetica-Bold').text(`Total: ${monedaSym} ${data.total.toFixed(2)}`);

    if (data.moneda === 'USD') {
      doc.fontSize(9).font('Helvetica').text(`Tipo de cambio: ${data.tipoCambio}`);
    }

    doc.moveDown(1);

    // AFIP section with QR
    await this.buildAfipSection(doc, data);
  }

  private async buildAfipSection(doc: PDFKit.PDFDocument, data: FacturaPdfData): Promise<void> {
    doc.fontSize(11).font('Helvetica-Bold').text('Comprobante AFIP');
    doc.moveDown(0.3);

    const sectionY = doc.y;

    // Generate QR PNG
    const qrBuffer = await QRCode.toBuffer(data.qrData, {
      errorCorrectionLevel: 'M',
      width: 100,
      margin: 1,
    });

    // Embed QR image
    doc.image(qrBuffer, 50, sectionY + 10, { width: 80, height: 80 });

    // CAE details to the right of QR
    doc.fontSize(8).font('Helvetica');
    doc.text(`CAE: ${data.cae}`, 145, sectionY + 10);
    doc.text(`Vto. CAE: ${formatCaeFchVto(data.caeFchVto)}`, 145, sectionY + 24);
    doc.text('Comprobante emitido via AFIP WSFEv1', 145, sectionY + 38);

    // Move past QR block
    doc.moveDown(5);
  }
}
