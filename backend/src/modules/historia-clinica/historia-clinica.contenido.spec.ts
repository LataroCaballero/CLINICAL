import {
  construirContenidoPrimeraVez,
  derivarPerfilPrimeraVez,
  resumirTratamientosDeContenido,
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
    const diagnostico = {
      zonas: ['Abdomen'],
      subzonas: ['Diástasis'],
      otroTexto: '',
    };
    const tratamientos = [
      { nombre: 'Abdominoplastia', tratamientoId: 'tr-1', precio: 100000 },
    ];

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

    const { diagnosticoStr, tratamientoStr } = derivarPerfilPrimeraVez({
      zonas,
    });

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
    const diagnostico = {
      zonas: ['Abdomen', 'Nariz'],
      subzonas: ['Diástasis', 'Rinoplastia severa'],
    };
    const tratamientos = [
      { nombre: 'Abdominoplastia', precio: 100000 },
      { nombre: 'Rinoplastia', precio: 200000 },
    ];

    const { diagnosticoStr, tratamientoStr } = derivarPerfilPrimeraVez({
      diagnostico,
      tratamientos,
    });

    expect(diagnosticoStr).toBe(
      'Abdomen, Nariz (Diástasis, Rinoplastia severa)',
    );
    expect(tratamientoStr).toBe('Abdominoplastia, Rinoplastia');
  });

  it('forma legacy sin zonas ni tratamientos → ambos null', () => {
    const { diagnosticoStr, tratamientoStr } = derivarPerfilPrimeraVez({});

    expect(diagnosticoStr).toBeNull();
    expect(tratamientoStr).toBeNull();
  });

  it('zonas array vacío [] → ambos null (edge case)', () => {
    const { diagnosticoStr, tratamientoStr } = derivarPerfilPrimeraVez({
      zonas: [],
    });

    expect(diagnosticoStr).toBeNull();
    expect(tratamientoStr).toBeNull();
  });
});

describe('resumirTratamientosDeContenido', () => {
  it('shape v1.9 agrupado (zonas[]) con múltiples tratamientos → primer nombre + conteo restante', () => {
    const contenido = {
      tipo: 'primera_vez',
      zonas: [
        { zona: 'Abdomen', tratamientos: [{ nombre: 'Lipoaspiración' }] },
        {
          zona: 'Mamas',
          tratamientos: [{ nombre: 'Mastopexia' }, { nombre: 'Implante' }],
        },
      ],
    };
    expect(resumirTratamientosDeContenido(contenido)).toBe('Lipoaspiración +2');
  });

  it('shape legacy plano con un tratamiento → nombre exacto sin conteo', () => {
    const contenido = {
      tipo: 'primera_vez',
      tratamientos: [{ nombre: 'Abdominoplastia' }],
    };
    expect(resumirTratamientosDeContenido(contenido)).toBe('Abdominoplastia');
  });

  it('shape legacy plano con múltiples tratamientos → primer nombre + conteo restante', () => {
    const contenido = {
      tipo: 'primera_vez',
      tratamientos: [{ nombre: 'A' }, { nombre: 'B' }],
    };
    expect(resumirTratamientosDeContenido(contenido)).toBe('A +1');
  });

  it('tratamiento_en_consultorio con catálogo → catálogo gana (ignora texto)', () => {
    const contenido = {
      tipo: 'tratamiento_en_consultorio',
      tratamientos: [{ id: 'tr-1', nombre: 'Toxina' }],
      texto: 'nota extra',
    };
    expect(resumirTratamientosDeContenido(contenido)).toBe('Toxina');
  });

  it('tratamiento_en_consultorio sin catálogo → fallback a texto', () => {
    const contenido = {
      tipo: 'tratamiento_en_consultorio',
      tratamientos: [],
      texto: 'Limpieza facial profunda',
    };
    expect(resumirTratamientosDeContenido(contenido)).toBe(
      'Limpieza facial profunda',
    );
  });

  it('texto libre puro largo (>80 chars) → recortado con elipsis', () => {
    const textoLargo = 'a'.repeat(100);
    const contenido = { tipo: 'seguimiento', texto: textoLargo };
    const resultado = resumirTratamientosDeContenido(contenido);
    expect(resultado).not.toBeNull();
    expect(resultado!.endsWith('…')).toBe(true);
    expect(resultado!.length).toBeLessThanOrEqual(81); // 80 chars + ellipsis
  });

  it('texto libre puro corto (<=80 chars) → sin recorte', () => {
    const textoCort = 'Control post-operatorio sin cambios';
    const contenido = { tipo: 'seguimiento', texto: textoCort };
    expect(resumirTratamientosDeContenido(contenido)).toBe(textoCort);
  });

  it('contenido null → null', () => {
    expect(resumirTratamientosDeContenido(null)).toBeNull();
  });

  it('contenido undefined → null', () => {
    expect(resumirTratamientosDeContenido(undefined)).toBeNull();
  });

  it('contenido sin tratamientos ni texto → null', () => {
    expect(resumirTratamientosDeContenido({ tipo: 'primera_vez' })).toBeNull();
  });

  it('edge: zonas[] vacío → null', () => {
    expect(resumirTratamientosDeContenido({ zonas: [] })).toBeNull();
  });

  it('edge: tratamientos[] vacío → null', () => {
    expect(resumirTratamientosDeContenido({ tratamientos: [] })).toBeNull();
  });

  it('edge: tratamientos con nombres vacíos/undefined → se descartan; si quedan 0 → null', () => {
    const contenido = {
      tratamientos: [{ nombre: '' }, { nombre: '   ' }, { nombre: undefined }],
    };
    expect(resumirTratamientosDeContenido(contenido)).toBeNull();
  });

  it('edge: zonas con tratamientos sin nombre válido → null', () => {
    const contenido = {
      zonas: [
        { zona: 'Abdomen', tratamientos: [{ nombre: '' }, { nombre: '  ' }] },
      ],
    };
    expect(resumirTratamientosDeContenido(contenido)).toBeNull();
  });
});
