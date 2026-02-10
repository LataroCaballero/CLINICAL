import { Test, TestingModule } from '@nestjs/testing';
import { ReportesFinancierosService } from './reportes-financieros.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { Agrupacion } from '../dto/reporte-filters.dto';

describe('ReportesFinancierosService', () => {
  let service: ReportesFinancierosService;
  let prisma: PrismaService;

  const mockPrismaService = {
    movimientoCuenta: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { monto: 0 }, _count: { _all: 0 } }),
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    movimientoCC: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { monto: 0 }, _count: { _all: 0 } }),
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
      findMany: jest.fn().mockResolvedValue([]),
    },
    turno: {
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    cuentaCorriente: {
      findMany: jest.fn().mockResolvedValue([]),
      aggregate: jest.fn().mockResolvedValue({ _sum: { saldo: 0 }, _count: { _all: 0 } }),
      count: jest.fn().mockResolvedValue(0),
    },
    profesional: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportesFinancierosService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReportesFinancierosService>(ReportesFinancierosService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getReporteIngresos', () => {
    const mockFilters = {
      profesionalId: 'prof-123',
      fechaDesde: '2024-01-01',
      fechaHasta: '2024-01-31',
      agrupacion: Agrupacion.DIA,
    };

    it('should call movimientoCC methods', async () => {
      await service.getReporteIngresos(mockFilters);

      expect(mockPrismaService.movimientoCC.aggregate).toHaveBeenCalled();
    });

    it('should return object with expected properties', async () => {
      const result = await service.getReporteIngresos(mockFilters);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('totalIngresos');
      expect(result).toHaveProperty('cantidadTransacciones');
      expect(result).toHaveProperty('ticketPromedio');
      expect(result).toHaveProperty('porPeriodo');
      expect(result).toHaveProperty('porMedioPago');
      expect(Array.isArray(result.porPeriodo)).toBe(true);
      expect(Array.isArray(result.porMedioPago)).toBe(true);
    });
  });

  describe('getIngresosPorProfesional', () => {
    const mockFilters = {
      fechaDesde: '2024-01-01',
      fechaHasta: '2024-01-31',
    };

    it('should return ingresos by profesional', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([
        {
          profesionalId: 'prof-1',
          nombre: 'Dr. Smith',
          especialidad: 'Cardiología',
          ingresos: 50000,
          cantidadTurnos: BigInt(25),
        },
        {
          profesionalId: 'prof-2',
          nombre: 'Dra. Jones',
          especialidad: 'Pediatría',
          ingresos: 30000,
          cantidadTurnos: BigInt(15),
        },
      ]);

      const result = await service.getIngresosPorProfesional(mockFilters);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('totalIngresos');
      expect(result).toHaveProperty('porProfesional');
      expect(result.porProfesional).toHaveLength(2);
    });

    it('should calculate porcentajeTotal for each profesional', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([
        {
          profesionalId: 'prof-1',
          nombre: 'Dr. Smith',
          especialidad: 'Cardiología',
          ingresos: 75000,
          cantidadTurnos: BigInt(30),
        },
        {
          profesionalId: 'prof-2',
          nombre: 'Dra. Jones',
          especialidad: 'Pediatría',
          ingresos: 25000,
          cantidadTurnos: BigInt(10),
        },
      ]);

      const result = await service.getIngresosPorProfesional(mockFilters);

      expect(result.totalIngresos).toBe(100000);
      expect(result.porProfesional[0].porcentajeTotal).toBe(75);
      expect(result.porProfesional[1].porcentajeTotal).toBe(25);
    });
  });

  describe('getIngresosPorObraSocial', () => {
    const mockFilters = {
      profesionalId: 'prof-123',
      fechaDesde: '2024-01-01',
      fechaHasta: '2024-01-31',
    };

    it('should return ingresos by obra social', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([
        {
          obraSocialId: 'os-1',
          nombre: 'OSDE',
          ingresos: 80000,
          cantidadPacientes: BigInt(40),
          cantidadPracticas: BigInt(60),
        },
      ]);

      const result = await service.getIngresosPorObraSocial(mockFilters);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('totalIngresos');
      expect(result).toHaveProperty('porObraSocial');
      expect(result.porObraSocial[0].nombre).toBe('OSDE');
    });
  });

  describe('getCuentasPorCobrar', () => {
    const mockFilters = {
      profesionalId: 'prof-123',
      soloVencidas: false,
      limite: 50,
    };

    beforeEach(() => {
      mockPrismaService.cuentaCorriente.findMany.mockResolvedValue([]);
      mockPrismaService.cuentaCorriente.aggregate.mockResolvedValue({
        _sum: { saldo: 0 },
        _count: { _all: 0 },
      });
    });

    it('should call cuentaCorriente methods', async () => {
      await service.getCuentasPorCobrar(mockFilters);

      expect(mockPrismaService.cuentaCorriente.findMany).toHaveBeenCalled();
    });

    it('should return object with expected properties', async () => {
      const result = await service.getCuentasPorCobrar(mockFilters);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('totalPorCobrar');
      expect(result).toHaveProperty('totalVencido');
      expect(result).toHaveProperty('cantidadCuentas');
      expect(result).toHaveProperty('cuentas');
      expect(Array.isArray(result.cuentas)).toBe(true);
    });
  });

  describe('getMorosidad', () => {
    const mockFilters = {
      profesionalId: 'prof-123',
      diasVencimiento: 30,
      limite: 50,
    };

    beforeEach(() => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);
      mockPrismaService.cuentaCorriente.aggregate.mockResolvedValue({
        _sum: { saldo: 100000 },
      });
      mockPrismaService.cuentaCorriente.count.mockResolvedValue(10);
    });

    it('should call cuentaCorriente and queryRaw', async () => {
      await service.getMorosidad(mockFilters);

      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
      expect(mockPrismaService.cuentaCorriente.count).toHaveBeenCalled();
    });

    it('should return object with expected properties', async () => {
      const result = await service.getMorosidad(mockFilters);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('indiceGeneral');
      expect(result).toHaveProperty('montoTotalMoroso');
      expect(result).toHaveProperty('cantidadCuentasMorosas');
      expect(result).toHaveProperty('cuentasMorosas');
      expect(Array.isArray(result.cuentasMorosas)).toBe(true);
    });
  });

  describe('getPagosPendientes', () => {
    const mockFilters = {
      profesionalId: 'prof-123',
      fechaDesde: '2024-01-01',
      fechaHasta: '2024-01-31',
    };

    it('should return pagos pendientes report', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.getPagosPendientes(mockFilters);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('totalPendiente');
      expect(result).toHaveProperty('porTipo');
      expect(result).toHaveProperty('detalle');
    });
  });
});
