/**
 * Unit tests for the HC catalog learning detection engine.
 *
 * Tests follow TDD RED phase: import from the (not yet existing) helper
 * to verify all rules before implementation.
 */
import {
  formatearNombreAprendido,
  detectarAprendizaje,
  AccionesAprendizaje,
  SnapshotZona,
  ZonaAprendizajeInput,
} from './catalogo-hc.aprendizaje.helpers';

// ---------------------------------------------------------------------------
// Helpers for snapshot construction
// ---------------------------------------------------------------------------
function makeZona(
  id: string,
  nombre: string,
  activo: boolean,
  diagnosticos: { id: string; nombre: string; activo: boolean }[] = [],
  tratamientos: { id: string; nombre: string; activo: boolean }[] = [],
): SnapshotZona {
  return { id, nombre, activo, diagnosticos, tratamientos };
}

// ---------------------------------------------------------------------------
// formatearNombreAprendido
// ---------------------------------------------------------------------------
describe('formatearNombreAprendido', () => {
  it('trim + primera mayúscula, resto intacto', () => {
    expect(formatearNombreAprendido('flacidez abdominal ')).toBe(
      'Flacidez abdominal',
    );
  });

  it('si la primera letra ya es mayúscula no cambia el resto', () => {
    expect(formatearNombreAprendido('BOTOX Cuello')).toBe('BOTOX Cuello');
  });

  it('funciona con acentos en la primera letra', () => {
    expect(formatearNombreAprendido('  ácido nuevo')).toBe('Ácido nuevo');
  });

  it('string vacío devuelve vacío', () => {
    expect(formatearNombreAprendido('')).toBe('');
  });

  it('solo espacios devuelve vacío', () => {
    expect(formatearNombreAprendido('   ')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// detectarAprendizaje — zonas (APR-01)
// ---------------------------------------------------------------------------
describe('detectarAprendizaje — zonas', () => {
  it('zona nueva no existente en catálogo → zonasACrear', () => {
    const catalogo: SnapshotZona[] = [];
    const zonas: ZonaAprendizajeInput[] = [
      { zona: 'cuello', diagnosticos: [], tratamientos: [] },
    ];
    const resultado = detectarAprendizaje(catalogo, zonas);
    expect(resultado.zonasACrear).toEqual(['Cuello']);
    expect(resultado.zonasAReactivar).toEqual([]);
  });

  it('zona existente activa (match insensible a mayúsculas) → sin acciones', () => {
    const catalogo: SnapshotZona[] = [makeZona('z1', 'Abdomen', true)];
    const zonas: ZonaAprendizajeInput[] = [
      { zona: 'ABDOMEN', diagnosticos: [], tratamientos: [] },
    ];
    const resultado = detectarAprendizaje(catalogo, zonas);
    expect(resultado.zonasACrear).toEqual([]);
    expect(resultado.zonasAReactivar).toEqual([]);
  });

  it('zona que matchea ZonaHC inactiva → zonasAReactivar, NO en zonasACrear', () => {
    const catalogo: SnapshotZona[] = [makeZona('z-cuello', 'Cuello', false)];
    const zonas: ZonaAprendizajeInput[] = [
      { zona: 'Cuello', diagnosticos: [], tratamientos: [] },
    ];
    const resultado = detectarAprendizaje(catalogo, zonas);
    expect(resultado.zonasAReactivar).toContain('z-cuello');
    expect(resultado.zonasACrear).toEqual([]);
  });

  it('"otros" nunca se aprende', () => {
    const resultado = detectarAprendizaje(
      [],
      [{ zona: 'otros', diagnosticos: [], tratamientos: [] }],
    );
    expect(resultado.zonasACrear).toEqual([]);
    expect(resultado.zonasAReactivar).toEqual([]);
  });

  it('"Otros" (capitalizado) nunca se aprende', () => {
    const resultado = detectarAprendizaje(
      [],
      [{ zona: 'Otros', diagnosticos: [], tratamientos: [] }],
    );
    expect(resultado.zonasACrear).toEqual([]);
  });

  it('zona vacía → sin acciones', () => {
    const resultado = detectarAprendizaje(
      [],
      [{ zona: '', diagnosticos: [], tratamientos: [] }],
    );
    expect(resultado.zonasACrear).toEqual([]);
  });

  it('zona solo espacios → sin acciones', () => {
    const resultado = detectarAprendizaje(
      [],
      [{ zona: '   ', diagnosticos: [], tratamientos: [] }],
    );
    expect(resultado.zonasACrear).toEqual([]);
  });

  it('dos zonas del input que normalizan igual → una sola acción (dedupe)', () => {
    const resultado = detectarAprendizaje(
      [],
      [
        { zona: 'cuello', diagnosticos: [], tratamientos: [] },
        { zona: 'Cuello ', diagnosticos: [], tratamientos: [] },
      ],
    );
    expect(resultado.zonasACrear).toHaveLength(1);
    expect(resultado.zonasACrear).toEqual(['Cuello']);
  });
});

// ---------------------------------------------------------------------------
// detectarAprendizaje — diagnósticos (APR-02)
// ---------------------------------------------------------------------------
describe('detectarAprendizaje — diagnósticos', () => {
  it('dx nuevo en zona existente activa → diagnosticosACrear', () => {
    const catalogo: SnapshotZona[] = [makeZona('z-abd', 'Abdomen', true)];
    const zonas: ZonaAprendizajeInput[] = [
      { zona: 'Abdomen', diagnosticos: ['flacidez'], tratamientos: [] },
    ];
    const resultado = detectarAprendizaje(catalogo, zonas);
    expect(resultado.diagnosticosACrear).toContainEqual({
      zonaNombre: 'Abdomen',
      nombre: 'Flacidez',
    });
  });

  it('dx existente activo en esa zona → sin acciones (match insensible)', () => {
    const catalogo: SnapshotZona[] = [
      makeZona('z-abd', 'Abdomen', true, [
        { id: 'd1', nombre: 'Piel', activo: true },
      ]),
    ];
    const zonas: ZonaAprendizajeInput[] = [
      { zona: 'ABDOMEN', diagnosticos: ['PIEL'], tratamientos: [] },
    ];
    const resultado = detectarAprendizaje(catalogo, zonas);
    expect(resultado.diagnosticosACrear).toEqual([]);
    expect(resultado.diagnosticosAReactivar).toEqual([]);
  });

  it('dx que matchea DiagnosticoHC inactivo de esa zona → diagnosticosAReactivar', () => {
    const catalogo: SnapshotZona[] = [
      makeZona('z-abd', 'Abdomen', true, [
        { id: 'd-flac', nombre: 'Flacidez', activo: false },
      ]),
    ];
    const zonas: ZonaAprendizajeInput[] = [
      { zona: 'Abdomen', diagnosticos: ['flacidez'], tratamientos: [] },
    ];
    const resultado = detectarAprendizaje(catalogo, zonas);
    expect(resultado.diagnosticosAReactivar).toContain('d-flac');
    expect(resultado.diagnosticosACrear).toEqual([]);
  });

  it('"Otros" seleccionado como dx → nunca se aprende', () => {
    const catalogo: SnapshotZona[] = [makeZona('z-abd', 'Abdomen', true)];
    const zonas: ZonaAprendizajeInput[] = [
      { zona: 'Abdomen', diagnosticos: ['Otros'], tratamientos: [] },
    ];
    const resultado = detectarAprendizaje(catalogo, zonas);
    expect(resultado.diagnosticosACrear).toEqual([]);
  });

  it('mismo dx en otra zona pero no en esta → SÍ se crea en esta zona', () => {
    const catalogo: SnapshotZona[] = [
      makeZona('z-nariz', 'Nariz', true, [
        { id: 'd-hernia-nariz', nombre: 'Hernia', activo: true },
      ]),
      makeZona('z-abd', 'Abdomen', true, []),
    ];
    const zonas: ZonaAprendizajeInput[] = [
      { zona: 'Abdomen', diagnosticos: ['Hernia'], tratamientos: [] },
    ];
    const resultado = detectarAprendizaje(catalogo, zonas);
    expect(resultado.diagnosticosACrear).toContainEqual({
      zonaNombre: 'Abdomen',
      nombre: 'Hernia',
    });
  });

  it('dx de zona nueva (zona en zonasACrear) → diagnosticosACrear con zonaNombre formateado', () => {
    const catalogo: SnapshotZona[] = [];
    const zonas: ZonaAprendizajeInput[] = [
      { zona: 'cuello', diagnosticos: ['flacidez'], tratamientos: [] },
    ];
    const resultado = detectarAprendizaje(catalogo, zonas);
    expect(resultado.zonasACrear).toContain('Cuello');
    expect(resultado.diagnosticosACrear).toContainEqual({
      zonaNombre: 'Cuello',
      nombre: 'Flacidez',
    });
  });

  it('dedupe de diagnósticos dentro de la misma zona', () => {
    const catalogo: SnapshotZona[] = [makeZona('z-abd', 'Abdomen', true)];
    const zonas: ZonaAprendizajeInput[] = [
      {
        zona: 'Abdomen',
        diagnosticos: ['flacidez', 'Flacidez '],
        tratamientos: [],
      },
    ];
    const resultado = detectarAprendizaje(catalogo, zonas);
    const dxAbdomen = resultado.diagnosticosACrear.filter(
      (d) => d.zonaNombre === 'Abdomen',
    );
    expect(dxAbdomen).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// detectarAprendizaje — tratamientos (APR-03)
// ---------------------------------------------------------------------------
describe('detectarAprendizaje — tratamientos', () => {
  it('tx nuevo en zona existente → tratamientosACrear', () => {
    const catalogo: SnapshotZona[] = [makeZona('z-abd', 'Abdomen', true)];
    const zonas: ZonaAprendizajeInput[] = [
      {
        zona: 'Abdomen',
        diagnosticos: [],
        tratamientos: [{ nombre: 'Liposucción' }],
      },
    ];
    const resultado = detectarAprendizaje(catalogo, zonas);
    expect(resultado.tratamientosACrear).toContainEqual({
      zonaNombre: 'Abdomen',
      nombre: 'Liposucción',
    });
  });

  it('tx existente activo en esa zona → sin acciones', () => {
    const catalogo: SnapshotZona[] = [
      makeZona(
        'z-abd',
        'Abdomen',
        true,
        [],
        [{ id: 't1', nombre: 'Dermolipectomía', activo: true }],
      ),
    ];
    const zonas: ZonaAprendizajeInput[] = [
      {
        zona: 'Abdomen',
        diagnosticos: [],
        tratamientos: [{ nombre: 'dermolipectomia' }],
      },
    ];
    const resultado = detectarAprendizaje(catalogo, zonas);
    expect(resultado.tratamientosACrear).toEqual([]);
    expect(resultado.tratamientosAReactivar).toEqual([]);
  });

  it('tx que matchea TratamientoHC inactivo → tratamientosAReactivar', () => {
    const catalogo: SnapshotZona[] = [
      makeZona(
        'z-abd',
        'Abdomen',
        true,
        [],
        [{ id: 't-lipo', nombre: 'Liposucción', activo: false }],
      ),
    ];
    const zonas: ZonaAprendizajeInput[] = [
      {
        zona: 'Abdomen',
        diagnosticos: [],
        tratamientos: [{ nombre: 'liposuccion' }],
      },
    ];
    const resultado = detectarAprendizaje(catalogo, zonas);
    expect(resultado.tratamientosAReactivar).toContain('t-lipo');
    expect(resultado.tratamientosACrear).toEqual([]);
  });

  it('tx nuevo en zona nueva → tratamientosACrear con zonaNombre de la zona nueva', () => {
    const catalogo: SnapshotZona[] = [];
    const zonas: ZonaAprendizajeInput[] = [
      {
        zona: 'cuello',
        diagnosticos: [],
        tratamientos: [{ nombre: 'lifting cervical' }],
      },
    ];
    const resultado = detectarAprendizaje(catalogo, zonas);
    expect(resultado.tratamientosACrear).toContainEqual({
      zonaNombre: 'Cuello',
      nombre: 'Lifting cervical',
    });
  });

  it('tx "Otros" → nunca se aprende', () => {
    const catalogo: SnapshotZona[] = [makeZona('z-abd', 'Abdomen', true)];
    const zonas: ZonaAprendizajeInput[] = [
      {
        zona: 'Abdomen',
        diagnosticos: [],
        tratamientos: [{ nombre: 'Otros' }],
      },
    ];
    const resultado = detectarAprendizaje(catalogo, zonas);
    expect(resultado.tratamientosACrear).toEqual([]);
  });

  it('dedupe de tratamientos dentro de la misma zona', () => {
    const catalogo: SnapshotZona[] = [makeZona('z-abd', 'Abdomen', true)];
    const zonas: ZonaAprendizajeInput[] = [
      {
        zona: 'Abdomen',
        diagnosticos: [],
        tratamientos: [{ nombre: 'Liposucción' }, { nombre: 'liposuccion ' }],
      },
    ];
    const resultado = detectarAprendizaje(catalogo, zonas);
    const txAbdomen = resultado.tratamientosACrear.filter(
      (t) => t.zonaNombre === 'Abdomen',
    );
    expect(txAbdomen).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// detectarAprendizaje — catálogo vacío + zona nueva con dx y tx
// ---------------------------------------------------------------------------
describe('detectarAprendizaje — catálogo vacío', () => {
  it('catálogo vacío + zona nueva con dx/tx → todas las acciones de creación', () => {
    const catalogo: SnapshotZona[] = [];
    const zonas: ZonaAprendizajeInput[] = [
      {
        zona: 'muslos',
        diagnosticos: ['flacidez', 'grasa'],
        tratamientos: [{ nombre: 'liposucción muslos' }],
      },
    ];
    const resultado = detectarAprendizaje(catalogo, zonas);
    expect(resultado.zonasACrear).toContain('Muslos');
    expect(resultado.diagnosticosACrear).toContainEqual({
      zonaNombre: 'Muslos',
      nombre: 'Flacidez',
    });
    expect(resultado.diagnosticosACrear).toContainEqual({
      zonaNombre: 'Muslos',
      nombre: 'Grasa',
    });
    expect(resultado.tratamientosACrear).toContainEqual({
      zonaNombre: 'Muslos',
      nombre: 'Liposucción muslos',
    });
    expect(resultado.zonasAReactivar).toEqual([]);
    expect(resultado.diagnosticosAReactivar).toEqual([]);
    expect(resultado.tratamientosAReactivar).toEqual([]);
  });
});
