/**
 * Unit tests for CatalogoHCService — flat per-professional catalog methods
 * (antecedentes / alergias / medicamentos)
 *
 * TDD RED phase: these tests drive the implementation of:
 *   seedAntecedentesInicial, seedAlergiasInicial, seedMedicamentosInicial
 *   getAntecedentesConSeed, getAlergiasConSeed, getMedicamentosConSeed
 *   aprenderDesdePreoperatorio (+ private aprenderDesdeFlat)
 *
 * PrismaService is fully mocked — no DB required.
 * Pattern follows catalogo-hc.service.spec.ts from this repo.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { CatalogoHCService } from './catalogo-hc.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SEED_ANTECEDENTES } from './catalogo-hc.seed-data';

const PROF_ID = 'prof-flat-1';

function makeAntecedente(
  overrides: Partial<{
    id: string;
    nombre: string;
    esSistema: boolean;
    activo: boolean;
    profesionalId: string;
  }> = {},
) {
  return {
    id: 'ant-1',
    nombre: 'Hipertensión',
    esSistema: true,
    activo: true,
    profesionalId: PROF_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('CatalogoHCService — flat catalog (antecedentes/alergias/medicamentos)', () => {
  let service: CatalogoHCService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma: any = {
      zonaHC: {
        count: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      antecedenteCatalogoPro: {
        count: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      alergiaCatalogoPro: {
        count: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      medicamentoCatalogoPro: {
        count: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      diagnosticoHC: {
        create: jest.fn(),
        createMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      tratamientoHC: {
        create: jest.fn(),
        createMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      tratamiento: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogoHCService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CatalogoHCService>(CatalogoHCService);
    prisma = module.get<any>(PrismaService);
  });

  // ===========================================================================
  // seedAntecedentesInicial
  // ===========================================================================
  describe('seedAntecedentesInicial', () => {
    it('creates SEED_ANTECEDENTES rows with esSistema:true when catalog is empty', async () => {
      prisma.antecedenteCatalogoPro.count.mockResolvedValue(0);
      prisma.antecedenteCatalogoPro.createMany.mockResolvedValue({
        count: SEED_ANTECEDENTES.length,
      });

      await service.seedAntecedentesInicial(PROF_ID);

      expect(prisma.antecedenteCatalogoPro.createMany).toHaveBeenCalledWith({
        data: SEED_ANTECEDENTES.map((nombre) => ({
          nombre,
          profesionalId: PROF_ID,
          esSistema: true,
        })),
        skipDuplicates: true,
      });
    });

    it('is a no-op when catalog already has rows (idempotent)', async () => {
      prisma.antecedenteCatalogoPro.count.mockResolvedValue(5);

      await service.seedAntecedentesInicial(PROF_ID);

      expect(prisma.antecedenteCatalogoPro.createMany).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // getAntecedentesConSeed
  // ===========================================================================
  describe('getAntecedentesConSeed', () => {
    it('returns existing rows without seeding when catalog already has data', async () => {
      const existing = [makeAntecedente()];
      prisma.antecedenteCatalogoPro.findMany.mockResolvedValue(existing);

      const result = await service.getAntecedentesConSeed(PROF_ID);

      expect(result).toEqual(existing);
      // count should NOT be called — lazy-seed reads first, seeds only if empty
      expect(prisma.antecedenteCatalogoPro.count).not.toHaveBeenCalled();
    });

    it('seeds and re-queries when catalog is empty on first call', async () => {
      const seeded = SEED_ANTECEDENTES.map((nombre, i) =>
        makeAntecedente({ id: `seed-${i}`, nombre }),
      );

      // First findMany: empty → triggers seed; second findMany: seeded data
      prisma.antecedenteCatalogoPro.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(seeded);
      prisma.antecedenteCatalogoPro.count.mockResolvedValue(0);
      prisma.antecedenteCatalogoPro.createMany.mockResolvedValue({
        count: seeded.length,
      });

      const result = await service.getAntecedentesConSeed(PROF_ID);

      expect(prisma.antecedenteCatalogoPro.createMany).toHaveBeenCalled();
      expect(result).toEqual(seeded);
    });
  });

  // ===========================================================================
  // aprenderDesdePreoperatorio
  // ===========================================================================
  describe('aprenderDesdePreoperatorio', () => {
    // Snapshot: Hipertensión (active), Diabetes (inactive)
    const SNAP = [
      { id: 'a1', nombre: 'Hipertensión', activo: true },
      { id: 'a2', nombre: 'Diabetes', activo: false },
    ];

    beforeEach(() => {
      prisma.antecedenteCatalogoPro.findMany.mockResolvedValue(SNAP);
      prisma.alergiaCatalogoPro.findMany.mockResolvedValue([]);
      prisma.medicamentoCatalogoPro.findMany.mockResolvedValue([]);
      prisma.antecedenteCatalogoPro.create.mockResolvedValue({});
      prisma.antecedenteCatalogoPro.updateMany.mockResolvedValue({ count: 1 });
    });

    it('creates a new row (esSistema:false) for a name not in the catalog', async () => {
      await service.aprenderDesdePreoperatorio(PROF_ID, {
        antecedentes: ['Epilepsia nueva'],
      });

      expect(prisma.antecedenteCatalogoPro.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nombre: 'Epilepsia nueva',
          profesionalId: PROF_ID,
          esSistema: false,
        }),
      });
    });

    it('reactivates an inactive row instead of creating a new one', async () => {
      await service.aprenderDesdePreoperatorio(PROF_ID, {
        antecedentes: ['Diabetes'],
      });

      expect(prisma.antecedenteCatalogoPro.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['a2'] } },
        data: { activo: true },
      });
      expect(prisma.antecedenteCatalogoPro.create).not.toHaveBeenCalled();
    });

    it('is a no-op for a name that is already active', async () => {
      await service.aprenderDesdePreoperatorio(PROF_ID, {
        antecedentes: ['Hipertensión'],
      });

      expect(prisma.antecedenteCatalogoPro.create).not.toHaveBeenCalled();
      expect(prisma.antecedenteCatalogoPro.updateMany).not.toHaveBeenCalled();
    });

    it('is case/accent-insensitive for dedup (HIPERTENSION matches Hipertensión)', async () => {
      await service.aprenderDesdePreoperatorio(PROF_ID, {
        antecedentes: ['HIPERTENSION'],
      });

      expect(prisma.antecedenteCatalogoPro.create).not.toHaveBeenCalled();
      expect(prisma.antecedenteCatalogoPro.updateMany).not.toHaveBeenCalled();
    });

    it('does not throw even if an internal error occurs (best-effort)', async () => {
      prisma.antecedenteCatalogoPro.findMany.mockRejectedValue(
        new Error('DB error'),
      );

      await expect(
        service.aprenderDesdePreoperatorio(PROF_ID, {
          antecedentes: ['Cualquier cosa'],
        }),
      ).resolves.not.toThrow();
    });

    it('skips processing and does not call DB when all arrays are empty/absent', async () => {
      await service.aprenderDesdePreoperatorio(PROF_ID, {});

      expect(prisma.antecedenteCatalogoPro.findMany).not.toHaveBeenCalled();
      expect(prisma.alergiaCatalogoPro.findMany).not.toHaveBeenCalled();
      expect(prisma.medicamentoCatalogoPro.findMany).not.toHaveBeenCalled();
    });

    it('scopes all writes to the provided profesionalId (never leaks to another pro)', async () => {
      await service.aprenderDesdePreoperatorio(PROF_ID, {
        antecedentes: ['Epilepsia nueva'],
      });

      const createCall = prisma.antecedenteCatalogoPro.create.mock.calls[0][0];
      expect(createCall.data.profesionalId).toBe(PROF_ID);
    });
  });
});
