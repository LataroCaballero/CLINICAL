import { Test, TestingModule } from '@nestjs/testing';
import { FinanzasService } from './finanzas.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CuentasCorrientesService } from '../cuentas-corrientes/cuentas-corrientes.service';

const mockPrismaService = {
  limiteFacturacionMensual: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  factura: {
    aggregate: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  practicaRealizada: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  liquidacionObraSocial: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
  movimientoCC: {
    aggregate: jest.fn(),
    findMany: jest.fn(),
  },
  cuentaCorriente: {
    aggregate: jest.fn(),
  },
  presupuesto: {
    count: jest.fn(),
  },
  paciente: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

const mockCuentasCorrientesService = {
  createMovimiento: jest.fn(),
};

describe('FinanzasService', () => {
  let service: FinanzasService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanzasService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: CuentasCorrientesService,
          useValue: mockCuentasCorrientesService,
        },
      ],
    }).compile();

    service = module.get<FinanzasService>(FinanzasService);
    prisma = mockPrismaService;
  });

  describe('getLimiteDisponible', () => {
    it('should return {limite, emitido, disponible} when LimiteFacturacionMensual exists', async () => {
      prisma.limiteFacturacionMensual.findUnique.mockResolvedValue({
        id: 'test-id',
        profesionalId: 'prof-1',
        mes: '2026-03',
        limite: 100000,
      });
      prisma.factura.aggregate.mockResolvedValue({
        _sum: { total: 30000 },
      });

      const result = await service.getLimiteDisponible('prof-1', '2026-03');

      expect(result.limite).toBe(100000);
      expect(result.emitido).toBe(30000);
      expect(result.disponible).toBe(70000);
    });

    it('should return {limite: null, emitido: 0, disponible: null} when no LimiteFacturacionMensual exists', async () => {
      prisma.limiteFacturacionMensual.findUnique.mockResolvedValue(null);
      prisma.factura.aggregate.mockResolvedValue({
        _sum: { total: null },
      });

      const result = await service.getLimiteDisponible('prof-1', '2026-03');

      expect(result.limite).toBeNull();
      expect(result.emitido).toBe(0);
      expect(result.disponible).toBeNull();
    });
  });

  describe('actualizarMontoPagado', () => {
    it('should update montoPagado, corregidoPor, corregidoAt when practica exists', async () => {
      const mockPractica = { id: 'practica-uuid', monto: 2000, montoPagado: null };
      const updatedPractica = {
        id: 'practica-uuid',
        montoPagado: 1500,
        corregidoPor: 'user-uuid',
        corregidoAt: new Date(),
      };
      prisma.practicaRealizada.findUnique.mockResolvedValue(mockPractica);
      prisma.practicaRealizada.update.mockResolvedValue(updatedPractica);

      const result = await service.actualizarMontoPagado('practica-uuid', 1500, 'user-uuid');

      expect(prisma.practicaRealizada.update).toHaveBeenCalledWith({
        where: { id: 'practica-uuid' },
        data: {
          montoPagado: 1500,
          corregidoPor: 'user-uuid',
          corregidoAt: expect.any(Date),
        },
      });
      expect(result).toEqual(updatedPractica);
    });

    it('should throw NotFoundException when practica does not exist', async () => {
      prisma.practicaRealizada.findUnique.mockResolvedValue(null);

      await expect(
        service.actualizarMontoPagado('practica-uuid', 1500, 'user-uuid'),
      ).rejects.toThrow('Práctica no encontrada');
    });

    it('should set corregidoPor to null when no usuarioId provided', async () => {
      const mockPractica = { id: 'practica-uuid', monto: 2000, montoPagado: null };
      prisma.practicaRealizada.findUnique.mockResolvedValue(mockPractica);
      prisma.practicaRealizada.update.mockResolvedValue({ id: 'practica-uuid', montoPagado: 1500, corregidoPor: null, corregidoAt: new Date() });

      await service.actualizarMontoPagado('practica-uuid', 1500);

      expect(prisma.practicaRealizada.update).toHaveBeenCalledWith({
        where: { id: 'practica-uuid' },
        data: {
          montoPagado: 1500,
          corregidoPor: null,
          corregidoAt: expect.any(Date),
        },
      });
    });
  });

  describe('crearLoteLiquidacion', () => {
    it('should call prisma.$transaction with an async callback', async () => {
      prisma.$transaction.mockImplementation(async (callback: any) => {
        const txMock = {
          practicaRealizada: {
            findMany: jest.fn().mockResolvedValue([
              { id: 'p1', monto: 5000, montoPagado: null },
              { id: 'p2', monto: 3000, montoPagado: 2500 },
            ]),
            updateMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
          liquidacionObraSocial: {
            create: jest.fn().mockResolvedValue({
              id: 'liq-1',
              obraSocialId: 'os-1',
              periodo: '2026-03',
              montoTotal: 7500,
              usuarioId: null,
              facturaId: null,
            }),
          },
        };
        return callback(txMock);
      });

      const dto = {
        profesionalId: 'prof-1',
        obraSocialId: 'os-1',
        periodo: '2026-03',
        practicaIds: ['p1', 'p2'],
      };

      await service.crearLoteLiquidacion(dto, undefined);

      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should resolve with the created liquidacion object', async () => {
      const expectedLiquidacion = {
        id: 'liq-1',
        obraSocialId: 'os-1',
        periodo: '2026-03',
        montoTotal: 7500,
        usuarioId: null,
        facturaId: null,
      };

      prisma.$transaction.mockImplementation(async (callback: any) => {
        const txMock = {
          practicaRealizada: {
            findMany: jest.fn().mockResolvedValue([
              { id: 'p1', monto: 5000, montoPagado: null },
              { id: 'p2', monto: 3000, montoPagado: 2500 },
            ]),
            updateMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
          liquidacionObraSocial: {
            create: jest.fn().mockResolvedValue(expectedLiquidacion),
          },
        };
        return callback(txMock);
      });

      const dto = {
        profesionalId: 'prof-1',
        obraSocialId: 'os-1',
        periodo: '2026-03',
        practicaIds: ['p1', 'p2'],
      };

      const result = await service.crearLoteLiquidacion(dto, undefined);

      expect(result).toEqual(expectedLiquidacion);
    });
  });
});
