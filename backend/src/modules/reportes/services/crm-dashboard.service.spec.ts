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
    mockPrismaService.paciente.count.mockResolvedValue(0);
    mockPrismaService.cirugia.count.mockResolvedValue(0);
    mockPrismaService.historiaClinicaEntrada.count.mockResolvedValue(0);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getKpis', () => {
    it('Test D: maps cirugia.count to cirugiasRealizadas and historiaClinicaEntrada.count to tratamientosRealizados', async () => {
      mockPrismaService.cirugia.count.mockResolvedValue(7);
      mockPrismaService.historiaClinicaEntrada.count.mockResolvedValue(4);

      const result = await service.getKpis('prof-X', 'mes');

      expect(result).toHaveProperty('cirugiasRealizadas', 7);
      expect(result).toHaveProperty('tratamientosRealizados', 4);
    });
  });
});
