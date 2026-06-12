import {
  construirContenidoPrimeraVez,
  derivarPerfilPrimeraVez,
  ZonaSeleccionInput,
} from './historia-clinica.contenido.helpers';

describe('construirContenidoPrimeraVez', () => {
  it('con zonas[] presente → contenido tiene tipo, zonas y metadatos SIN campos legacy', () => {
    const zonas: ZonaSeleccionInput[] = [
      {
        zonaId: 'z1',
        zona: 'Abdomen',
        diagnosticos: ['Diástasis'],
        tratamientos: [{ nombre: 'Abdominoplastia', precio: 100000 }],
      },
    ];

    const result = construirContenidoPrimeraVez({
      zonas,
      comentario: 'Sin comentario',
      presupuestoId: 'pres-1',
      presupuestoTotal: 100000,
    });

    expect(result).toEqual({
      tipo: 'primera_vez',
      zonas,
      comentario: 'Sin comentario',
      presupuestoId: 'pres-1',
      presupuestoTotal: 100000,
    });
    expect(result).not.toHaveProperty('diagnostico');
    expect(result).not.toHaveProperty('tratamientos');
  });

  it('sin zonas (forma legacy) → contenido idéntico al actual del service', () => {
    const diagnostico = { zonas: ['Abdomen'], subzonas: ['Diástasis'], otroTexto: '' };
    const tratamientos = [{ nombre: 'Abdominoplastia', tratamientoId: 'tr-1', precio: 100000 }];

    const result = construirContenidoPrimeraVez({
      diagnostico,
      tratamientos,
      comentario: 'Comentario legacy',
      presupuestoTotal: 50000,
    });

    expect(result).toEqual({
      tipo: 'primera_vez',
      diagnostico,
      tratamientos,
      comentario: 'Comentario legacy',
      presupuestoId: null,
      presupuestoTotal: 50000,
    });
    expect(result).not.toHaveProperty('zonas');
  });

  it('sin zonas y sin diagnostico/tratamientos → usa defaults vacíos (forma legacy)', () => {
    const result = construirContenidoPrimeraVez({});

    expect(result).toEqual({
      tipo: 'primera_vez',
      diagnostico: { zonas: [], subzonas: [] },
      tratamientos: [],
      comentario: '',
      presupuestoId: null,
      presupuestoTotal: 0,
    });
  });

  it('zonas array vacío [] → trata como legacy (sin zonas en contenido)', () => {
    const result = construirContenidoPrimeraVez({ zonas: [] });

    expect(result).not.toHaveProperty('zonas');
    expect(result).toHaveProperty('diagnostico');
    expect(result).toHaveProperty('tratamientos');
  });

  it('con zonas[] → omite presupuestoId cuando no se pasa (null default)', () => {
    const zonas: ZonaSeleccionInput[] = [
      {
        zonaId: 'z2',
        zona: 'Nariz',
        diagnosticos: [],
        tratamientos: [{ nombre: 'Rinoplastia', precio: 200000 }],
      },
    ];

    const result = construirContenidoPrimeraVez({ zonas });

    expect(result.presupuestoId).toBeNull();
    expect(result.presupuestoTotal).toBe(0);
    expect(result.comentario).toBe('');
  });
});

describe('derivarPerfilPrimeraVez', () => {
  it('con zonas → diagnosticoStr con zona y diagnósticos en paréntesis', () => {
    const zonas: ZonaSeleccionInput[] = [
      {
        zonaId: 'z1',
        zona: 'Abdomen',
        diagnosticos: ['Diástasis', 'Hernia'],
        tratamientos: [{ nombre: 'Abdominoplastia', precio: 100000 }],
      },
      {
        zonaId: 'z2',
        zona: 'Mamas',
        diagnosticos: ['Ptosis'],
        tratamientos: [{ nombre: 'Mastopexia', precio: 150000 }],
      },
    ];

    const { diagnosticoStr, tratamientoStr } = derivarPerfilPrimeraVez({ zonas });

    expect(diagnosticoStr).toBe('Abdomen (Diástasis, Hernia), Mamas (Ptosis)');
    expect(tratamientoStr).toBe('Abdominoplastia, Mastopexia');
  });

  it('con zonas sin diagnósticos → diagnosticoStr solo con nombre de zona', () => {
    const zonas: ZonaSeleccionInput[] = [
      {
        zonaId: 'z3',
        zona: 'Nariz',
        diagnosticos: [],
        tratamientos: [{ nombre: 'Rinoplastia', precio: 200000 }],
      },
    ];

    const { diagnosticoStr } = derivarPerfilPrimeraVez({ zonas });

    expect(diagnosticoStr).toBe('Nariz');
  });

  it('con zonas sin tratamientos → tratamientoStr null', () => {
    const zonas: ZonaSeleccionInput[] = [
      {
        zonaId: 'z4',
        zona: 'Facial',
        diagnosticos: ['Otros'],
        tratamientos: [],
      },
    ];

    const { tratamientoStr } = derivarPerfilPrimeraVez({ zonas });

    expect(tratamientoStr).toBeNull();
  });

  it('forma legacy (sin zonas) → replica lógica actual del service', () => {
    const diagnostico = { zonas: ['Abdomen', 'Nariz'], subzonas: ['Diástasis', 'Rinoplastia severa'] };
    const tratamientos = [
      { nombre: 'Abdominoplastia', precio: 100000 },
      { nombre: 'Rinoplastia', precio: 200000 },
    ];

    const { diagnosticoStr, tratamientoStr } = derivarPerfilPrimeraVez({ diagnostico, tratamientos });

    expect(diagnosticoStr).toBe('Abdomen, Nariz (Diástasis, Rinoplastia severa)');
    expect(tratamientoStr).toBe('Abdominoplastia, Rinoplastia');
  });

  it('forma legacy sin zonas ni tratamientos → ambos null', () => {
    const { diagnosticoStr, tratamientoStr } = derivarPerfilPrimeraVez({});

    expect(diagnosticoStr).toBeNull();
    expect(tratamientoStr).toBeNull();
  });

  it('zonas array vacío [] → ambos null (edge case)', () => {
    const { diagnosticoStr, tratamientoStr } = derivarPerfilPrimeraVez({ zonas: [] });

    expect(diagnosticoStr).toBeNull();
    expect(tratamientoStr).toBeNull();
  });
});
