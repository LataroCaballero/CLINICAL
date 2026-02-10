type RolUsuario = 'ADMIN' | 'PROFESIONAL' | 'SECRETARIA' | 'FACTURADOR' | 'PACIENTE';

/**
 * Mapa de permisos por ruta (prefix-matching).
 * Rutas más específicas primero para que el match sea correcto.
 * Si una ruta no está listada, se permite a todos los autenticados.
 */
const ROUTE_PERMISSIONS: { prefix: string; roles: RolUsuario[] }[] = [
  // Finanzas - sub-rutas primero
  { prefix: '/dashboard/finanzas/presupuestos', roles: ['ADMIN', 'PROFESIONAL', 'SECRETARIA', 'FACTURADOR'] },
  { prefix: '/dashboard/finanzas', roles: ['ADMIN', 'PROFESIONAL', 'FACTURADOR'] },

  // Turnos
  { prefix: '/dashboard/turnos', roles: ['ADMIN', 'PROFESIONAL', 'SECRETARIA'] },

  // Reportes
  { prefix: '/dashboard/reportes', roles: ['ADMIN', 'PROFESIONAL'] },

  // Configuracion
  { prefix: '/dashboard/configuracion', roles: ['ADMIN', 'PROFESIONAL'] },

  // Stock - acceso total
  { prefix: '/dashboard/stock', roles: ['ADMIN', 'PROFESIONAL', 'SECRETARIA', 'FACTURADOR'] },

  // Pacientes
  { prefix: '/dashboard/pacientes', roles: ['ADMIN', 'PROFESIONAL', 'SECRETARIA', 'FACTURADOR'] },

  // Dashboard home - todos
  { prefix: '/dashboard', roles: ['ADMIN', 'PROFESIONAL', 'SECRETARIA', 'FACTURADOR'] },
];

/**
 * Verifica si un rol tiene acceso a una ruta dada.
 */
export function hasRouteAccess(pathname: string, rol: string | undefined): boolean {
  if (!rol) return false;

  const rule = ROUTE_PERMISSIONS.find((r) => pathname.startsWith(r.prefix));

  // Sin regla definida = acceso libre (ej: /dashboard/perfil)
  if (!rule) return true;

  return rule.roles.includes(rol as RolUsuario);
}

/**
 * Filtra un array de links de navegación según el rol del usuario.
 */
export function filterLinksByRole<T extends { href: string; subItems?: { href: string }[] }>(
  links: T[],
  rol: string | undefined,
): T[] {
  return links
    .filter((link) => hasRouteAccess(link.href, rol))
    .map((link) => {
      if (link.subItems) {
        return {
          ...link,
          subItems: link.subItems.filter((sub) => hasRouteAccess(sub.href, rol)),
        };
      }
      return link;
    });
}
