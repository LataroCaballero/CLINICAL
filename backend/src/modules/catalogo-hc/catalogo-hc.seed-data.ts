/**
 * Seed data for the HC catalog (ZonaHC / DiagnosticoHC / TratamientoHC).
 *
 * INVARIANT: No "Otros"/"otros" item appears in diagnosticos or tratamientos lists.
 * The "Otros" system item (esSistema=true, orden=9999) is always injected by
 * crearZona() in CatalogoHCService — never duplicated here.
 *
 * ZONA-03: Facial and Locales start with diagnosticos=[] because they have
 * no fixed diagnoses; crearZona() will add the "Otros" diagnostic.
 */

export interface SeedZona {
  nombre: string;
  orden: number;
  esSistema: boolean;
  diagnosticos: string[];
  tratamientos: string[];
}

/**
 * Normalizes a name for case/accent-insensitive matching against the
 * Tratamiento price catalog.
 * Strategy: lowercase → NFD decompose → strip combining marks → trim
 */
export function normalizarNombre(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

export const SEED_ZONAS: SeedZona[] = [
  {
    nombre: 'Abdomen',
    orden: 1,
    esSistema: false,
    diagnosticos: ['Piel', 'Musculo', 'Grasa', 'Pared', 'Hernia'],
    tratamientos: [
      'Dermolipectomía',
      'Dermoliposucción',
      'Minidermoliposucción',
      'Gluteoplastia',
    ],
  },
  {
    nombre: 'Mamas',
    orden: 2,
    esSistema: false,
    diagnosticos: [
      'Hipomastia',
      'Hipertrofia',
      'Ptosis',
      'Contractura capsular',
      'Hernia',
    ],
    tratamientos: [
      'Aumento de volumen',
      'Reducción de volumen',
      'Levantamiento con implante',
      'Levantamiento sin implante',
      'Reconstrucción de mama',
      'Recambio de implante',
    ],
  },
  {
    nombre: 'Nariz',
    orden: 3,
    esSistema: false,
    diagnosticos: [
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
    ],
    tratamientos: ['Rinoplastia', 'Rinoplastia estructural'],
  },
  {
    // ZONA-03: Facial starts with no fixed diagnoses.
    // crearZona() will add DiagnosticoHC "Otros" (esSistema=true).
    nombre: 'Facial',
    orden: 4,
    esSistema: false,
    diagnosticos: [],
    tratamientos: [
      'Botox frente',
      'Botox entrecejo',
      'Botox patas de gallo',
      'Ácido hialurónico rinomodelación',
      'Ácido hialurónico labios',
      'Ácido hialurónico surco nasogeniano',
      'Ácido hialurónico pómulos',
      'Ácido hialurónico mentón',
      'Armonización facial',
    ],
  },
  {
    // ZONA-03: Locales starts with no fixed diagnoses.
    // crearZona() will add DiagnosticoHC "Otros" (esSistema=true).
    nombre: 'Locales',
    orden: 5,
    esSistema: false,
    diagnosticos: [],
    tratamientos: ['Electrocauterio', 'Resección y plastia'],
  },
  {
    // System zone: always last (orden 9999, esSistema=true).
    // Both diagnosticos and tratamientos are empty here because
    // crearZona() will add the "Otros" items at creation time.
    nombre: 'Otros',
    orden: 9999,
    esSistema: true,
    diagnosticos: [],
    tratamientos: [],
  },
];
