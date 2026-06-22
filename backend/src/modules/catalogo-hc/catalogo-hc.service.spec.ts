/**
 * Unit tests for CatalogoHCService — renombrar/eliminar methods
 *
 * PrismaService is fully mocked — no DB required.
 * Pattern follows catalogo-hc.aprendizaje.service.spec.ts from this repo.
 */
import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CatalogoHCService } from './catalogo-hc.service';
import { PrismaService } from '../../prisma/prisma.service';

const PROF_ID = 'prof-1';
const ZONA_ID = 'zona-1';
const DX_ID = 'dx-1';
const TX_ID = 'tx-1';

function makeZona(
  overrides: Partial<{
    id: string;
    nombre: string;
    esSistema: boolean;
    profesionalId: string;
    activo: boolean;
  }> = {},
) {
  return {
    id: ZONA_ID,
    nombre: 'Abdomen',
    esSistema: false,
    profesionalId: PROF_ID,
    activo: true,
    orden: 1,
    ...overrides,
  };
}

function makeDx(
  overrides: Partial<{
    id: string;
    nombre: string;
    esSistema: boolean;
    profesionalId: string;
    zonaId: string;
    activo: boolean;
  }> = {},
) {
  return {
    id: DX_ID,
    nombre: 'Giba',
    esSistema: false,
    profesionalId: PROF_ID,
    zonaId: ZONA_ID,
    activo: true,
    orden: 1,
    ...overrides,
  };
}

function makeTx(
  overrides: Partial<{
    id: string;
    nombre: string;
    esSistema: boolean;
    profesionalId: string;
    zonaId: string;
    activo: boolean;
  }> = {},
) {
  return {
    id: TX_ID,
    nombre: 'Rinoplastia',
    esSistema: false,
    profesionalId: PROF_ID,
    zonaId: ZONA_ID,
    activo: true,
    orden: 1,
    tratamientoId: null,
    ...overrides,
  };
}

describe('CatalogoHCService — renombrar/eliminar', () => {
  let service: CatalogoHCService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma: any = {
      zonaHC: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      diagnosticoHC: {
        findUnique: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      tratamientoHC: {
        findUnique: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
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
  // renombrarZona
  // ===========================================================================
  describe('renombrarZona', () => {
    it('success: updates nombre and returns updated zona', async () => {
      const zona = makeZona();
      const updated = makeZona({ nombre: 'Cuello' });
      prisma.zonaHC.findUnique.mockResolvedValue(zona);
      prisma.zonaHC.update.mockResolvedValue(updated);

      const result = await service.renombrarZona(PROF_ID, ZONA_ID, 'Cuello');

      expect(prisma.zonaHC.update).toHaveBeenCalledWith({
        where: { id: ZONA_ID },
        data: { nombre: 'Cuello' },
      });
      expect(result).toEqual(updated);
    });

    it('throws NotFoundException when zona does not exist', async () => {
      prisma.zonaHC.findUnique.mockResolvedValue(null);
      await expect(
        service.renombrarZona(PROF_ID, ZONA_ID, 'Cuello'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when zona belongs to a different profesional', async () => {
      prisma.zonaHC.findUnique.mockResolvedValue(
        makeZona({ profesionalId: 'other-prof' }),
      );
      await expect(
        service.renombrarZona(PROF_ID, ZONA_ID, 'Cuello'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when esSistema=true', async () => {
      prisma.zonaHC.findUnique.mockResolvedValue(makeZona({ esSistema: true }));
      await expect(
        service.renombrarZona(PROF_ID, ZONA_ID, 'Cuello'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when nombre already exists (P2002)', async () => {
      prisma.zonaHC.findUnique.mockResolvedValue(makeZona());
      prisma.zonaHC.update.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.renombrarZona(PROF_ID, ZONA_ID, 'Mamas'),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ===========================================================================
  // renombrarDiagnostico
  // ===========================================================================
  describe('renombrarDiagnostico', () => {
    it('success: updates nombre and returns updated diagnostico', async () => {
      const dx = makeDx();
      const updated = makeDx({ nombre: 'Flacidez' });
      prisma.diagnosticoHC.findUnique.mockResolvedValue(dx);
      prisma.diagnosticoHC.update.mockResolvedValue(updated);

      const result = await service.renombrarDiagnostico(
        PROF_ID,
        DX_ID,
        'Flacidez',
      );

      expect(prisma.diagnosticoHC.update).toHaveBeenCalledWith({
        where: { id: DX_ID },
        data: { nombre: 'Flacidez' },
      });
      expect(result).toEqual(updated);
    });

    it('throws NotFoundException when diagnostico not found', async () => {
      prisma.diagnosticoHC.findUnique.mockResolvedValue(null);
      await expect(
        service.renombrarDiagnostico(PROF_ID, DX_ID, 'Flacidez'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when diagnostico belongs to different profesional', async () => {
      prisma.diagnosticoHC.findUnique.mockResolvedValue(
        makeDx({ profesionalId: 'other' }),
      );
      await expect(
        service.renombrarDiagnostico(PROF_ID, DX_ID, 'Flacidez'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when esSistema=true', async () => {
      prisma.diagnosticoHC.findUnique.mockResolvedValue(
        makeDx({ esSistema: true }),
      );
      await expect(
        service.renombrarDiagnostico(PROF_ID, DX_ID, 'Flacidez'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException on P2002', async () => {
      prisma.diagnosticoHC.findUnique.mockResolvedValue(makeDx());
      prisma.diagnosticoHC.update.mockRejectedValue({ code: 'P2002' });
      await expect(
        service.renombrarDiagnostico(PROF_ID, DX_ID, 'Flacidez'),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ===========================================================================
  // renombrarTratamiento
  // ===========================================================================
  describe('renombrarTratamiento', () => {
    it('success: updates nombre and returns updated tratamiento', async () => {
      const tx = makeTx();
      const updated = makeTx({ nombre: 'Lifting' });
      prisma.tratamientoHC.findUnique.mockResolvedValue(tx);
      prisma.tratamientoHC.update.mockResolvedValue(updated);

      const result = await service.renombrarTratamiento(
        PROF_ID,
        TX_ID,
        'Lifting',
      );

      expect(prisma.tratamientoHC.update).toHaveBeenCalledWith({
        where: { id: TX_ID },
        data: { nombre: 'Lifting' },
      });
      expect(result).toEqual(updated);
    });

    it('throws NotFoundException when tratamiento not found', async () => {
      prisma.tratamientoHC.findUnique.mockResolvedValue(null);
      await expect(
        service.renombrarTratamiento(PROF_ID, TX_ID, 'Lifting'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when tratamiento belongs to different profesional', async () => {
      prisma.tratamientoHC.findUnique.mockResolvedValue(
        makeTx({ profesionalId: 'other' }),
      );
      await expect(
        service.renombrarTratamiento(PROF_ID, TX_ID, 'Lifting'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when esSistema=true', async () => {
      prisma.tratamientoHC.findUnique.mockResolvedValue(
        makeTx({ esSistema: true }),
      );
      await expect(
        service.renombrarTratamiento(PROF_ID, TX_ID, 'Lifting'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException on P2002', async () => {
      prisma.tratamientoHC.findUnique.mockResolvedValue(makeTx());
      prisma.tratamientoHC.update.mockRejectedValue({ code: 'P2002' });
      await expect(
        service.renombrarTratamiento(PROF_ID, TX_ID, 'Lifting'),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ===========================================================================
  // eliminarZona
  // ===========================================================================
  describe('eliminarZona', () => {
    it('success: sets zona activo=false and cascades to diagnosticos + tratamientos', async () => {
      const zona = makeZona();
      prisma.zonaHC.findUnique.mockResolvedValue(zona);
      prisma.$transaction.mockImplementation(async (ops: any[]) => {
        return Promise.all(ops);
      });
      prisma.zonaHC.update.mockResolvedValue({ ...zona, activo: false });
      prisma.diagnosticoHC.updateMany.mockResolvedValue({ count: 2 });
      prisma.tratamientoHC.updateMany.mockResolvedValue({ count: 1 });

      await service.eliminarZona(PROF_ID, ZONA_ID);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('does NOT call zonaHC.delete or diagnosticoHC.delete', async () => {
      const zona = makeZona();
      prisma.zonaHC.findUnique.mockResolvedValue(zona);
      prisma.$transaction.mockImplementation(async (ops: any[]) =>
        Promise.all(ops),
      );
      prisma.zonaHC.update.mockResolvedValue({ ...zona, activo: false });
      prisma.diagnosticoHC.updateMany.mockResolvedValue({ count: 0 });
      prisma.tratamientoHC.updateMany.mockResolvedValue({ count: 0 });

      await service.eliminarZona(PROF_ID, ZONA_ID);

      // Hard-deletes must never be called
      expect(prisma.zonaHC.delete).toBeUndefined();
      expect(prisma.diagnosticoHC.delete).toBeUndefined();
      expect(prisma.tratamientoHC.delete).toBeUndefined();
    });

    it('throws NotFoundException when zona not found', async () => {
      prisma.zonaHC.findUnique.mockResolvedValue(null);
      await expect(service.eliminarZona(PROF_ID, ZONA_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when zona belongs to different profesional', async () => {
      prisma.zonaHC.findUnique.mockResolvedValue(
        makeZona({ profesionalId: 'other' }),
      );
      await expect(service.eliminarZona(PROF_ID, ZONA_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when esSistema=true', async () => {
      prisma.zonaHC.findUnique.mockResolvedValue(makeZona({ esSistema: true }));
      await expect(service.eliminarZona(PROF_ID, ZONA_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ===========================================================================
  // eliminarDiagnostico
  // ===========================================================================
  describe('eliminarDiagnostico', () => {
    it('success: sets activo=false on diagnostico only', async () => {
      const dx = makeDx();
      prisma.diagnosticoHC.findUnique.mockResolvedValue(dx);
      prisma.diagnosticoHC.update.mockResolvedValue({ ...dx, activo: false });

      await service.eliminarDiagnostico(PROF_ID, DX_ID);

      expect(prisma.diagnosticoHC.update).toHaveBeenCalledWith({
        where: { id: DX_ID },
        data: { activo: false },
      });
    });

    it('throws NotFoundException when not found', async () => {
      prisma.diagnosticoHC.findUnique.mockResolvedValue(null);
      await expect(service.eliminarDiagnostico(PROF_ID, DX_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when belongs to different profesional', async () => {
      prisma.diagnosticoHC.findUnique.mockResolvedValue(
        makeDx({ profesionalId: 'other' }),
      );
      await expect(service.eliminarDiagnostico(PROF_ID, DX_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when esSistema=true', async () => {
      prisma.diagnosticoHC.findUnique.mockResolvedValue(
        makeDx({ esSistema: true }),
      );
      await expect(service.eliminarDiagnostico(PROF_ID, DX_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ===========================================================================
  // eliminarTratamiento
  // ===========================================================================
  describe('eliminarTratamiento', () => {
    it('success: sets activo=false on tratamiento only', async () => {
      const tx = makeTx();
      prisma.tratamientoHC.findUnique.mockResolvedValue(tx);
      prisma.tratamientoHC.update.mockResolvedValue({ ...tx, activo: false });

      await service.eliminarTratamiento(PROF_ID, TX_ID);

      expect(prisma.tratamientoHC.update).toHaveBeenCalledWith({
        where: { id: TX_ID },
        data: { activo: false },
      });
    });

    it('throws NotFoundException when not found', async () => {
      prisma.tratamientoHC.findUnique.mockResolvedValue(null);
      await expect(service.eliminarTratamiento(PROF_ID, TX_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when belongs to different profesional', async () => {
      prisma.tratamientoHC.findUnique.mockResolvedValue(
        makeTx({ profesionalId: 'other' }),
      );
      await expect(service.eliminarTratamiento(PROF_ID, TX_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when esSistema=true', async () => {
      prisma.tratamientoHC.findUnique.mockResolvedValue(
        makeTx({ esSistema: true }),
      );
      await expect(service.eliminarTratamiento(PROF_ID, TX_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
