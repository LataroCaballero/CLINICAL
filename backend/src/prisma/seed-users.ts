import { PrismaClient, RolUsuario } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🔐 Seed de usuarios demo (SIN borrar la base)');

  // =========================
  // Configuración
  // =========================
  const PASSWORD_PLAIN = 'demo123';
  const PASSWORD_HASH = await bcrypt.hash(PASSWORD_PLAIN, 10);

  const USERS = [
    {
      email: 'admin@demo.com',
      rol: RolUsuario.ADMIN,
      nombre: 'Admin',
      apellido: 'Principal',
    },
    {
      email: 'secretaria@demo.com',
      rol: RolUsuario.SECRETARIA,
      nombre: 'Secretaria',
      apellido: 'Demo',
    },
    {
      email: 'facturador@demo.com',
      rol: RolUsuario.FACTURADOR,
      nombre: 'Facturador',
      apellido: 'Demo',
    },
    {
      email: 'profesional@demo.com',
      rol: RolUsuario.PROFESIONAL,
      nombre: 'Profesional',
      apellido: 'Demo',
    },
  ];

  // =========================
  // Limpieza segura (solo demos)
  // =========================
  console.log('🧹 Eliminando usuarios demo existentes (si existen)...');

  for (const user of USERS) {
    const existing = await prisma.usuario.findUnique({
      where: { email: user.email },
    });

    if (!existing) continue;

    // Si es profesional, borrar primero la relación
    if (user.rol === RolUsuario.PROFESIONAL) {
      await prisma.profesional.deleteMany({
        where: { usuarioId: existing.id },
      });
    }

    await prisma.usuario.delete({
      where: { id: existing.id },
    });

    console.log(`   ❌ ${user.email} eliminado`);
  }

  // =========================
  // Creación
  // =========================
  console.log('✨ Creando usuarios demo...');

  for (const user of USERS) {
    const createdUser = await prisma.usuario.create({
      data: {
        email: user.email,
        passwordHash: PASSWORD_HASH,
        rol: user.rol,
        nombre: user.nombre,
        apellido: user.apellido,
      },
    });

    console.log(`   ✅ ${user.email} creado (${user.rol})`);

    // Crear profesional si corresponde
    if (user.rol === RolUsuario.PROFESIONAL) {
      await prisma.profesional.create({
        data: {
          usuarioId: createdUser.id,
        },
      });

      console.log(`      👨‍⚕️ Profesional vinculado`);
    }
  }

  console.log('🎉 Seed demo completado');
  console.log('🔑 Password para todos: demo123');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed demo', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
