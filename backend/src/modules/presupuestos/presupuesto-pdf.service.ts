import { Injectable, Logger } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import axios from 'axios';

export interface PresupuestoPdfData {
  id: string;
  moneda: string;
  fechaValidez?: Date | null;
  createdAt: Date;
  items: { descripcion: string; precioTotal: number }[];
  subtotal: number;
  descuentos: number;
  total: number;
  notaCoordinador?: string;
  paciente: {
    nombreCompleto: string;
    dni?: string | null;
    email?: string | null;
    telefono?: string | null;
  };
  config: {
    nombreClinica?: string | null;
    logoUrl?: string | null;
    direccion?: string | null;
    telefono?: string | null;
    emailContacto?: string | null;
    web?: string | null;
    piePaginaTexto?: string | null;
  };
  profesional: {
    nombre: string;
    apellido: string;
  };
}

@Injectable()
export class PresupuestoPdfService {
  private readonly logger = new Logger(PresupuestoPdfService.name);

  async generatePdfBuffer(data: PresupuestoPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.buildContent(doc, data).then(() => doc.end()).catch(reject);
    });
  }

  private async buildContent(doc: PDFKit.PDFDocument, data: PresupuestoPdfData) {
    await this.buildHeader(doc, data);
    this.buildPatientSection(doc, data.paciente);
    this.buildItemsTable(doc, data.items, data.moneda);
    this.buildTotals(doc, data);
    this.buildFooter(doc, data.config, data.notaCoordinador);
  }

  private async buildHeader(doc: PDFKit.PDFDocument, data: PresupuestoPdfData) {
    const { config, profesional } = data;
    let currentX = 50;

    // Logo (optional, fetch as buffer)
    if (config.logoUrl) {
      try {
        const resp = await axios.get(config.logoUrl, { responseType: 'arraybuffer', timeout: 5000 });
        const logoBuffer = Buffer.from(resp.data);
        doc.image(logoBuffer, currentX, 50, { width: 70, height: 70 });
        currentX += 90;
      } catch {
        this.logger.warn('No se pudo cargar el logo de la clínica');
      }
    }

    // Clinic + profesional info
    doc.fontSize(18).font('Helvetica-Bold')
       .text(config.nombreClinica ?? 'Clínica', currentX, 50);
    doc.fontSize(10).font('Helvetica')
       .text(`Dr/a. ${profesional.nombre} ${profesional.apellido}`, currentX, 72);
    if (config.direccion) doc.text(config.direccion, currentX, 86);
    if (config.telefono) doc.text(`Tel: ${config.telefono}`, currentX, config.direccion ? 100 : 86);
    if (config.emailContacto) doc.text(config.emailContacto, currentX, 114);
    if (config.web) doc.text(config.web, currentX, 128);

    // Date and ID
    const fechaStr = new Date(data.createdAt).toLocaleDateString('es-AR');
    doc.fontSize(9).font('Helvetica').fillColor('#666666')
       .text(`Fecha: ${fechaStr}`, 400, 50, { align: 'right', width: 145 });
    doc.text(`Nro: ${data.id.slice(0, 8).toUpperCase()}`, 400, 64, { align: 'right', width: 145 });
    if (data.fechaValidez) {
      const validezStr = new Date(data.fechaValidez).toLocaleDateString('es-AR');
      doc.text(`Válido hasta: ${validezStr}`, 400, 78, { align: 'right', width: 145 });
    }
    doc.fillColor('#000000');

    doc.moveTo(50, 155).lineTo(545, 155).strokeColor('#dddddd').stroke();
    doc.moveDown(2);
  }

  private buildPatientSection(doc: PDFKit.PDFDocument, paciente: PresupuestoPdfData['paciente']) {
    doc.fontSize(11).font('Helvetica-Bold').text('DATOS DEL PACIENTE', 50, 170);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Nombre: ${paciente.nombreCompleto}`, 50, 188);
    if (paciente.dni) doc.text(`DNI: ${paciente.dni}`, 50, 202);
    if (paciente.email) doc.text(`Email: ${paciente.email}`, 50, 216);
    if (paciente.telefono) doc.text(`Teléfono: ${paciente.telefono}`, 50, 230);

    doc.moveTo(50, 248).lineTo(545, 248).strokeColor('#dddddd').stroke();
  }

  private buildItemsTable(doc: PDFKit.PDFDocument, items: PresupuestoPdfData['items'], moneda: string) {
    const simbolo = moneda === 'USD' ? 'U$S' : '$';
    let y = 265;

    // Table header
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333');
    doc.text('PROCEDIMIENTO', 50, y);
    doc.text('TOTAL', 450, y, { align: 'right', width: 95 });
    doc.moveTo(50, y + 16).lineTo(545, y + 16).strokeColor('#333333').lineWidth(0.5).stroke();
    doc.lineWidth(1);

    y += 25;
    doc.font('Helvetica').fillColor('#000000');

    items.forEach((item) => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      doc.fontSize(10).text(item.descripcion, 50, y, { width: 380 });
      doc.text(`${simbolo} ${item.precioTotal.toLocaleString('es-AR')}`, 450, y, { align: 'right', width: 95 });
      y += 20;
    });

    doc.moveTo(50, y + 4).lineTo(545, y + 4).strokeColor('#dddddd').stroke();
    this._lastItemY = y + 15;
  }

  private _lastItemY = 380;

  private buildTotals(doc: PDFKit.PDFDocument, data: PresupuestoPdfData) {
    const simbolo = data.moneda === 'USD' ? 'U$S' : '$';
    let y = this._lastItemY;

    doc.fontSize(10).font('Helvetica');
    doc.text('Subtotal:', 380, y);
    doc.text(`${simbolo} ${data.subtotal.toLocaleString('es-AR')}`, 450, y, { align: 'right', width: 95 });
    y += 18;

    if (data.descuentos > 0) {
      doc.fillColor('#16a34a');
      doc.text('Descuento:', 380, y);
      doc.text(`- ${simbolo} ${data.descuentos.toLocaleString('es-AR')}`, 450, y, { align: 'right', width: 95 });
      doc.fillColor('#000000');
      y += 18;
    }

    doc.font('Helvetica-Bold').fontSize(12);
    doc.text('TOTAL:', 380, y);
    doc.text(`${simbolo} ${data.total.toLocaleString('es-AR')}`, 450, y, { align: 'right', width: 95 });
    doc.font('Helvetica').fontSize(10).fillColor('#000000');
  }

  private buildFooter(doc: PDFKit.PDFDocument, config: PresupuestoPdfData['config'], notaCoordinador?: string) {
    const pageHeight = doc.page.height;
    const footerY = pageHeight - 120;

    doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor('#dddddd').stroke();

    let y = footerY + 12;
    doc.fontSize(9).font('Helvetica').fillColor('#666666');

    if (config.piePaginaTexto) {
      doc.text(config.piePaginaTexto, 50, y, { width: 495 });
      y += 30;
    }

    if (notaCoordinador) {
      doc.font('Helvetica-Bold').text('Nota:', 50, y);
      doc.font('Helvetica').text(notaCoordinador, 95, y, { width: 450 });
    }

    doc.fillColor('#000000');
  }
}
