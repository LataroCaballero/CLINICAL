import { Injectable, NotImplementedException } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { ExportOptionsDto, ProgramarEnvioDto } from '../dto/export-options.dto';
import { ExportResult, ProgramacionEnvio, TipoReporte } from '../types/reportes.types';
import { ReportesDashboardService } from './reportes-dashboard.service';
import { ReportesOperativosService } from './reportes-operativos.service';
import { ReportesFinancierosService } from './reportes-financieros.service';

// Títulos legibles para cada tipo de reporte
const TITULOS_REPORTE: Record<TipoReporte, string> = {
  dashboard: 'Dashboard de KPIs',
  turnos: 'Reporte de Turnos',
  ausentismo: 'Reporte de Ausentismo',
  ocupacion: 'Reporte de Ocupación',
  procedimientos: 'Ranking de Procedimientos',
  'ventas-productos': 'Ventas de Productos',
  ingresos: 'Reporte de Ingresos',
  'ingresos-profesional': 'Ingresos por Profesional',
  'ingresos-obra-social': 'Ingresos por Obra Social',
  'ingresos-prestacion': 'Ingresos por Prestación',
  'cuentas-por-cobrar': 'Cuentas por Cobrar',
  morosidad: 'Reporte de Morosidad',
  'pagos-pendientes': 'Pagos Pendientes',
};

@Injectable()
export class ReportesExportService {
  constructor(
    private readonly dashboardService: ReportesDashboardService,
    private readonly operativosService: ReportesOperativosService,
    private readonly financierosService: ReportesFinancierosService,
  ) {}

  /**
   * Exporta un reporte al formato especificado (JSON, CSV, PDF)
   */
  async exportarReporte(options: ExportOptionsDto): Promise<ExportResult> {
    // Obtener los datos del reporte según el tipo
    const data = await this.obtenerDatosReporte(options);

    const timestamp = new Date().toISOString().split('T')[0];
    const baseFilename = `reporte-${options.tipoReporte}-${timestamp}`;

    switch (options.formato) {
      case 'json':
        return {
          data: JSON.stringify(data, null, 2),
          filename: `${baseFilename}.json`,
          formato: 'json',
        };

      case 'csv':
        // TODO: Implementar en Fase 5 con json2csv
        return {
          data: this.convertirACSV(data),
          filename: `${baseFilename}.csv`,
          formato: 'csv',
        };

      case 'pdf':
        const pdfBuffer = await this.generarPDF(
          data,
          options.titulo || TITULOS_REPORTE[options.tipoReporte],
          options.tipoReporte,
        );
        return {
          data: pdfBuffer,
          filename: `${baseFilename}.pdf`,
          formato: 'pdf',
        };

      default:
        throw new Error(`Formato no soportado: ${options.formato}`);
    }
  }

  /**
   * Programa el envío de un reporte por email
   * (Funcionalidad opcional para fase futura)
   */
  async programarEnvio(options: ProgramarEnvioDto): Promise<ProgramacionEnvio> {
    // TODO: Implementar en Fase 5 (opcional) con cron jobs
    throw new NotImplementedException(
      'Programación de envíos aún no implementada',
    );
  }

  /**
   * Obtiene los datos del reporte según el tipo solicitado
   */
  private async obtenerDatosReporte(options: ExportOptionsDto): Promise<any> {
    const filtros = options.filtros || {};

    switch (options.tipoReporte) {
      case 'dashboard':
        return this.dashboardService.getDashboardKPIs(filtros);

      case 'turnos':
        return this.operativosService.getReporteTurnos(filtros as any);

      case 'ausentismo':
        return this.operativosService.getReporteAusentismo(filtros as any);

      case 'ocupacion':
        return this.operativosService.getReporteOcupacion(filtros);

      case 'procedimientos':
        return this.operativosService.getRankingProcedimientos(filtros as any);

      case 'ventas-productos':
        return this.operativosService.getVentasProductos(filtros);

      case 'ingresos':
        return this.financierosService.getReporteIngresos(filtros as any);

      case 'ingresos-profesional':
        return this.financierosService.getIngresosPorProfesional(filtros);

      case 'ingresos-obra-social':
        return this.financierosService.getIngresosPorObraSocial(filtros);

      case 'ingresos-prestacion':
        return this.financierosService.getIngresosPorPrestacion(filtros);

      case 'cuentas-por-cobrar':
        return this.financierosService.getCuentasPorCobrar(filtros as any);

      case 'morosidad':
        return this.financierosService.getMorosidad(filtros as any);

      case 'pagos-pendientes':
        return this.financierosService.getPagosPendientes(filtros);

      default:
        throw new Error(`Tipo de reporte no soportado: ${options.tipoReporte}`);
    }
  }

  /**
   * Convierte datos a formato CSV (implementación básica)
   */
  private convertirACSV(data: any): string {
    // Implementación básica para arrays de objetos
    if (Array.isArray(data)) {
      if (data.length === 0) return '';

      const headers = Object.keys(data[0]);
      const csvRows = [headers.join(',')];

      for (const row of data) {
        const values = headers.map((header) => {
          const value = row[header];
          // Escapar comillas y envolver en comillas si contiene comas
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        });
        csvRows.push(values.join(','));
      }

      return csvRows.join('\n');
    }

    // Para objetos con propiedades de array, exportar la propiedad principal
    const arrayProps = Object.entries(data).filter(([, v]) => Array.isArray(v));
    if (arrayProps.length > 0) {
      const [, arrayData] = arrayProps[0];
      return this.convertirACSV(arrayData);
    }

    // Para objetos simples, una fila con headers y valores
    const headers = Object.keys(data);
    const values = Object.values(data).map((v) =>
      typeof v === 'object' ? JSON.stringify(v) : v,
    );
    return `${headers.join(',')}\n${values.join(',')}`;
  }

  /**
   * Genera un PDF con los datos del reporte
   */
  private async generarPDF(
    data: any,
    titulo: string,
    tipoReporte: TipoReporte,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text(titulo, { align: 'center' });

      doc.moveDown(0.5);

      // Fecha de generación
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#666666')
        .text(`Generado el: ${new Date().toLocaleDateString('es-AR')}`, {
          align: 'center',
        });

      doc.moveDown(1.5);
      doc.fillColor('#000000');

      // Renderizar contenido según el tipo de reporte
      this.renderizarContenidoPDF(doc, data, tipoReporte);

      // Footer
      doc
        .fontSize(8)
        .fillColor('#999999')
        .text(
          'Este documento fue generado automáticamente por el sistema Clinical',
          50,
          doc.page.height - 50,
          { align: 'center' },
        );

      doc.end();
    });
  }

  /**
   * Renderiza el contenido específico según el tipo de reporte
   */
  private renderizarContenidoPDF(
    doc: PDFKit.PDFDocument,
    data: any,
    tipoReporte: TipoReporte,
  ): void {
    // Renderizar KPIs principales si existen
    const kpis = this.extraerKPIs(data, tipoReporte);
    if (kpis.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('Resumen', { underline: true });
      doc.moveDown(0.5);

      for (const kpi of kpis) {
        doc
          .fontSize(11)
          .font('Helvetica')
          .text(`${kpi.label}: `, { continued: true })
          .font('Helvetica-Bold')
          .text(kpi.value);
      }
      doc.moveDown(1);
    }

    // Renderizar tabla si hay datos tabulares
    const tablaData = this.extraerDatosTabla(data, tipoReporte);
    if (tablaData && tablaData.rows.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('Detalle', { underline: true });
      doc.moveDown(0.5);

      this.renderizarTabla(doc, tablaData.headers, tablaData.rows);
    }
  }

  /**
   * Extrae los KPIs principales de los datos del reporte
   */
  private extraerKPIs(
    data: any,
    tipoReporte: TipoReporte,
  ): Array<{ label: string; value: string }> {
    const kpis: Array<{ label: string; value: string }> = [];
    const formatMoney = (v: number) =>
      new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
      }).format(v);

    switch (tipoReporte) {
      case 'turnos':
        if (data.totalTurnos !== undefined)
          kpis.push({ label: 'Total Turnos', value: data.totalTurnos.toString() });
        if (data.completados !== undefined)
          kpis.push({ label: 'Completados', value: data.completados.toString() });
        if (data.cancelados !== undefined)
          kpis.push({ label: 'Cancelados', value: data.cancelados.toString() });
        if (data.tasaAsistencia !== undefined)
          kpis.push({
            label: 'Tasa de Asistencia',
            value: `${data.tasaAsistencia.toFixed(1)}%`,
          });
        break;

      case 'ausentismo':
        if (data.totalAusencias !== undefined)
          kpis.push({ label: 'Total Ausencias', value: data.totalAusencias.toString() });
        if (data.tasaGeneral !== undefined)
          kpis.push({
            label: 'Tasa General',
            value: `${data.tasaGeneral.toFixed(1)}%`,
          });
        break;

      case 'ingresos':
        if (data.totalIngresos !== undefined)
          kpis.push({ label: 'Total Ingresos', value: formatMoney(data.totalIngresos) });
        if (data.cantidadTransacciones !== undefined)
          kpis.push({
            label: 'Transacciones',
            value: data.cantidadTransacciones.toString(),
          });
        if (data.ticketPromedio !== undefined)
          kpis.push({
            label: 'Ticket Promedio',
            value: formatMoney(data.ticketPromedio),
          });
        break;

      case 'cuentas-por-cobrar':
        if (data.totalPorCobrar !== undefined)
          kpis.push({ label: 'Total por Cobrar', value: formatMoney(data.totalPorCobrar) });
        if (data.totalVencido !== undefined)
          kpis.push({ label: 'Total Vencido', value: formatMoney(data.totalVencido) });
        if (data.cantidadCuentas !== undefined)
          kpis.push({ label: 'Cuentas con Deuda', value: data.cantidadCuentas.toString() });
        break;

      case 'morosidad':
        if (data.indiceGeneral !== undefined)
          kpis.push({
            label: 'Índice de Morosidad',
            value: `${data.indiceGeneral.toFixed(1)}%`,
          });
        if (data.montoTotalMoroso !== undefined)
          kpis.push({
            label: 'Monto Total Moroso',
            value: formatMoney(data.montoTotalMoroso),
          });
        break;

      case 'procedimientos':
        if (data.totalProcedimientos !== undefined)
          kpis.push({
            label: 'Total Procedimientos',
            value: data.totalProcedimientos.toString(),
          });
        if (data.ingresoTotal !== undefined)
          kpis.push({ label: 'Ingreso Total', value: formatMoney(data.ingresoTotal) });
        break;

      default:
        // Extraer valores numéricos del primer nivel
        for (const [key, value] of Object.entries(data)) {
          if (typeof value === 'number') {
            const label = key.replace(/([A-Z])/g, ' $1').trim();
            kpis.push({
              label: label.charAt(0).toUpperCase() + label.slice(1),
              value: value.toString(),
            });
          }
        }
    }

    return kpis;
  }

  /**
   * Extrae los datos tabulares del reporte
   */
  private extraerDatosTabla(
    data: any,
    tipoReporte: TipoReporte,
  ): { headers: string[]; rows: string[][] } | null {
    // Buscar el array principal en los datos
    const arrayKey = Object.keys(data).find((key) => Array.isArray(data[key]));
    if (!arrayKey || data[arrayKey].length === 0) return null;

    const arrayData = data[arrayKey];
    const firstItem = arrayData[0];
    const headers = Object.keys(firstItem).filter(
      (key) => typeof firstItem[key] !== 'object' || firstItem[key] === null,
    );

    const rows = arrayData.map((item: any) =>
      headers.map((header) => {
        const value = item[header];
        if (value === null || value === undefined) return '-';
        if (typeof value === 'number') {
          // Formatear números grandes como moneda si parecen ser dinero
          if (header.toLowerCase().includes('ingreso') ||
              header.toLowerCase().includes('monto') ||
              header.toLowerCase().includes('saldo')) {
            return new Intl.NumberFormat('es-AR', {
              style: 'currency',
              currency: 'ARS',
              minimumFractionDigits: 0,
            }).format(value);
          }
          return value.toLocaleString('es-AR');
        }
        return String(value);
      }),
    );

    // Formatear headers para mejor legibilidad
    const formattedHeaders = headers.map((h) =>
      h
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
    );

    return { headers: formattedHeaders, rows };
  }

  /**
   * Renderiza una tabla simple en el PDF
   */
  private renderizarTabla(
    doc: PDFKit.PDFDocument,
    headers: string[],
    rows: string[][],
  ): void {
    const startX = 50;
    const pageWidth = doc.page.width - 100;
    const colWidth = Math.min(pageWidth / headers.length, 120);
    const rowHeight = 20;

    let y = doc.y;

    // Headers
    doc.fontSize(9).font('Helvetica-Bold');
    headers.forEach((header, i) => {
      doc.text(header, startX + i * colWidth, y, {
        width: colWidth - 5,
        align: 'left',
      });
    });

    y += rowHeight;

    // Línea separadora
    doc
      .moveTo(startX, y - 5)
      .lineTo(startX + headers.length * colWidth, y - 5)
      .stroke('#cccccc');

    // Filas (máximo 30 para no exceder la página)
    doc.fontSize(8).font('Helvetica');
    const maxRows = Math.min(rows.length, 30);

    for (let i = 0; i < maxRows; i++) {
      const row = rows[i];

      // Verificar si necesitamos nueva página
      if (y > doc.page.height - 100) {
        doc.addPage();
        y = 50;
      }

      row.forEach((cell, j) => {
        doc.text(cell, startX + j * colWidth, y, {
          width: colWidth - 5,
          align: 'left',
        });
      });

      y += rowHeight;
    }

    if (rows.length > maxRows) {
      doc.moveDown(0.5);
      doc
        .fontSize(8)
        .fillColor('#666666')
        .text(`... y ${rows.length - maxRows} filas más`, { align: 'center' });
      doc.fillColor('#000000');
    }
  }
}
