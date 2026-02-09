import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { ReportesController } from './reportes.controller';
import { ReportesDashboardService } from './services/reportes-dashboard.service';
import { ReportesOperativosService } from './services/reportes-operativos.service';
import { ReportesFinancierosService } from './services/reportes-financieros.service';
import { ReportesExportService } from './services/reportes-export.service';

describe('ReportesController', () => {
  let controller: ReportesController;
  let dashboardService: ReportesDashboardService;
  let operativosService: ReportesOperativosService;
  let financierosService: ReportesFinancierosService;
  let exportService: ReportesExportService;

  const mockDashboardService = {
    getDashboardKPIs: jest.fn(),
  };

  const mockOperativosService = {
    getReporteTurnos: jest.fn(),
    getReporteAusentismo: jest.fn(),
    getReporteOcupacion: jest.fn(),
    getRankingProcedimientos: jest.fn(),
    getVentasProductos: jest.fn(),
  };

  const mockFinancierosService = {
    getReporteIngresos: jest.fn(),
    getIngresosPorProfesional: jest.fn(),
    getIngresosPorObraSocial: jest.fn(),
    getIngresosPorPrestacion: jest.fn(),
    getCuentasPorCobrar: jest.fn(),
    getMorosidad: jest.fn(),
    getPagosPendientes: jest.fn(),
  };

  const mockExportService = {
    exportarReporte: jest.fn(),
    programarEnvio: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportesController],
      providers: [
        { provide: ReportesDashboardService, useValue: mockDashboardService },
        { provide: ReportesOperativosService, useValue: mockOperativosService },
        { provide: ReportesFinancierosService, useValue: mockFinancierosService },
        { provide: ReportesExportService, useValue: mockExportService },
      ],
    }).compile();

    controller = module.get<ReportesController>(ReportesController);
    dashboardService = module.get<ReportesDashboardService>(ReportesDashboardService);
    operativosService = module.get<ReportesOperativosService>(ReportesOperativosService);
    financierosService = module.get<ReportesFinancierosService>(ReportesFinancierosService);
    exportService = module.get<ReportesExportService>(ReportesExportService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Dashboard endpoints', () => {
    describe('GET /reportes/dashboard', () => {
      it('should return dashboard KPIs', async () => {
        const mockKPIs = {
          turnosHoy: 10,
          turnosCompletados: 5,
          ingresosHoy: 50000,
        };
        mockDashboardService.getDashboardKPIs.mockResolvedValue(mockKPIs);

        const result = await controller.getDashboard({ profesionalId: 'prof-123' });

        expect(result).toEqual(mockKPIs);
        expect(mockDashboardService.getDashboardKPIs).toHaveBeenCalledWith({
          profesionalId: 'prof-123',
        });
      });
    });
  });

  describe('Operativos endpoints', () => {
    describe('GET /reportes/operativos/turnos', () => {
      it('should return turnos report', async () => {
        const mockReport = {
          totalTurnos: 100,
          completados: 80,
        };
        mockOperativosService.getReporteTurnos.mockResolvedValue(mockReport);

        const filters = {
          profesionalId: 'prof-123',
          fechaDesde: '2024-01-01',
          fechaHasta: '2024-01-31',
        };

        const result = await controller.getReporteTurnos(filters);

        expect(result).toEqual(mockReport);
        expect(mockOperativosService.getReporteTurnos).toHaveBeenCalledWith(filters);
      });
    });

    describe('GET /reportes/operativos/ausentismo', () => {
      it('should return ausentismo report', async () => {
        const mockReport = {
          totalAusencias: 20,
          tasaGeneral: 15,
        };
        mockOperativosService.getReporteAusentismo.mockResolvedValue(mockReport);

        const result = await controller.getReporteAusentismo({
          profesionalId: 'prof-123',
        });

        expect(result).toEqual(mockReport);
      });
    });

    describe('GET /reportes/operativos/ocupacion', () => {
      it('should return ocupacion report', async () => {
        const mockReport = {
          tasaOcupacionGeneral: 75,
          porProfesional: [],
        };
        mockOperativosService.getReporteOcupacion.mockResolvedValue(mockReport);

        const result = await controller.getReporteOcupacion({
          profesionalId: 'prof-123',
        });

        expect(result).toEqual(mockReport);
      });
    });

    describe('GET /reportes/operativos/procedimientos-ranking', () => {
      it('should return procedimientos ranking', async () => {
        const mockReport = {
          totalProcedimientos: 150,
          ranking: [],
        };
        mockOperativosService.getRankingProcedimientos.mockResolvedValue(mockReport);

        const result = await controller.getRankingProcedimientos({
          profesionalId: 'prof-123',
        });

        expect(result).toEqual(mockReport);
      });
    });

    describe('GET /reportes/operativos/ventas-productos', () => {
      it('should return ventas productos report', async () => {
        const mockReport = {
          totalVentas: 50000,
          ventasPorProducto: [],
        };
        mockOperativosService.getVentasProductos.mockResolvedValue(mockReport);

        const result = await controller.getVentasProductos({
          profesionalId: 'prof-123',
        });

        expect(result).toEqual(mockReport);
      });
    });
  });

  describe('Financieros endpoints', () => {
    describe('GET /reportes/financieros/ingresos', () => {
      it('should return ingresos report', async () => {
        const mockReport = {
          totalIngresos: 100000,
          ticketPromedio: 2000,
        };
        mockFinancierosService.getReporteIngresos.mockResolvedValue(mockReport);

        const result = await controller.getReporteIngresos({
          profesionalId: 'prof-123',
        });

        expect(result).toEqual(mockReport);
      });
    });

    describe('GET /reportes/financieros/ingresos-por-profesional', () => {
      it('should return ingresos by profesional', async () => {
        const mockReport = {
          totalIngresos: 100000,
          porProfesional: [],
        };
        mockFinancierosService.getIngresosPorProfesional.mockResolvedValue(mockReport);

        const result = await controller.getIngresosPorProfesional({});

        expect(result).toEqual(mockReport);
      });
    });

    describe('GET /reportes/financieros/cuentas-por-cobrar', () => {
      it('should return cuentas por cobrar', async () => {
        const mockReport = {
          totalPorCobrar: 50000,
          cuentas: [],
        };
        mockFinancierosService.getCuentasPorCobrar.mockResolvedValue(mockReport);

        const result = await controller.getCuentasPorCobrar({
          profesionalId: 'prof-123',
        });

        expect(result).toEqual(mockReport);
      });
    });

    describe('GET /reportes/financieros/morosidad', () => {
      it('should return morosidad report', async () => {
        const mockReport = {
          indiceGeneral: 15,
          cuentasMorosas: [],
        };
        mockFinancierosService.getMorosidad.mockResolvedValue(mockReport);

        const result = await controller.getMorosidad({
          profesionalId: 'prof-123',
        });

        expect(result).toEqual(mockReport);
      });
    });
  });

  describe('Export endpoints', () => {
    describe('POST /reportes/exportar', () => {
      let mockResponse: Partial<Response>;

      beforeEach(() => {
        mockResponse = {
          setHeader: jest.fn().mockReturnThis(),
          send: jest.fn().mockReturnThis(),
          end: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis(),
        };
      });

      it('should export JSON report', async () => {
        const mockResult = {
          data: '{"test": true}',
          filename: 'reporte-turnos-2024-01-15.json',
          formato: 'json' as const,
        };
        mockExportService.exportarReporte.mockResolvedValue(mockResult);

        await controller.exportarReporte(
          { tipoReporte: 'turnos', formato: 'json' },
          mockResponse as Response,
        );

        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'Content-Disposition',
          expect.stringContaining('attachment'),
        );
        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'Content-Type',
          'application/json; charset=utf-8',
        );
        expect(mockResponse.send).toHaveBeenCalledWith(mockResult.data);
      });

      it('should export CSV report with BOM', async () => {
        const mockResult = {
          data: 'nombre,ingresos\nDr. Smith,60000',
          filename: 'reporte-ingresos-2024-01-15.csv',
          formato: 'csv' as const,
        };
        mockExportService.exportarReporte.mockResolvedValue(mockResult);

        await controller.exportarReporte(
          { tipoReporte: 'ingresos', formato: 'csv' },
          mockResponse as Response,
        );

        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'Content-Type',
          'text/csv; charset=utf-8',
        );
        // Should prepend BOM for Excel compatibility
        expect(mockResponse.send).toHaveBeenCalledWith(
          expect.stringMatching(/^\ufeff/),
        );
      });

      it('should export PDF report', async () => {
        const pdfBuffer = Buffer.from('PDF content');
        const mockResult = {
          data: pdfBuffer,
          filename: 'reporte-turnos-2024-01-15.pdf',
          formato: 'pdf' as const,
        };
        mockExportService.exportarReporte.mockResolvedValue(mockResult);

        await controller.exportarReporte(
          { tipoReporte: 'turnos', formato: 'pdf' },
          mockResponse as Response,
        );

        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'Content-Type',
          'application/pdf',
        );
        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'Content-Length',
          pdfBuffer.length,
        );
        expect(mockResponse.end).toHaveBeenCalledWith(pdfBuffer);
      });
    });

    describe('POST /reportes/programar-envio', () => {
      it('should call programarEnvio service', async () => {
        const options = {
          tipoReporte: 'ingresos' as const,
          formato: 'pdf' as const,
          email: 'test@example.com',
          frecuencia: 'semanal' as const,
        };

        await controller.programarEnvio(options);

        expect(mockExportService.programarEnvio).toHaveBeenCalledWith(options);
      });
    });
  });
});
