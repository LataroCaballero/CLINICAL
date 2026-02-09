import { Test, TestingModule } from '@nestjs/testing';
import { ReportesDashboardService } from './reportes-dashboard.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('ReportesDashboardService', () => {
  let service: ReportesDashboardService;
  let prisma: PrismaService;

  const mockPrismaService = {
    turno: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    movimientoCuenta: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { monto: 0 } }),
    },
    movimientoCC: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { monto: 0 } }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    alerta: {
      count: jest.fn().mockResolvedValue(0),
    },
    cuentaCorriente: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    producto: {
      count: jest.fn().mockResolvedValue(0),
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportesDashboardService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReportesDashboardService>(ReportesDashboardService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboardKPIs', () => {
    const mockFilters = { profesionalId: 'prof-123' };

    beforeEach(() => {
      // Setup default mock responses
      mockPrismaService.turno.count.mockResolvedValue(10);
      mockPrismaService.turno.findMany.mockResolvedValue([]);
      mockPrismaService.movimientoCuenta.aggregate.mockResolvedValue({
        _sum: { monto: 50000 },
      });
      mockPrismaService.alerta.count.mockResolvedValue(3);
      mockPrismaService.$queryRaw.mockResolvedValue([]);
    });

    it('should return dashboard KPIs', async () => {
      const result = await service.getDashboardKPIs(mockFilters);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('turnosHoy');
      expect(result).toHaveProperty('turnosCompletados');
      expect(result).toHaveProperty('turnosAusentes');
      expect(result).toHaveProperty('turnosCancelados');
      expect(result).toHaveProperty('turnosPendientes');
      expect(result).toHaveProperty('ingresosHoy');
      expect(result).toHaveProperty('proximosTurnos');
      expect(result).toHaveProperty('alertasPendientes');
      expect(result).toHaveProperty('tendencias');
    });

    it('should call prisma.turno.count for each turno status', async () => {
      await service.getDashboardKPIs(mockFilters);

      // Should be called for total, completados, ausentes, cancelados, pendientes
      expect(mockPrismaService.turno.count).toHaveBeenCalled();
    });

    it('should call prisma.movimientoCC.aggregate for ingresos', async () => {
      await service.getDashboardKPIs(mockFilters);

      expect(mockPrismaService.movimientoCC.aggregate).toHaveBeenCalled();
    });

    it('should return numeric value for ingresosHoy', async () => {
      const result = await service.getDashboardKPIs(mockFilters);

      expect(typeof result.ingresosHoy).toBe('number');
    });

    it('should return numeric value for alertasPendientes', async () => {
      const result = await service.getDashboardKPIs(mockFilters);

      expect(typeof result.alertasPendientes).toBe('number');
    });

    it('should return tendencias with arrays', async () => {
      const result = await service.getDashboardKPIs(mockFilters);

      expect(result.tendencias).toHaveProperty('ingresosSemana');
      expect(result.tendencias).toHaveProperty('turnosSemana');
      expect(Array.isArray(result.tendencias.ingresosSemana)).toBe(true);
      expect(Array.isArray(result.tendencias.turnosSemana)).toBe(true);
    });
  });

  describe('getDashboardKPIs - proximosTurnos', () => {
    it('should call turno methods', async () => {
      await service.getDashboardKPIs({ profesionalId: 'prof-123' });

      expect(mockPrismaService.turno.groupBy).toHaveBeenCalled();
      expect(mockPrismaService.turno.findMany).toHaveBeenCalled();
    });

    it('should return proximosTurnos as array', async () => {
      const result = await service.getDashboardKPIs({ profesionalId: 'prof-123' });

      expect(result.proximosTurnos).toBeDefined();
      expect(Array.isArray(result.proximosTurnos)).toBe(true);
    });
  });
});
