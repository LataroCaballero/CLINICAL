/**
 * Unit tests for CatalogoHCService.aprenderDesdeZonas
 *
 * PrismaService is fully mocked — no DB required.
 * Pattern follows afip-config.service.spec.ts from this repo.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { CatalogoHCService } from './catalogo-hc.service';
import { PrismaService } from '../../prisma/prisma.service';

// Snapshot helpers
function makeZonaSnap(
  id: string,
  nombre: string,
  activo: boolean,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  diagnosticos: any[] = [],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tratamientos: any[] = [],
  orden = 1,
  esSistema = false,
) {
  return { id, nombre, activo, orden, esSistema, diagnosticos, tratamientos };
}

// Seed-like snapshot with 5 non-system zones (ordenes 1–5) + "Otros" sistema
function buildSeedSnapshot() {
  return [
    makeZonaSnap('z-abd', 'Abdomen', true, [], [], 1),
    makeZonaSnap('z-mam', 'Mamas', true, [], [], 2),
    makeZonaSnap(
      'z-naz',
      'Nariz',
      true,
      [{ id: 'dx-rin', nombre: 'Rinoplastia', activo: true }],
      [],
      3,
    ),
    makeZonaSnap('z-fac', 'Facial', true, [], [], 4),
    makeZonaSnap('z-loc', 'Locales', true, [], [], 5),
    makeZonaSnap('z-otr', 'Otros', true, [], [], 9999, true),
  ];
}

describe('CatalogoHCService.aprenderDesdeZonas', () => {
  let service: CatalogoHCService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;

  const PROF_ID = 'prof-1';

  beforeEach(async () => {
    const mockPrisma: any = {
      zonaHC: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      diagnosticoHC: {
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      tratamientoHC: {
        create: jest.fn(),
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

  // ---------------------------------------------------------------------------
  // Test 1: Zona nueva → llama crearZona con orden = max no-sistema + 1
  // ---------------------------------------------------------------------------
  it('Test 1: zona nueva crea zona con orden = max(no-sistema) + 1', async () => {
    // Snapshot has ordenes 1-5 (non-system) + 9999 (system) → new orden = 6
    prisma.zonaHC.findMany.mockResolvedValue(buildSeedSnapshot() as any);
    // crearZona calls zonaHC.findUnique (idempotency check) then $transaction
    prisma.zonaHC.findUnique.mockResolvedValue(null);
    const newZona = {
      id: 'z-new',
      nombre: 'Cuello',
      orden: 6,
      esSistema: false,
    };
    prisma.$transaction.mockImplementation(async (fn: any) =>
      fn({
        zonaHC: { create: jest.fn().mockResolvedValue(newZona) },
        diagnosticoHC: { create: jest.fn().mockResolvedValue({}) },
        tratamientoHC: { create: jest.fn().mockResolvedValue({}) },
      }),
    );
    prisma.tratamiento.findMany.mockResolvedValue([]);

    await service.aprenderDesdeZonas(PROF_ID, [
      { zona: 'Cuello', diagnosticos: [], tratamientos: [] },
    ]);

    // crearZona is called with orden=6 (max non-system=5, +1)
    expect(prisma.zonaHC.findUnique).toHaveBeenCalledWith({
      where: {
        nombre_profesionalId: { nombre: 'Cuello', profesionalId: PROF_ID },
      },
    });
    // $transaction was called to create the zona
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Test 2: Diagnóstico nuevo en zona existente → diagnosticoHC.create
  // ---------------------------------------------------------------------------
  it('Test 2: dx nuevo en zona existente → diagnosticoHC.create con zonaId y orden correcto', async () => {
    const zonaAbdSnap = makeZonaSnap(
      'z-abd',
      'Abdomen',
      true,
      [
        {
          id: 'dx-1',
          nombre: 'Piel',
          activo: true,
          orden: 1,
          esSistema: false,
        },
        {
          id: 'dx-2',
          nombre: 'Grasa',
          activo: true,
          orden: 2,
          esSistema: false,
        },
        // orden 1 and 2, so next = 3
      ],
      [],
      1,
    );
    prisma.zonaHC.findMany.mockResolvedValue([zonaAbdSnap] as any);
    prisma.tratamiento.findMany.mockResolvedValue([]);

    const createdDx = { id: 'dx-new', nombre: 'Flacidez abdominal', orden: 3 };
    prisma.diagnosticoHC.create.mockResolvedValue(createdDx as any);

    await service.aprenderDesdeZonas(PROF_ID, [
      {
        zona: 'Abdomen',
        diagnosticos: ['flacidez abdominal'],
        tratamientos: [],
      },
    ]);

    expect(prisma.diagnosticoHC.create).toHaveBeenCalledWith({
      data: {
        nombre: 'Flacidez abdominal',
        orden: 3,
        esSistema: false,
        zonaId: 'z-abd',
        profesionalId: PROF_ID,
      },
    });
  });

  // ---------------------------------------------------------------------------
  // Test 3: APR-04 sin match → tratamiento.create(precio:0) + tratamientoHC.create
  // ---------------------------------------------------------------------------
  it('Test 3 (APR-04 sin match): tx nuevo sin match → crea Tratamiento precio 0 y TratamientoHC', async () => {
    const zonaSnap = makeZonaSnap('z-abd', 'Abdomen', true, [], [], 1);
    prisma.zonaHC.findMany.mockResolvedValue([zonaSnap] as any);
    prisma.tratamiento.findMany.mockResolvedValue([]); // no existing Tratamientos

    const createdTratamiento = {
      id: 't-new',
      nombre: 'Flacidez cutánea',
      precio: 0,
    };
    prisma.tratamiento.create.mockResolvedValue(createdTratamiento as any);
    prisma.tratamientoHC.create.mockResolvedValue({ id: 'thc-new' } as any);

    await service.aprenderDesdeZonas(PROF_ID, [
      {
        zona: 'Abdomen',
        diagnosticos: [],
        tratamientos: [{ nombre: 'Flacidez cutánea' }],
      },
    ]);

    expect(prisma.tratamiento.create).toHaveBeenCalledWith({
      data: {
        nombre: 'Flacidez cutánea',
        precio: 0,
        profesionalId: PROF_ID,
      },
    });
    expect(prisma.tratamientoHC.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        nombre: 'Flacidez cutánea',
        zonaId: 'z-abd',
        profesionalId: PROF_ID,
        tratamientoId: 't-new',
      }),
    });
  });

  // ---------------------------------------------------------------------------
  // Test 4: APR-04 con match insensible → NO crea Tratamiento; reutiliza id
  // ---------------------------------------------------------------------------
  it('Test 4 (APR-04 con match): rinoplastia matchea Rinoplastia → NO crea Tratamiento, reutiliza FK', async () => {
    const zonaSnap = makeZonaSnap('z-naz', 'Nariz', true, [], [], 3);
    prisma.zonaHC.findMany.mockResolvedValue([zonaSnap] as any);
    // Existing Tratamiento in price catalog
    prisma.tratamiento.findMany.mockResolvedValue([
      { id: 't-rin', nombre: 'Rinoplastia' },
    ] as any);
    prisma.tratamientoHC.create.mockResolvedValue({ id: 'thc-1' } as any);

    await service.aprenderDesdeZonas(PROF_ID, [
      {
        zona: 'Nariz',
        diagnosticos: [],
        tratamientos: [{ nombre: 'rinoplastia' }],
      },
    ]);

    // No new Tratamiento should be created
    expect(prisma.tratamiento.create).not.toHaveBeenCalled();
    // TratamientoHC created with the existing tratamientoId
    expect(prisma.tratamientoHC.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tratamientoId: 't-rin',
      }),
    });
  });

  // ---------------------------------------------------------------------------
  // Test 5: Ítems a reactivar → updateMany con activo:true; nada se crea
  // ---------------------------------------------------------------------------
  it('Test 5: ítems inactivos → updateMany({ activo: true }), ningún create', async () => {
    const zonaInactiva = makeZonaSnap('z-inact', 'Cuello', false, [], [], 6);
    const dxInactivo = { id: 'dx-inact', nombre: 'Flacidez', activo: false };
    const txInactivo = { id: 'tx-inact', nombre: 'Lifting', activo: false };
    const zonaConItems = makeZonaSnap(
      'z-abd',
      'Abdomen',
      true,
      [dxInactivo],
      [txInactivo],
      1,
    );

    prisma.zonaHC.findMany.mockResolvedValue([
      zonaInactiva,
      zonaConItems,
    ] as any);
    prisma.zonaHC.updateMany.mockResolvedValue({ count: 1 } as any);
    prisma.diagnosticoHC.updateMany.mockResolvedValue({ count: 1 } as any);
    prisma.tratamientoHC.updateMany.mockResolvedValue({ count: 1 } as any);
    prisma.tratamiento.findMany.mockResolvedValue([]);

    await service.aprenderDesdeZonas(PROF_ID, [
      { zona: 'Cuello', diagnosticos: [], tratamientos: [] },
      {
        zona: 'Abdomen',
        diagnosticos: ['Flacidez'],
        tratamientos: [{ nombre: 'Lifting' }],
      },
    ]);

    // Zone reactivation
    expect(prisma.zonaHC.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['z-inact'] } },
      data: { activo: true },
    });

    // Diagnostic reactivation
    expect(prisma.diagnosticoHC.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['dx-inact'] } },
      data: { activo: true },
    });

    // Treatment reactivation
    expect(prisma.tratamientoHC.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['tx-inact'] } },
      data: { activo: true },
    });

    // Nothing should be created
    expect(prisma.diagnosticoHC.create).not.toHaveBeenCalled();
    expect(prisma.tratamientoHC.create).not.toHaveBeenCalled();
    expect(prisma.tratamiento.create).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Test 6: Sin novedades → ninguna escritura
  // ---------------------------------------------------------------------------
  it('Test 6: input sin novedades → ninguna escritura a BD', async () => {
    const zonaSnap = makeZonaSnap(
      'z-naz',
      'Nariz',
      true,
      [{ id: 'dx-1', nombre: 'Giba', activo: true }],
      [{ id: 'tx-1', nombre: 'Rinoplastia', activo: true }],
      3,
    );
    prisma.zonaHC.findMany.mockResolvedValue([zonaSnap] as any);

    await service.aprenderDesdeZonas(PROF_ID, [
      {
        zona: 'Nariz',
        diagnosticos: ['Giba'],
        tratamientos: [{ nombre: 'rinoplastia' }],
      },
    ]);

    expect(prisma.zonaHC.updateMany).not.toHaveBeenCalled();
    expect(prisma.diagnosticoHC.updateMany).not.toHaveBeenCalled();
    expect(prisma.tratamientoHC.updateMany).not.toHaveBeenCalled();
    expect(prisma.zonaHC.findUnique).not.toHaveBeenCalled(); // crearZona not called
    expect(prisma.diagnosticoHC.create).not.toHaveBeenCalled();
    expect(prisma.tratamientoHC.create).not.toHaveBeenCalled();
    expect(prisma.tratamiento.create).not.toHaveBeenCalled();
    // tratamiento.findMany not loaded (early return before tx section)
    expect(prisma.tratamiento.findMany).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Test 7: dx/tx de zona nueva → se crean con id devuelto por crearZona
  // ---------------------------------------------------------------------------
  it('Test 7: dx/tx de zona nueva → se crean colgados del id de la nueva zona', async () => {
    // Snapshot without the new zone
    prisma.zonaHC.findMany.mockResolvedValue([
      makeZonaSnap('z-abd', 'Abdomen', true, [], [], 1),
    ] as any);
    prisma.zonaHC.findUnique.mockResolvedValue(null);

    const newZona = {
      id: 'z-cuello',
      nombre: 'Cuello',
      orden: 2,
      esSistema: false,
    };
    prisma.$transaction.mockImplementation(async (fn: any) =>
      fn({
        zonaHC: { create: jest.fn().mockResolvedValue(newZona) },
        diagnosticoHC: { create: jest.fn().mockResolvedValue({}) },
        tratamientoHC: { create: jest.fn().mockResolvedValue({}) },
      }),
    );

    prisma.tratamiento.findMany.mockResolvedValue([]);
    prisma.diagnosticoHC.create.mockResolvedValue({ id: 'dx-new' } as any);
    prisma.tratamientoHC.create.mockResolvedValue({ id: 'thc-new' } as any);
    prisma.tratamiento.create.mockResolvedValue({
      id: 't-new',
      nombre: 'Lifting cervical',
      precio: 0,
    } as any);

    await service.aprenderDesdeZonas(PROF_ID, [
      {
        zona: 'Cuello',
        diagnosticos: ['Flacidez cutánea'],
        tratamientos: [{ nombre: 'Lifting cervical' }],
      },
    ]);

    // DiagnosticoHC must reference the new zona id
    expect(prisma.diagnosticoHC.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ zonaId: 'z-cuello' }),
    });

    // TratamientoHC must reference the new zona id
    expect(prisma.tratamientoHC.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ zonaId: 'z-cuello' }),
    });
  });
});
