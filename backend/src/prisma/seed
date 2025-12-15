/**
 * SEED COMPLETO CON BATCHES – OPTIMIZADO PARA SUPABASE
 * Lautaro Caballero — 2025
 */

import {
  Prisma,
  PrismaClient,
  TipoProducto,
  TipoMovimientoStock,
  RolUsuario,
  EstadoTurno,
  TipoMovimiento,
  EstadoPresupuesto,
  EstadoLiquidacion,
  ObraSocial,
  PracticaObraSocial,
  TipoFactura,
  EstadoOrdenCompra,
  HistoriaClinica,
  HistoriaClinicaEntrada,
} from '@prisma/client';
import { fakerES as faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// Helper
const random = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

async function batchInsert<T>(
  items: T[],
  batchSize: number,
  cb: (data: T) => Promise<any>,
) {
  const result = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const created = await Promise.all(batch.map(cb)); // ⚠️ esto envía batchSize requests
    result.push(...created);

    // 👇 Dormimos un poquitito la conexión del pool (muy recomendable con Supabase)
    await new Promise((res) => setTimeout(res, 100));
  }

  return result;
}

async function main() {
  console.log('🧹 Limpiando base...');

  await prisma.$transaction([
    prisma.refreshToken.deleteMany(),
    prisma.authSession.deleteMany(),
    prisma.permiso.deleteMany(),
    prisma.turno.deleteMany(),
    prisma.historiaClinicaEntrada.deleteMany(),
    prisma.historiaClinica.deleteMany(),
    prisma.estudioPaciente.deleteMany(),
    prisma.mensajeInterno.deleteMany(),
    prisma.movimientoCC.deleteMany(),
    prisma.cuentaCorriente.deleteMany(),
    prisma.presupuestoItem.deleteMany(),
    prisma.presupuesto.deleteMany(),
    prisma.practicaRealizada.deleteMany(),
    prisma.liquidacionObraSocial.deleteMany(),
    prisma.factura.deleteMany(),
    prisma.ventaProductoItem.deleteMany(),
    prisma.ventaProducto.deleteMany(),
    prisma.movimientoStock.deleteMany(),
    prisma.lote.deleteMany(),
    prisma.inventario.deleteMany(),
    prisma.ordenCompraItem.deleteMany(),
    prisma.ordenCompra.deleteMany(),
    prisma.productoProveedor.deleteMany(),
    prisma.producto.deleteMany(),
    prisma.proveedor.deleteMany(),
    prisma.planObraSocial.deleteMany(),
    prisma.practicaObraSocial.deleteMany(),
    prisma.obraSocial.deleteMany(),
    prisma.secretaria.deleteMany(),
    prisma.profesional.deleteMany(),
    prisma.paciente.deleteMany(),
    prisma.usuario.deleteMany(),
  ]);

  // -----------------------
  // USUARIOS BASE
  // -----------------------

  console.log('📌 Creando usuarios base...');

  const admin = await prisma.usuario.create({
    data: {
      email: 'admin@demo.com',
      passwordHash: 'hash',
      rol: RolUsuario.ADMIN,
      nombre: 'Admin',
      apellido: 'Principal',
      telefono: faker.phone.number(),
    },
  });

  console.log('👩‍⚕️ Creando profesionales...');

  const profesionalesArray = [];

  const profesionales = await batchInsert(
    Array.from({ length: 8 }).map(() => ({
      email: faker.internet.email(),
      passwordHash: 'hash',
      rol: RolUsuario.PROFESIONAL,
      nombre: faker.person.firstName(),
      apellido: faker.person.lastName(),
      telefono: faker.phone.number(),
      profesional: {
        create: {
          matricula: faker.string.alphanumeric(8),
          especialidad: random([
            'Cirugía Estética',
            'Dermatología',
            'Kinesiología',
          ]),
          duracionDefault: random([20, 30, 45, 60]),
          bio: faker.lorem.sentences(2),
        },
      },
    })),
    5,
    (data) => prisma.usuario.create({ data, include: { profesional: true } }),
  );
  profesionalesArray.push({ profesionales });

  console.log('📱 Creando secretarias...');

  const secretariasArray = [];

  const secretarias = await batchInsert(
    Array.from({ length: 2 }).map(() => ({
      email: faker.internet.email(),
      passwordHash: 'hash',
      rol: RolUsuario.SECRETARIA,
      nombre: faker.person.firstName(),
      apellido: faker.person.lastName(),
      telefono: faker.phone.number(),
      secretaria: {
        create: {
          horarioTrabajo: {
            dias: ['Lunes', 'Martes'],
            desde: '08:00',
            hasta: '16:00',
          },
        },
      },
    })),
    2,
    (data) => prisma.usuario.create({ data }),
  );

  secretarias.push({ secretariasArray });

  const usuariosBase = [
    admin,
    ...profesionales.map((p) => p.usuario),
    ...secretarias.map((s) => s.usuario),
  ];

  // -----------------------
  // OBRAS SOCIALES
  // -----------------------

  console.log('🏥 Creando obras sociales...');

  const obras: (ObraSocial & { practicas: PracticaObraSocial[] })[] =
    await batchInsert(
      ['OSDE', 'Swiss Medical', 'PAMI', 'Medifé', 'OSECAC'].map((nombre) => ({
        nombre,
        cuit: faker.string.numeric(11),
        condicionIVA: 'Responsable Inscripto',
        domicilio: faker.location.streetAddress(),
        planes: {
          create: Array.from({ length: 3 }).map(() => ({
            nombre: random(['Plan A', 'Plan B', 'Plan Premium']),
            cobertura: faker.lorem.sentence(),
          })),
        },
        practicas: {
          create: Array.from({ length: 4 }).map(() => ({
            codigo: faker.string.alphanumeric(5),
            descripcion: faker.lorem.words(3),
            monto: faker.number.float({
              min: 3000,
              max: 80000,
              fractionDigits: 2,
            }),
          })),
        },
      })),
      5,
      (data) =>
        prisma.obraSocial.create({
          data,
          include: {
            planes: true,
            practicas: true, // 👈 IMPORTANTE
          },
        }),
    );

  // -----------------------
  // PACIENTES
  // -----------------------

  console.log('🧑‍⚕️ Creando pacientes...');

  const pacientesCreados = [];

  for (let i = 0; i < 400; i++) {
    const data = {
      nombreCompleto: faker.person.fullName(),
      dni: faker.string.numeric(8),
      telefono: faker.phone.number(),
      email: faker.internet.email(),
      direccion: faker.location.streetAddress(),
      fechaNacimiento: faker.date.birthdate({ mode: 'age', min: 18, max: 70 }),
      plan: faker.helpers.arrayElement(['Plan A', 'Plan B', 'Plan C']),
      fotoUrl: faker.image.avatar(),
      alergias: faker.helpers.arrayElements(
        ['penicilina', 'gluten', 'polen', 'ibuprofeno'],
        2,
      ),
      condiciones: faker.helpers.arrayElements(
        ['diabetes', 'hipertensión', 'asma'],
        1,
      ),
      consentimientoFirmado: faker.datatype.boolean(),
      indicacionesEnviadas: faker.datatype.boolean(),
      obraSocialId: faker.helpers.arrayElement(obras).id,
    };

    // CREACIÓN 100% SECUENCIAL SIN PARALELISMO
    const creado = await prisma.paciente.create({
      data,
      include: { cuentaCorriente: true },
    });

    pacientesCreados.push(creado);

    // esperar un poquito para no saturar supabase
    await new Promise((res) => setTimeout(res, 30)); // 30ms
  }

  console.log(`Pacientes creados: ${pacientesCreados.length}`);

  // -----------------------
  // TIPOS DE TURNO
  // -----------------------

  console.log('📆 Creando tipos de turno...');

  const tiposTurno = await batchInsert(
    ['Consulta Inicial', 'Control', 'Post-Operatorio', 'Procedimiento'].map(
      (nombre) => ({
        nombre,
        descripcion: faker.lorem.sentence(),
        duracionDefault: random([20, 30, 45, 60]),
      }),
    ),
    4,
    (data) => prisma.tipoTurno.create({ data }),
  );

  // -----------------------
  // TURNOS
  // -----------------------

  console.log('📅 Creando turnos...');

  const turnosCreados = [];

  for (const pac of pacientesCreados) {
    // Elegir un profesional random para este paciente
    const profesional = random(profesionales).profesional;

    // Cantidad de turnos que tendrá el paciente
    const cantidad = faker.number.int({ min: 1, max: 5 });

    for (let i = 0; i < cantidad; i++) {
      const inicio = faker.date.recent({ days: 120 });
      const fin = new Date(inicio.getTime() + 30 * 60 * 1000); // +30 minutos

      const data = {
        pacienteId: pac.id,
        profesionalId: profesional.id,
        tipoTurnoId: random(tiposTurno).id, // importante que tengas lista de tipos
        inicio,
        fin,
        estado: random([
          EstadoTurno.PENDIENTE,
          EstadoTurno.CONFIRMADO,
          EstadoTurno.CANCELADO,
          EstadoTurno.FINALIZADO,
        ]),
        observaciones: faker.lorem.sentence(),
      };

      const turnoCreado = await prisma.turno.create({ data });
      turnosCreados.push(turnoCreado);

      // Evitar saturación de supabase
      await new Promise((res) => setTimeout(res, 25));
    }
  }

  console.log(`Turnos creados: ${turnosCreados.length}`);

  // -----------------------
  // PRODUCTOS + INVENTARIO
  // -----------------------

  console.log('📦 Creando productos...');

  const productosCreados: Prisma.ProductoUncheckedCreateInput[] = [];

  for (let i = 0; i < 40; i++) {
    const data: Prisma.ProductoCreateInput = {
      nombre: faker.commerce.productName(),
      tipo: random([TipoProducto.INSUMO, TipoProducto.PRODUCTO_VENTA]),
      descripcion: faker.commerce.productDescription(),
      sku: faker.string.alphanumeric(8),
      precioSugerido: faker.number.float({
        min: 2000,
        max: 20000,
        fractionDigits: 2,
      }),

      inventario: {
        create: {
          stockActual: faker.number.int({ min: 10, max: 60 }),
          stockMinimo: 3,
          precioActual: faker.number.float({
            min: 1000,
            max: 15000,
            fractionDigits: 2,
          }),
        },
      },
    };

    const creado = await prisma.producto.create({ data });
    productosCreados.push(creado);

    // micro delay para evitar saturar el pool de supabase
    await new Promise((res) => setTimeout(res, 25));
  }

  console.log(`Productos creados: ${productosCreados.length}`);

  // -----------------------
  // VENTAS + MOVIMIENTOS DE STOCK
  // -----------------------

  console.log('🛒 Creando ventas...');

  const ventasCreadas: any[] = [];

  const mediosPago = ['EFECTIVO', 'TARJETA', 'MERCADO PAGO'];

  // cuántas ventas querés generar
  const totalVentas = 80;

  for (let i = 0; i < totalVentas; i++) {
    const paciente = random(pacientesCreados);
    const productosSeleccionados = faker.helpers.arrayElements(
      productosCreados,
      2,
    );

    const items = productosSeleccionados.map((prod) => {
      const precio =
        Number(prod.precioSugerido) ||
        faker.number.float({
          min: 2000,
          max: 10000,
          fractionDigits: 2,
        });

      return {
        productoId: prod.id,
        cantidad: faker.number.int({ min: 1, max: 3 }),
        precioUnitario: precio,
      };
    });

    // calcular total
    const totalVenta = items.reduce(
      (sum, item) => sum + item.precioUnitario * item.cantidad,
      0,
    );

    const ventaData: Prisma.VentaProductoUncheckedCreateInput = {
      pacienteId: paciente.id,
      total: totalVenta,
      medioPago: random(mediosPago),
      fecha: faker.date.recent({ days: 90 }),
    };

    // crear venta
    const ventaCreada = await prisma.ventaProducto.create({
      data: {
        ...ventaData,
        items: {
          create: items.map((item) => ({
            productoId: item.productoId,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            subtotal: item.precioUnitario * item.cantidad,
          })),
        },
      },
    });

    ventasCreadas.push(ventaCreada);

    // micro pausa para supabase
    await new Promise((res) => setTimeout(res, 20));
  }

  console.log(`Ventas creadas: ${ventasCreadas.length}`);

  // -----------------------
  // MOVIMIENTOS DE CUENTA CORRIENTE
  // -----------------------

  const pacientesConCuenta = pacientesCreados.filter(
    (pac) => pac.cuentaCorriente !== null,
  );

  console.log('💰 Generando movimientos de cuenta corriente...');

  const movimientosCCData = pacientesConCuenta.flatMap((pac) => {
    const cc = pac.cuentaCorriente!;
    const cantidad = faker.number.int({ min: 1, max: 4 });

    return Array.from({ length: cantidad }).map(() => ({
      cuentaCorriente: { connect: { id: cc.id } }, // 👈 en vez de cuentaCorrienteId
      tipo: random([TipoMovimiento.CARGO, TipoMovimiento.PAGO]), // 👈 enum, no string
      monto: faker.number.float({ min: 2000, max: 100000, fractionDigits: 2 }),
      descripcion: faker.lorem.sentence(),
    }));
  });

  await batchInsert(movimientosCCData, 30, (data) =>
    prisma.movimientoCC.create({ data }),
  );

  // -----------------------
  // PRESUPUESTOS + ITEMS
  // -----------------------

  console.log('🧾 Creando presupuestos...');

  const presupuestosCreados = [];

  for (const pac of pacientesCreados) {
    const profUsuario = random(profesionales);
    const profesional = profUsuario.profesional;

    // cuántos presupuestos va a tener este paciente
    const cantidad = faker.number.int({ min: 0, max: 3 });

    for (let i = 0; i < cantidad; i++) {
      const subtotal = faker.number.float({
        min: 5000,
        max: 150000,
        fractionDigits: 2,
      });

      const items = Array.from({
        length: faker.number.int({ min: 1, max: 5 }),
      }).map(() => ({
        descripcion: faker.commerce.productName(),
        cantidad: faker.number.int({ min: 1, max: 3 }),
        precioUnitario: faker.number.float({
          min: 2000,
          max: 30000,
          fractionDigits: 2,
        }),
        total: faker.number.float({
          min: 2000,
          max: 30000,
          fractionDigits: 2,
        }),
      }));

      const data: Prisma.PresupuestoCreateInput = {
        paciente: { connect: { id: pac.id } },
        profesional: { connect: { id: profesional.id } },
        subtotal,
        descuentos: 0,
        total: subtotal,
        estado: random([
          EstadoPresupuesto.BORRADOR,
          EstadoPresupuesto.ENVIADO,
          EstadoPresupuesto.ACEPTADO,
          EstadoPresupuesto.RECHAZADO,
        ]),
        items: {
          create: items,
        },
      };

      const creado = await prisma.presupuesto.create({ data });
      presupuestosCreados.push(creado);

      // evitar saturación
      await new Promise((res) => setTimeout(res, 25));
    }
  }

  console.log(`Presupuestos creados: ${presupuestosCreados.length}`);

  // -----------------------
  // PRÁCTICAS REALIZADAS
  // -----------------------

  console.log('🩺 Creando prácticas realizadas...');

  const practicasCreadas = [];

  for (const pac of pacientesCreados) {
    const profesional = random(profesionales).profesional;

    // 0 a 3 prácticas por paciente
    const cantidad = faker.number.int({ min: 0, max: 3 });

    for (let i = 0; i < cantidad; i++) {
      const obra = random(obras);
      const practica = random(obra.practicas) as PracticaObraSocial;

      const data: Prisma.PracticaRealizadaUncheckedCreateInput = {
        pacienteId: pac.id,
        profesionalId: profesional.id,
        obraSocialId: obra.id,

        codigo: practica.codigo,
        descripcion: practica.descripcion,
        monto: practica.monto,

        coseguro: faker.number.float({
          min: 0,
          max: 5000,
          fractionDigits: 2,
        }),
        fecha: faker.date.recent({ days: 120 }),

        estadoLiquidacion: random([
          EstadoLiquidacion.PENDIENTE,
          EstadoLiquidacion.PAGADO,
        ]),

        liquidacionId: null,
        facturaId: null,
      };

      const creado = await prisma.practicaRealizada.create({ data });
      practicasCreadas.push(creado);

      // micro delay para no saturar supabase
      await new Promise((res) => setTimeout(res, 20));
    }
  }

  console.log(`Prácticas creadas: ${practicasCreadas.length}`);

  // -----------------------
  // LIQUIDACIONES DE OBRA SOCIAL
  // -----------------------

  console.log('📑 Creando liquidaciones de obra social...');

  const liquidacionesCreadas = [];

  for (const obra of obras) {
    const cantidad = faker.number.int({ min: 1, max: 3 });

    for (let i = 0; i < cantidad; i++) {
      const data: Prisma.LiquidacionObraSocialUncheckedCreateInput = {
        obraSocialId: obra.id,
        periodo: `${faker.number.int({ min: 2024, max: 2025 })}-${faker.number.int(
          {
            min: 1,
            max: 12,
          },
        )}`,
        fechaPago: faker.date.recent({ days: 60 }),
        montoTotal: faker.number.float({
          min: 20000,
          max: 300000,
          fractionDigits: 2,
        }),
        usuarioId: null,
        facturaId: null,
      };

      const creada = await prisma.liquidacionObraSocial.create({ data });
      liquidacionesCreadas.push(creada);

      // Para evitar saturar supabase
      await new Promise((res) => setTimeout(res, 20));
    }
  }

  console.log(`Liquidaciones creadas: ${liquidacionesCreadas.length}`);

  // ---------------------------------------------------------
  // 🔗 ASIGNAR PRÁCTICAS A LIQUIDACIONES (también secuencial)
  // ---------------------------------------------------------

  console.log('🔗 Asignando prácticas a liquidaciones...');

  const practicasPendientes = practicasCreadas.filter(
    (p) => p.estadoLiquidacion === EstadoLiquidacion.PENDIENTE,
  );

  for (const practica of practicasPendientes) {
    const liquidacion = random(liquidacionesCreadas);

    await prisma.practicaRealizada.update({
      where: { id: practica.id },
      data: { liquidacionId: liquidacion.id },
    });

    await new Promise((res) => setTimeout(res, 15));
  }

  console.log(`Prácticas asignadas: ${practicasPendientes.length}`);

  // -----------------------
  // FACTURAS
  // -----------------------

  console.log('🧾 Creando facturas...');

  const facturasCreadas = [];

  for (const practica of practicasCreadas) {
    const profesional = random(profesionales).profesional;

    const subtotal = Number(practica.monto);
    const impuestos = subtotal * 0.21;
    const total = subtotal + impuestos;

    const data: Prisma.FacturaCreateInput = {
      tipo: TipoFactura.FACTURA,
      numero: faker.string.numeric(10),
      cuit: faker.string.numeric(11),
      razonSocial: faker.company.name(),
      domicilio: faker.location.streetAddress(),

      subtotal,
      impuestos,
      total,

      profesional: { connect: { id: profesional.id } },

      practicas: {
        connect: [{ id: practica.id }],
      },
    };

    const creada = await prisma.factura.create({ data });
    facturasCreadas.push(creada);

    // micro pausita para Supabase
    await new Promise((res) => setTimeout(res, 20));
  }

  console.log(`Facturas creadas: ${facturasCreadas.length}`);

  // -----------------------
  // CIRUGÍAS
  // -----------------------

  console.log('🩻 Creando cirugías...');

  const cirugiasCreadas = [];

  const pacientesParaCirugia = pacientesCreados.slice(0, 60); // tu lógica original

  for (const pac of pacientesParaCirugia) {
    const profesional = random(profesionales).profesional;

    const data: Prisma.CirugiaUncheckedCreateInput = {
      pacienteId: pac.id,
      profesionalId: profesional.id,
      fecha: faker.date.soon({ days: 120 }),
      duracion: faker.number.int({ min: 60, max: 240 }),
      descripcion: faker.lorem.sentence(),
    };

    const creada = await prisma.cirugia.create({ data });
    cirugiasCreadas.push(creada);

    // micro pausa para no saturar Supabase
    await new Promise((res) => setTimeout(res, 20));
  }

  console.log(`Cirugías creadas: ${cirugiasCreadas.length}`);

  // -----------------------
  // PROVEEDORES + ÓRDENES DE COMPRA
  // -----------------------

  console.log('🏭 Creando proveedores...');

  const proveedoresData = Array.from({ length: 10 }).map(() => ({
    nombre: faker.company.name(),
    cuit: faker.string.numeric(11),
    direccion: faker.location.streetAddress(),
    telefono: faker.phone.number(),
    email: faker.internet.email(),
  }));

  const proveedores = [];

  for (const data of proveedoresData) {
    const prov = await prisma.proveedor.create({ data });
    proveedores.push(prov);
    await new Promise((r) => setTimeout(r, 20));
  }

  console.log('📦 Creando órdenes de compra...');

  const ordenesCreadas = [];

  for (let i = 0; i < 20; i++) {
    const proveedor = random(proveedores);
    const productosSeleccionados = faker.helpers.arrayElements(
      productosCreados,
      3,
    );

    const items = productosSeleccionados.map((prod) => ({
      producto: { connect: { id: prod.id } },
      cantidad: faker.number.int({ min: 1, max: 10 }),
      precioUnitario:
        prod.costoBase ??
        faker.number.float({
          min: 1000,
          max: 15000,
          fractionDigits: 2,
        }),
    }));

    const data: Prisma.OrdenCompraCreateInput = {
      proveedor: { connect: { id: proveedor.id } },
      estado: EstadoOrdenCompra.PENDIENTE,
      items: { create: items },
    };

    const creada = await prisma.ordenCompra.create({ data });
    ordenesCreadas.push(creada);

    await new Promise((r) => setTimeout(r, 25));
  }

  console.log(`Órdenes creadas: ${ordenesCreadas.length}`);

  console.log('🧪 Creando estudios por paciente...');

  const estudiosCreados = [];

  for (const pac of pacientesCreados) {
    const cantidad = faker.number.int({ min: 0, max: 4 });

    for (let i = 0; i < cantidad; i++) {
      const data: Prisma.EstudioPacienteUncheckedCreateInput = {
        pacienteId: pac.id,
        nombre: faker.helpers.arrayElement([
          'Radiografía',
          'Ecografía',
          'Laboratorio general',
          'TAC',
          'Resonancia',
        ]),
        solicitadoPor: faker.person.fullName(),
        estado: faker.datatype.boolean(),
        fechaEntrega: faker.date.soon({ days: 60 }),
      };

      const creado = await prisma.estudioPaciente.create({ data });
      estudiosCreados.push(creado);

      await new Promise((r) => setTimeout(r, 15));
    }
  }

  console.log(`Estudios creados: ${estudiosCreados.length}`);

  console.log('💬 Creando mensajes internos...');

  const mensajesInternos = [];

  for (const pac of pacientesCreados) {
    const cantidad = faker.number.int({ min: 0, max: 3 });

    for (let i = 0; i < cantidad; i++) {
      const autor = random(usuariosBase);
      if (!autor) continue; // seguridad

      const data: Prisma.MensajeInternoUncheckedCreateInput = {
        mensaje: faker.lorem.sentence(),
        pacienteId: pac.id,
        autorUserId: autor.id,
        timestamp: faker.date.recent({ days: 90 }),
      };

      const creado = await prisma.mensajeInterno.create({ data });
      mensajesInternos.push(creado);

      await new Promise((r) => setTimeout(r, 10));
    }
  }

  console.log(`Mensajes internos creados: ${mensajesInternos.length}`);

  console.log('📚 Creando historias clínicas...');

  const historiasClinicas = [];
  const entradasHC = [];

  for (const pac of pacientesCreados) {
    const profesional = random(profesionales).profesional;

    const historia = await prisma.historiaClinica.create({
      data: {
        pacienteId: pac.id,
        profesionalId: profesional.id,
      },
    });

    historiasClinicas.push(historia);
    await new Promise((r) => setTimeout(r, 15));

    // Entradas
    const cantidad = faker.number.int({ min: 1, max: 4 });
    for (let i = 0; i < cantidad; i++) {
      const entrada = await prisma.historiaClinicaEntrada.create({
        data: {
          historiaClinicaId: historia.id,
          contenido: {
            notas: faker.lorem.paragraph(),
            presion: `${faker.number.int({ min: 90, max: 140 })}/${faker.number.int(
              {
                min: 60,
                max: 90,
              },
            )}`,
          },
        },
      });

      entradasHC.push(entrada);
      await new Promise((r) => setTimeout(r, 10));
    }
  }

  console.log(`Historias creadas: ${historiasClinicas.length}`);
  console.log(`Entradas creadas: ${entradasHC.length}`);

  console.log('📦 Creando lotes de productos...');

  const lotesCreados = [];

  const productosConLotes = productosCreados.filter((p) => p.requiereLote);

  for (const prod of productosConLotes) {
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

      await new Promise((r) => setTimeout(r, 15));
    }
  }

  console.log(`Lotes creados: ${lotesCreados.length}`);

  console.log('🔗 Creando relaciones Producto–Proveedor...');

  const productoProveedorCreados = [];

  for (const prov of proveedores) {
    const productosAsociados = faker.helpers.arrayElements(productosCreados, 5);

    for (const prod of productosAsociados) {
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

      await new Promise((r) => setTimeout(r, 10));
    }
  }

  console.log(`ProductoProveedor creados: ${productoProveedorCreados.length}`);

  console.log('✨ Seed COMPLETADO.');
}

main()
  .catch((e) => {
    console.error('ERROR EN SEED:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
