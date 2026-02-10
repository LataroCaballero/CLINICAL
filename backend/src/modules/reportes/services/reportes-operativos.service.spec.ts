import { Test, TestingModule } from '@nestjs/testing';
import { ReportesOperativosService } from './reportes-operativos.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { Agrupacion } from '../dto/reporte-filters.dto';

describe('ReportesOperativosService', () => {
  let service: ReportesOperativosService;

  // Mock comprehensive Prisma service
  const mockPrismaService = {
    turno: {
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
      findMany: jest.fn().mockResolvedValue([]),
    },
    profesional: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    ventaProducto: {
      findMany: jest.fn().mockResolvedValue([]),
      aggregate: jest.fn().mockResolvedValue({ _sum: { total: 0 }, _count: { _all: 0 } }),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    ventaProductoItem: {
      groupBy: jest.fn().mockResolvedValue([]),
    },
    practicaRealizada: {
      groupBy: jest.fn().mockResolvedValue([]),
      aggregate: jest.fn().mockResolvedValue({ _count: { _all: 0 }, _sum: { monto: 0 } }),
    },
    producto: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    paciente: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportesOperativosService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReportesOperativosService>(ReportesOperativosService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getReporteTurnos', () => {
    const mockFilters = {
      profesionalId: 'prof-123',
      fechaDesde: '2024-01-01',
      fechaHasta: '2024-01-31',
      agrupacion: Agrupacion.DIA,
    };

    beforeEach(() => {
      mockPrismaService.turno.groupBy.mockResolvedValue([
        { estado: 'COMPLETADO', _count: { _all: 80 } },
        { estado: 'CANCELADO', _count: { _all: 10 } },
        { estado: 'AUSENTE', _count: { _all: 10 } },
      ]);
      mockPrismaService.turno.findMany.mockResolvedValue([]);
    });

    it('should call turno.groupBy for state aggregation', async () => {
      await service.getReporteTurnos(mockFilters);

      expect(mockPrismaService.turno.groupBy).toHaveBeenCalled();
    });

    it('should return object with expected properties', async () => {
      const result = await service.getReporteTurnos(mockFilters);

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('completados');
      expect(result).toHaveProperty('cancelados');
      expect(result).toHaveProperty('ausentes');
      expect(result).toHaveProperty('detalle');
    });
  });

  describe('getReporteAusentismo', () => {
    const mockFilters = {
      profesionalId: 'prof-123',
      fechaDesde: '2024-01-01',
      fechaHasta: '2024-01-31',
      limite: 10,
    };

    beforeEach(() => {
      mockPrismaService.turno.count
        .mockResolvedValueOnce(20)  // ausencias
        .mockResolvedValueOnce(100); // total
      mockPrismaService.$queryRaw.mockResolvedValue([]);
    });

    it('should call turno.count for ausencias', async () => {
      await service.getReporteAusentismo(mockFilters);

      expect(mockPrismaService.turno.count).toHaveBeenCalled();
    });

    it('should return object with expected properties', async () => {
      const result = await service.getReporteAusentismo(mockFilters);

      expect(result).toHaveProperty('totalAusencias');
      expect(result).toHaveProperty('tasaGeneral');
      expect(result).toHaveProperty('porPaciente');
      expect(Array.isArray(result.porPaciente)).toBe(true);
    });
  });

  describe('getReporteOcupacion', () => {
    const mockFilters = {
      profesionalId: 'prof-123',
      fechaDesde: '2024-01-01',
      fechaHasta: '2024-01-31',
    };

    beforeEach(() => {
      mockPrismaService.profesional.findMany.mockResolvedValue([]);
    });

    it('should return object with expected properties', async () => {
      const result = await service.getReporteOcupacion(mockFilters);

      expect(result).toHaveProperty('tasaOcupacionGeneral');
      expect(result).toHaveProperty('porProfesional');
      expect(Array.isArray(result.porProfesional)).toBe(true);
    });
  });

  describe('getRankingProcedimientos', () => {
    const mockFilters = {
      profesionalId: 'prof-123',
      fechaDesde: '2024-01-01',
      fechaHasta: '2024-01-31',
      limite: 10,
    };

    it('should call practicaRealizada methods', async () => {
      await service.getRankingProcedimientos(mockFilters);

      expect(mockPrismaService.practicaRealizada.groupBy).toHaveBeenCalled();
      expect(mockPrismaService.practicaRealizada.aggregate).toHaveBeenCalled();
    });

    it('should return object with expected properties', async () => {
      const result = await service.getRankingProcedimientos(mockFilters);

      expect(result).toHaveProperty('totalProcedimientos');
      expect(result).toHaveProperty('ingresoTotal');
      expect(result).toHaveProperty('ranking');
      expect(Array.isArray(result.ranking)).toBe(true);
    });
  });

  describe('getVentasProductos', () => {
    const mockFilters = {
      profesionalId: 'prof-123',
      fechaDesde: '2024-01-01',
      fechaHasta: '2024-01-31',
    };

    it('should call ventaProducto methods', async () => {
      await service.getVentasProductos(mockFilters);

      expect(mockPrismaService.ventaProducto.aggregate).toHaveBeenCalled();
    });

    it('should return object with expected properties', async () => {
      const result = await service.getVentasProductos(mockFilters);

      expect(result).toHaveProperty('totalVentas');
      expect(result).toHaveProperty('cantidadProductos');
      expect(result).toHaveProperty('ventasPorProducto');
      expect(result).toHaveProperty('ventasPorPaciente');
    });
  });
});
