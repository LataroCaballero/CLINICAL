import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // -------------------------
  // 1. Usuarios base
  // -------------------------
  const password = await bcrypt.hash('admin123', 10);

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@clinical.test' },
    update: {},
    create: {
      email: 'admin@clinical.test',
      passwordHash: password,
      rol: 'ADMIN',
      nombre: 'Admin',
      apellido: 'Principal',
    },
  });

  const profesionalUser = await prisma.usuario.upsert({
    where: { email: 'pro@clinical.test' },
    update: {},
    create: {
      email: 'pro@clinical.test',
      passwordHash: password,
      rol: 'PROFESIONAL',
      nombre: 'Juan',
      apellido: 'Pérez',
    },
  });

  const profesional = await prisma.profesional.create({
    data: {
      usuarioId: profesionalUser.id,
      especialidad: 'Cirugía estética',
      matricula: 'MAT-12345',
    },
  });

  const secretariaUser = await prisma.usuario.upsert({
    where: { email: 'sec@clinical.test' },
    update: {},
    create: {
      email: 'sec@clinical.test',
      passwordHash: password,
      rol: 'SECRETARIA',
      nombre: 'Carla',
      apellido: 'Gómez',
    },
  });

  const secretaria = await prisma.secretaria.create({
    data: {
      usuarioId: secretariaUser.id,
    },
  });

  console.log('✔ Usuarios creados');

  // -------------------------
  // 2. Paciente demo
  // -------------------------
  const pacienteUser = await prisma.usuario.upsert({
    where: { email: 'paciente@clinical.test' },
    update: {},
    create: {
      email: 'paciente@clinical.test',
      passwordHash: password,
      rol: 'PACIENTE',
      nombre: 'Lucía',
      apellido: 'Martínez',
    },
  });

  const paciente = await prisma.paciente.create({
    data: {
      usuarioId: pacienteUser.id,
      nombreCompleto: 'Lucía Martínez',
      dni: '40888999',
      telefono: '2644001122',
      alergias: ['Penicilina'],
      condiciones: ['Hipotiroidismo'],
      estado: 'ACTIVO',
      profesionalId: profesional.id,
    },
  });

  console.log('✔ Paciente creado');

  // Crear cuenta corriente automática
  await prisma.cuentaCorriente.create({
    data: {
      pacienteId: paciente.id,
    },
  });

  console.log('✔ Cuenta corriente creada');

  // -------------------------
  // 3. Tipos de turnos
  // -------------------------
  const consulta = await prisma.tipoTurno.upsert({
    where: { nombre: 'Consulta' },
    update: {},
    create: {
      nombre: 'Consulta',
      descripcion: 'Consulta general',
      mensajeBase: 'Recordatorio de su consulta.',
      duracionDefault: 30,
    },
  });

  const primeraVez = await prisma.tipoTurno.upsert({
    where: { nombre: 'Primera vez' },
    update: {},
    create: {
      nombre: 'Primera vez',
      descripcion: 'Consulta inicial',
      mensajeBase: 'Gracias por confiar. Su primera consulta está agendada.',
      duracionDefault: 60,
    },
  });

  console.log('✔ Tipos de turnos creados');

  // -------------------------
  // 4. Crear obra social base
  // -------------------------
  const osde = await prisma.obraSocial.create({
    data: {
      nombre: 'OSDE',
      cuit: '30-12345678-9',
      condicionIVA: 'Responsable Inscripto',
      domicilio: 'Av. Salud 500',
      planes: {
        create: [{ nombre: '210' }],
      },
    },
  });

  console.log('✔ Obra social creada');

  // -------------------------
  // 5. Producto + inventario
  // -------------------------
  const producto = await prisma.producto.create({
    data: {
      nombre: 'Pack de gasas',
      categoria: 'Insumos',
      tipo: 'INSUMO',
      unidadMedida: 'unidad',
      descripcion: 'Gasas estériles',
      inventario: {
        create: {
          stockActual: 50,
          stockMinimo: 10,
        },
      },
    },
  });

  console.log('✔ Producto + inventario creados');

  // -------------------------
  // 6. Turno demo
  // -------------------------
  const turno = await prisma.turno.create({
    data: {
      pacienteId: paciente.id,
      profesionalId: profesional.id,
      tipoTurnoId: consulta.id,
      inicio: new Date(Date.now() + 3600000),
      fin: new Date(Date.now() + 5400000),
      estado: 'PENDIENTE',
    },
  });

  console.log('✔ Turno demo creado');

  // -------------------------
  // 7. Historia clínica + entrada
  // -------------------------
  const hc = await prisma.historiaClinica.create({
    data: {
      pacienteId: paciente.id,
      profesionalId: profesional.id,
    },
  });

  await prisma.historiaClinicaEntrada.create({
    data: {
      historiaClinicaId: hc.id,
      contenido: { texto: 'Primera evaluación. Paciente en buen estado.' },
    },
  });

  console.log('✔ HC y entrada creadas');

  // -------------------------
  // 8. Presupuesto base
  // -------------------------
  await prisma.presupuesto.create({
    data: {
      pacienteId: paciente.id,
      profesionalId: profesional.id,
      subtotal: 50000,
      descuentos: 0,
      total: 50000,
      estado: 'BORRADOR',
      items: {
        create: [
          {
            descripcion: 'Consulta estética',
            cantidad: 1,
            precioUnitario: 50000,
            total: 50000,
          },
        ],
      },
    },
  });

  console.log('✔ Presupuesto creado');

  console.log('🌱 SEED COMPLETO');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
