import { PrismaClient, Prisma } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();
const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

// helper random
function random<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('🚀 Seed EXTRA iniciado...');

  // ======================================================
  // 📌 1) TRAER DATOS NECESARIOS DESDE LA BD
  // ======================================================

  const pacientes = await prisma.paciente.findMany({
    select: { id: true },
  });

  const profesionales = await prisma.profesional.findMany({
    select: { id: true },
  });

  const productos = await prisma.producto.findMany({
    where: { requiereLote: true },
    select: { id: true },
  });

  const proveedores = await prisma.proveedor.findMany({
    select: { id: true },
  });

  console.log(`Pacientes: ${pacientes.length}`);
  console.log(`Profesionales: ${profesionales.length}`);
  console.log(`Productos con lote: ${productos.length}`);
  console.log(`Proveedores: ${proveedores.length}`);

  // ======================================================
  // 📚 2) HISTORIAS CLÍNICAS + ENTRADAS
  // ======================================================

  console.log('📚 Creando historias clínicas...');

  const historiasClinicas = [];
  const entradasHC = [];

  for (const pac of pacientes) {
    const profesional = random(profesionales) as { id: string };

    const historia = await prisma.historiaClinica.create({
      data: {
        pacienteId: pac.id,
        profesionalId: profesional.id,
      },
    });

    historiasClinicas.push(historia);
    await wait(15);

    const cantidad = faker.number.int({ min: 1, max: 4 });

    for (let i = 0; i < cantidad; i++) {
      const entrada = await prisma.historiaClinicaEntrada.create({
        data: {
          historiaClinicaId: historia.id,
          contenido: {
            notas: faker.lorem.paragraph(),
            presion: `${faker.number.int({ min: 90, max: 140 })}/${faker.number.int(
              { min: 60, max: 90 },
            )}`,
          },
        },
      });

      entradasHC.push(entrada);
      await wait(10);
    }
  }

  console.log(`Historias creadas: ${historiasClinicas.length}`);
  console.log(`Entradas creadas: ${entradasHC.length}`);

  // ======================================================
  // 📦 3) LOTES DE PRODUCTOS
  // ======================================================

  console.log('📦 Creando lotes...');

  const lotesCreados = [];

  for (const prod of productos) {
    const cantidad = faker.number.int({ min: 1, max: 3 });

    for (let i = 0; i < cantidad; i++) {
      const data: Prisma.LoteUncheckedCreateInput = {
        productoId: prod.id,
        lote: faker.string.alphanumeric(6),
        cantidadInicial: faker.number.int({ min: 10, max: 80 }),
        cantidadActual: faker.number.int({ min: 5, max: 80 }),
        fechaVencimiento: faker.date.soon({ days: 400 }),
      };

      const creado = await prisma.lote.create({ data });
      lotesCreados.push(creado);
      await wait(15);
    }
  }

  console.log(`Lotes creados: ${lotesCreados.length}`);

  // ======================================================
  // 🔗 4) RELACIÓN PRODUCTO–PROVEEDOR
  // ======================================================

  console.log('🔗 Creando Producto–Proveedor...');

  const productoProveedorCreados = [];

  for (const prov of proveedores) {
    const productosRandom = faker.helpers.arrayElements(productos, 5);

    for (const prod of productosRandom as { id: string }[]) {
      const data: Prisma.ProductoProveedorUncheckedCreateInput = {
        proveedorId: prov.id,
        productoId: prod.id,
        precioHistorico: faker.number.float({
          min: 800,
          max: 20000,
          fractionDigits: 2,
        }),
      };

      const creado = await prisma.productoProveedor.create({ data });
      productoProveedorCreados.push(creado);

      await wait(10);
    }
  }

  console.log(`ProductoProveedor creados: ${productoProveedorCreados.length}`);

  console.log('✨ Seed EXTRA COMPLETADO.');
}

main()
  .catch((e) => {
    console.error('ERROR EN SEED EXTRA:', e);
  })
  .finally(() => prisma.$disconnect());
