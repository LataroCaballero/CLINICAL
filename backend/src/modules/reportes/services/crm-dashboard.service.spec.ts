import { Test, TestingModule } from '@nestjs/testing';
import { CrmDashboardService } from './crm-dashboard.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('CrmDashboardService', () => {
  let service: CrmDashboardService;

  const mockPrismaService = {
    paciente: {
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    presupuesto: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    cirugia: {
      count: jest.fn().mockResolvedValue(0),
    },
    historiaClinicaEntrada: {
      count: jest.fn().mockResolvedValue(0),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrmDashboardService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CrmDashboardService>(CrmDashboardService);
    jest.clearAllMocks();
    // Default: paciente.count retorna 0 para que el resto de getKpis no rompa
    mockPrismaService.paciente.count.mockResolvedValue(0);
    mockPrismaService.cirugia.count.mockResolvedValue(0);
    mockPrismaService.historiaClinicaEntrada.count.mockResolvedValue(0);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getKpis', () => {
    /**
     * Test A (invariante etapa): las consultas de conteo NO usan etapaCRM.
     * Un cambio de etapa del paciente a PERDIDO no puede alterar cirugiasRealizadas
     * ni tratamientosRealizados porque las consultas no leen etapaCRM.
     */
    it('Test A: cirugia.count is NOT called with etapaCRM in where clause', async () => {
      await service.getKpis('prof-X', 'mes');

      expect(mockPrismaService.cirugia.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ etapaCRM: expect.anything() }),
        }),
      );
    });

    it('Test A: historiaClinicaEntrada.count is NOT called with etapaCRM in where clause', async () => {
      await service.getKpis('prof-X', 'mes');

      expect(mockPrismaService.historiaClinicaEntrada.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ etapaCRM: expect.anything() }),
        }),
      );
    });

    /**
     * Test B (definición de cirugía realizada): la consulta usa fecha < ahora
     * y estado notIn CANCELADA/SUSPENDIDA — idéntica al scheduler.
     */
    it('Test B: cirugia.count uses fecha lt and estado notIn CANCELADA/SUSPENDIDA', async () => {
      await service.getKpis('prof-X', 'mes');

      expect(mockPrismaService.cirugia.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            fecha: expect.objectContaining({ lt: expect.any(Date) }),
            estado: expect.objectContaining({
              notIn: expect.arrayContaining(['CANCELADA', 'SUSPENDIDA']),
            }),
          }),
        }),
      );
    });

    /**
     * Test C (scoping multi-tenant): ambas consultas filtran por profesionalId
     * para preservar el aislamiento entre clínicas/profesionales.
     */
    it('Test C: cirugia.count is scoped by profesionalId', async () => {
      await service.getKpis('prof-X', 'mes');

      expect(mockPrismaService.cirugia.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ profesionalId: 'prof-X' }),
        }),
      );
    });

    it('Test C: historiaClinicaEntrada.count is scoped by historiaClinica.profesionalId', async () => {
      await service.getKpis('prof-X', 'mes');

      expect(mockPrismaService.historiaClinicaEntrada.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            historiaClinica: expect.objectContaining({ profesionalId: 'prof-X' }),
          }),
        }),
      );
    });

    it('Test C: a different profesionalId (prof-Y) passes its own id to both queries', async () => {
      await service.getKpis('prof-Y', 'mes');

      expect(mockPrismaService.cirugia.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ profesionalId: 'prof-Y' }),
        }),
      );
      expect(mockPrismaService.historiaClinicaEntrada.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            historiaClinica: expect.objectContaining({ profesionalId: 'prof-Y' }),
          }),
        }),
      );
    });

    /**
     * Test D (mapeo de salida): el resultado incluye cirugiasRealizadas y
     * tratamientosRealizados con los valores retornados por los mocks.
     */
    it('Test D: maps cirugia.count to cirugiasRealizadas and historiaClinicaEntrada.count to tratamientosRealizados', async () => {
      mockPrismaService.cirugia.count.mockResolvedValue(7);
      mockPrismaService.historiaClinicaEntrada.count.mockResolvedValue(4);

      const result = await service.getKpis('prof-X', 'mes');

      expect(result.cirugiasRealizadas).toBe(7);
      expect(result.tratamientosRealizados).toBe(4);
    });
  });
});
