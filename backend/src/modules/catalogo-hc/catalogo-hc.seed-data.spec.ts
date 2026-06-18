import { SEED_ZONAS, normalizarNombre } from './catalogo-hc.seed-data';

describe('catalogo-hc seed data', () => {
  describe('normalizarNombre', () => {
    it('convierte a lowercase', () => {
      expect(normalizarNombre('DERMOLIPECTOMIA')).toBe('dermolipectomia');
    });

    it('elimina diacríticos (tildes)', () => {
      expect(normalizarNombre('Dermolipectomía')).toBe('dermolipectomia');
    });

    it('es insensible a tildes y mayúsculas combinados', () => {
      expect(normalizarNombre('Dermolipectomía')).toBe(
        normalizarNombre('dermolipectomia'),
      );
    });

    it('normaliza Ácido hialurónico labios', () => {
      expect(normalizarNombre('Ácido hialurónico labios')).toBe(
        normalizarNombre('acido hialuronico labios'),
      );
    });

    it('normaliza Armonización facial', () => {
      expect(normalizarNombre('Armonización facial')).toBe(
        'armonizacion facial',
      );
    });

    it('hace trim', () => {
      expect(normalizarNombre('  Botox frente  ')).toBe('botox frente');
    });
  });

  describe('SEED_ZONAS', () => {
    it('contiene exactamente 6 zonas', () => {
      expect(SEED_ZONAS).toHaveLength(6);
    });

    it('tiene el orden correcto: Abdomen(1), Mamas(2), Nariz(3), Facial(4), Locales(5), Otros(9999)', () => {
      const ordenes = SEED_ZONAS.map((z) => ({
        nombre: z.nombre,
        orden: z.orden,
      }));
      expect(ordenes).toEqual([
        { nombre: 'Abdomen', orden: 1 },
        { nombre: 'Mamas', orden: 2 },
        { nombre: 'Nariz', orden: 3 },
        { nombre: 'Facial', orden: 4 },
        { nombre: 'Locales', orden: 5 },
        { nombre: 'Otros', orden: 9999 },
      ]);
    });

    it('zona Otros tiene esSistema = true', () => {
      const otros = SEED_ZONAS.find((z) => z.nombre === 'Otros');
      expect(otros?.esSistema).toBe(true);
    });

    it('las demás zonas tienen esSistema = false', () => {
      SEED_ZONAS.filter((z) => z.nombre !== 'Otros').forEach((z) => {
        expect(z.esSistema).toBe(false);
      });
    });

    // ZONA-03: Facial y Locales arrancan sin diagnósticos (crearZona agrega "Otros")
    it('Facial tiene diagnosticos = [] (ZONA-03)', () => {
      const facial = SEED_ZONAS.find((z) => z.nombre === 'Facial');
      expect(facial?.diagnosticos).toEqual([]);
    });

    it('Locales tiene diagnosticos = [] (ZONA-03)', () => {
      const locales = SEED_ZONAS.find((z) => z.nombre === 'Locales');
      expect(locales?.diagnosticos).toEqual([]);
    });

    it('zona Otros tiene diagnosticos = [] y tratamientos = []', () => {
      const otros = SEED_ZONAS.find((z) => z.nombre === 'Otros');
      expect(otros?.diagnosticos).toEqual([]);
      expect(otros?.tratamientos).toEqual([]);
    });

    // Abdomen
    it('Abdomen tiene 5 diagnósticos capitalizados: Piel, Musculo, Grasa, Pared, Hernia', () => {
      const abdomen = SEED_ZONAS.find((z) => z.nombre === 'Abdomen');
      expect(abdomen?.diagnosticos).toEqual([
        'Piel',
        'Musculo',
        'Grasa',
        'Pared',
        'Hernia',
      ]);
    });

    it('Abdomen tiene 4 tratamientos con tildes corregidas', () => {
      const abdomen = SEED_ZONAS.find((z) => z.nombre === 'Abdomen');
      expect(abdomen?.tratamientos).toEqual([
        'Dermolipectomía',
        'Dermoliposucción',
        'Minidermoliposucción',
        'Gluteoplastia',
      ]);
    });

    // Mamas
    it('Mamas tiene 5 diagnósticos capitalizados: Hipomastia, Hipertrofia, Ptosis, Contractura capsular, Hernia', () => {
      const mamas = SEED_ZONAS.find((z) => z.nombre === 'Mamas');
      expect(mamas?.diagnosticos).toEqual([
        'Hipomastia',
        'Hipertrofia',
        'Ptosis',
        'Contractura capsular',
        'Hernia',
      ]);
    });

    it('Mamas tiene 6 tratamientos con tildes corregidas', () => {
      const mamas = SEED_ZONAS.find((z) => z.nombre === 'Mamas');
      expect(mamas?.tratamientos).toEqual([
        'Aumento de volumen',
        'Reducción de volumen',
        'Levantamiento con implante',
        'Levantamiento sin implante',
        'Reconstrucción de mama',
        'Recambio de implante',
      ]);
    });

    // Nariz
    it('Nariz tiene 11 diagnósticos capitalizados', () => {
      const nariz = SEED_ZONAS.find((z) => z.nombre === 'Nariz');
      expect(nariz?.diagnosticos).toEqual([
        'Dorso alto',
        'Dorso bajo',
        'Giba',
        'Dorso ancho',
        'Punta ancha',
        'Punta caída',
        'Punta indefinida',
        'Punta rotada',
        'Base ancha',
        'Base colapsada',
        'Laterorrinia',
      ]);
    });

    it('Nariz tiene 2 tratamientos', () => {
      const nariz = SEED_ZONAS.find((z) => z.nombre === 'Nariz');
      expect(nariz?.tratamientos).toEqual([
        'Rinoplastia',
        'Rinoplastia estructural',
      ]);
    });

    // Facial
    it('Facial tiene 9 tratamientos con tildes corregidas', () => {
      const facial = SEED_ZONAS.find((z) => z.nombre === 'Facial');
      expect(facial?.tratamientos).toEqual([
        'Botox frente',
        'Botox entrecejo',
        'Botox patas de gallo',
        'Ácido hialurónico rinomodelación',
        'Ácido hialurónico labios',
        'Ácido hialurónico surco nasogeniano',
        'Ácido hialurónico pómulos',
        'Ácido hialurónico mentón',
        'Armonización facial',
      ]);
    });

    // Locales
    it('Locales tiene 2 tratamientos', () => {
      const locales = SEED_ZONAS.find((z) => z.nombre === 'Locales');
      expect(locales?.tratamientos).toEqual([
        'Electrocauterio',
        'Resección y plastia',
      ]);
    });

    // ZONA-02: Abdomen y Mamas comparten "Hernia" (duplicado entre zonas)
    it('Abdomen y Mamas ambas contienen "Hernia" (duplicado intencional entre zonas)', () => {
      const abdomen = SEED_ZONAS.find((z) => z.nombre === 'Abdomen');
      const mamas = SEED_ZONAS.find((z) => z.nombre === 'Mamas');
      expect(abdomen?.diagnosticos).toContain('Hernia');
      expect(mamas?.diagnosticos).toContain('Hernia');
    });

    // Invariante: ninguna lista incluye "Otros"/"otros" (el ítem de sistema lo crea crearZona)
    it('ninguna lista de diagnósticos incluye "Otros" u "otros"', () => {
      SEED_ZONAS.forEach((zona) => {
        const tieneOtros = zona.diagnosticos.some(
          (d) => d.toLowerCase() === 'otros',
        );
        expect(tieneOtros).toBe(false);
      });
    });

    it('ninguna lista de tratamientos incluye "Otros" u "otros"', () => {
      SEED_ZONAS.forEach((zona) => {
        const tieneOtros = zona.tratamientos.some(
          (t) => t.toLowerCase() === 'otros',
        );
        expect(tieneOtros).toBe(false);
      });
    });

    // Nombres corregidos presentes (CONTEXT.md)
    it('contiene "Dermolipectomía" con tilde correcta', () => {
      const abdomen = SEED_ZONAS.find((z) => z.nombre === 'Abdomen');
      expect(abdomen?.tratamientos).toContain('Dermolipectomía');
    });

    it('contiene "Reducción de volumen" con tilde correcta', () => {
      const mamas = SEED_ZONAS.find((z) => z.nombre === 'Mamas');
      expect(mamas?.tratamientos).toContain('Reducción de volumen');
    });

    it('contiene "Ácido hialurónico labios" con tildes correctas', () => {
      const facial = SEED_ZONAS.find((z) => z.nombre === 'Facial');
      expect(facial?.tratamientos).toContain('Ácido hialurónico labios');
    });

    it('contiene "Armonización facial" con tilde correcta', () => {
      const facial = SEED_ZONAS.find((z) => z.nombre === 'Facial');
      expect(facial?.tratamientos).toContain('Armonización facial');
    });
  });
});
