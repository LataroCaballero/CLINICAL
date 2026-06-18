/**
 * SEED: Tipos de Turno v1.8
 * Crea los 4 tipos públicos + 1 interno (Cirugía) de forma idempotente.
 * Re-ejecutable sin errores en entornos existentes o fresh.
 */

import { PrismaClient, FlujoPaciente } from '@prisma/client';

const prisma = new PrismaClient();

const TIPOS_TURNO = [
  {
    nombre: 'Consulta',
    flujoPaciente: null as FlujoPaciente | null,
    esCirugia: false,
  },
  {
    nombre: 'Control',
    flujoPaciente: null as FlujoPaciente | null,
    esCirugia: false,
  },
  {
    nombre: 'Pre-Quirúrgico',
    flujoPaciente: FlujoPaciente.CIRUGIA,
    esCirugia: false,
  },
  {
    nombre: 'Tratamiento',
    flujoPaciente: FlujoPaciente.TRATAMIENTO,
    esCirugia: false,
  },
  {
    nombre: 'Cirugía',
    flujoPaciente: null as FlujoPaciente | null,
    esCirugia: true,
  },
];

async function main() {
  console.log('Seed: tipos de turno v1.8');
  for (const tipo of TIPOS_TURNO) {
    await prisma.tipoTurno.upsert({
      where: { nombre: tipo.nombre },
      update: { flujoPaciente: tipo.flujoPaciente, esCirugia: tipo.esCirugia },
      create: tipo,
    });
    console.log(`  upserted: ${tipo.nombre}`);
  }
  console.log('Seed tipos de turno completado.');
}

main()
  .catch((e) => {
    console.error('Error en seed tipos-turno:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
