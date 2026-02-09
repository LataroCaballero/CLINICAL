import { Test, TestingModule } from '@nestjs/testing';
import { NotImplementedException } from '@nestjs/common';
import { ReportesExportService } from './reportes-export.service';
import { ReportesDashboardService } from './reportes-dashboard.service';
import { ReportesOperativosService } from './reportes-operativos.service';
import { ReportesFinancierosService } from './reportes-financieros.service';

describe('ReportesExportService', () => {
  let service: ReportesExportService;
  let dashboardService: ReportesDashboardService;
  let operativosService: ReportesOperativosService;
  let financierosService: ReportesFinancierosService;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportesExportService,
        { provide: ReportesDashboardService, useValue: mockDashboardService },
        { provide: ReportesOperativosService, useValue: mockOperativosService },
        { provide: ReportesFinancierosService, useValue: mockFinancierosService },
      ],
    }).compile();

    service = module.get<ReportesExportService>(ReportesExportService);
    dashboardService = module.get<ReportesDashboardService>(ReportesDashboardService);
    operativosService = module.get<ReportesOperativosService>(ReportesOperativosService);
    financierosService = module.get<ReportesFinancierosService>(ReportesFinancierosService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('exportarReporte', () => {
    describe('JSON export', () => {
      it('should export dashboard to JSON', async () => {
        const mockData = {
          turnosHoy: 10,
          ingresosHoy: 50000,
        };
        mockDashboardService.getDashboardKPIs.mockResolvedValue(mockData);

        const result = await service.exportarReporte({
          tipoReporte: 'dashboard',
          formato: 'json',
        });

        expect(result.formato).toBe('json');
        expect(result.filename).toMatch(/^reporte-dashboard-.*\.json$/);
        expect(result.data).toBe(JSON.stringify(mockData, null, 2));
      });

      it('should export turnos to JSON', async () => {
        const mockData = {
          totalTurnos: 100,
          completados: 80,
          porPeriodo: [],
        };
        mockOperativosService.getReporteTurnos.mockResolvedValue(mockData);

        const result = await service.exportarReporte({
          tipoReporte: 'turnos',
          formato: 'json',
          filtros: { fechaDesde: '2024-01-01', fechaHasta: '2024-01-31' },
        });

        expect(result.formato).toBe('json');
        expect(mockOperativosService.getReporteTurnos).toHaveBeenCalled();
      });

      it('should export ingresos to JSON', async () => {
        const mockData = {
          totalIngresos: 150000,
          cantidadTransacciones: 75,
        };
        mockFinancierosService.getReporteIngresos.mockResolvedValue(mockData);

        const result = await service.exportarReporte({
          tipoReporte: 'ingresos',
          formato: 'json',
        });

        expect(result.formato).toBe('json');
        expect(mockFinancierosService.getReporteIngresos).toHaveBeenCalled();
      });
    });

    describe('CSV export', () => {
      it('should export array data to CSV', async () => {
        const mockData = {
          totalIngresos: 100000,
          porProfesional: [
            { nombre: 'Dr. Smith', ingresos: 60000 },
            { nombre: 'Dra. Jones', ingresos: 40000 },
          ],
        };
        mockFinancierosService.getIngresosPorProfesional.mockResolvedValue(mockData);

        const result = await service.exportarReporte({
          tipoReporte: 'ingresos-profesional',
          formato: 'csv',
        });

        expect(result.formato).toBe('csv');
        expect(result.filename).toMatch(/\.csv$/);
        expect(result.data).toContain('nombre');
        expect(result.data).toContain('ingresos');
        expect(result.data).toContain('Dr. Smith');
        expect(result.data).toContain('60000');
      });

      it('should handle empty arrays in CSV', async () => {
        const mockData = {
          totalIngresos: 0,
          porProfesional: [],
        };
        mockFinancierosService.getIngresosPorProfesional.mockResolvedValue(mockData);

        const result = await service.exportarReporte({
          tipoReporte: 'ingresos-profesional',
          formato: 'csv',
        });

        expect(result.formato).toBe('csv');
        expect(result.data).toBe('');
      });

      it('should escape commas in CSV values', async () => {
        const mockData = {
          ranking: [
            { descripcion: 'Consulta, general', cantidad: 10 },
          ],
        };
        mockOperativosService.getRankingProcedimientos.mockResolvedValue(mockData);

        const result = await service.exportarReporte({
          tipoReporte: 'procedimientos',
          formato: 'csv',
        });

        expect(result.data).toContain('"Consulta, general"');
      });
    });

    describe('PDF export', () => {
      it('should export to PDF', async () => {
        const mockData = {
          totalTurnos: 100,
          completados: 80,
          cancelados: 10,
          ausentismos: 10,
          tasaAsistencia: 88.89,
          porPeriodo: [
            { periodo: '2024-01-01', total: 10, completados: 8, cancelados: 1, ausentismos: 1, tasaAsistencia: 88.89 },
          ],
        };
        mockOperativosService.getReporteTurnos.mockResolvedValue(mockData);

        const result = await service.exportarReporte({
          tipoReporte: 'turnos',
          formato: 'pdf',
        });

        expect(result.formato).toBe('pdf');
        expect(result.filename).toMatch(/\.pdf$/);
        expect(result.data).toBeInstanceOf(Buffer);
        expect((result.data as Buffer).length).toBeGreaterThan(0);
      });

      it('should include title in PDF', async () => {
        const mockData = { totalIngresos: 100000 };
        mockFinancierosService.getReporteIngresos.mockResolvedValue(mockData);

        const result = await service.exportarReporte({
          tipoReporte: 'ingresos',
          formato: 'pdf',
          titulo: 'Mi Reporte Personalizado',
        });

        expect(result.formato).toBe('pdf');
        // PDF content should be generated without errors
        expect(result.data).toBeInstanceOf(Buffer);
      });
    });

    describe('error handling', () => {
      it('should throw error for unsupported report type', async () => {
        await expect(
          service.exportarReporte({
            tipoReporte: 'invalid-type' as any,
            formato: 'json',
          }),
        ).rejects.toThrow('Tipo de reporte no soportado');
      });

      it('should throw error for unsupported format', async () => {
        mockDashboardService.getDashboardKPIs.mockResolvedValue({});

        await expect(
          service.exportarReporte({
            tipoReporte: 'dashboard',
            formato: 'xlsx' as any,
          }),
        ).rejects.toThrow('Formato no soportado');
      });
    });
  });

  describe('programarEnvio', () => {
    it('should throw NotImplementedException', async () => {
      await expect(
        service.programarEnvio({
          tipoReporte: 'ingresos',
          formato: 'pdf',
          email: 'test@example.com',
          frecuencia: 'semanal',
        }),
      ).rejects.toThrow(NotImplementedException);
    });
  });

  describe('report type routing', () => {
    it('should route to dashboard service for dashboard report', async () => {
      mockDashboardService.getDashboardKPIs.mockResolvedValue({});

      await service.exportarReporte({ tipoReporte: 'dashboard', formato: 'json' });

      expect(mockDashboardService.getDashboardKPIs).toHaveBeenCalled();
    });

    it('should route to operativos service for turnos report', async () => {
      mockOperativosService.getReporteTurnos.mockResolvedValue({});

      await service.exportarReporte({ tipoReporte: 'turnos', formato: 'json' });

      expect(mockOperativosService.getReporteTurnos).toHaveBeenCalled();
    });

    it('should route to operativos service for ausentismo report', async () => {
      mockOperativosService.getReporteAusentismo.mockResolvedValue({});

      await service.exportarReporte({ tipoReporte: 'ausentismo', formato: 'json' });

      expect(mockOperativosService.getReporteAusentismo).toHaveBeenCalled();
    });

    it('should route to financieros service for morosidad report', async () => {
      mockFinancierosService.getMorosidad.mockResolvedValue({});

      await service.exportarReporte({ tipoReporte: 'morosidad', formato: 'json' });

      expect(mockFinancierosService.getMorosidad).toHaveBeenCalled();
    });

    it('should route to financieros service for cuentas-por-cobrar report', async () => {
      mockFinancierosService.getCuentasPorCobrar.mockResolvedValue({});

      await service.exportarReporte({ tipoReporte: 'cuentas-por-cobrar', formato: 'json' });

      expect(mockFinancierosService.getCuentasPorCobrar).toHaveBeenCalled();
    });
  });
});
