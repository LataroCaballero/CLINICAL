---
phase: 43-archivar-embudo-crm
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/src/prisma/schema.prisma
  - backend/src/prisma/migrations/20260609000000_add_crm_archivado/migration.sql
  - backend/src/modules/pacientes/dto/update-crm-archivo.dto.ts
  - backend/src/modules/pacientes/pacientes.controller.ts
  - backend/src/modules/pacientes/pacientes.service.ts
autonomous: true
requirements: [ARCH-01, ARCH-02, ARCH-03]

must_haves:
  truths:
    - "El campo crmArchivado existe en la tabla Paciente con default false"
    - "PATCH /pacientes/:id/crm-archivo persiste crmArchivado y soporta archivar y desarchivar (toggle)"
    - "getKanban excluye automáticamente pacientes con crmArchivado = true"
    - "getListaAccion excluye automáticamente pacientes con crmArchivado = true"
  artifacts:
    - path: "backend/src/prisma/schema.prisma"
      provides: "Campo crmArchivado Boolean @default(false) en model Paciente"
      contains: "crmArchivado"
    - path: "backend/src/prisma/migrations/20260609000000_add_crm_archivado/migration.sql"
      provides: "ALTER TABLE Paciente ADD COLUMN crmArchivado"
      contains: "crmArchivado"
    - path: "backend/src/modules/pacientes/dto/update-crm-archivo.dto.ts"
      provides: "DTO con campo archivado:boolean validado"
      contains: "IsBoolean"
    - path: "backend/src/modules/pacientes/pacientes.service.ts"
      provides: "updateCrmArchivo + filtros crmArchivado en getKanban/getListaAccion"
      contains: "crmArchivado"
    - path: "backend/src/modules/pacientes/pacientes.controller.ts"
      provides: "Ruta @Patch(':id/crm-archivo')"
      contains: "crm-archivo"
  key_links:
    - from: "pacientes.controller.ts @Patch(':id/crm-archivo')"
      to: "pacientesService.updateCrmArchivo"
      via: "controller delega al service"
      pattern: "updateCrmArchivo"
    - from: "pacientes.service.ts getKanban"
      to: "prisma.paciente.findMany where"
      via: "filtro crmArchivado: false"
      pattern: "crmArchivado: false"
    - from: "pacientes.service.ts getListaAccion"
      to: "prisma.paciente.findMany where"
      via: "filtro crmArchivado: false"
      pattern: "crmArchivado: false"
---

<objective>
Agregar el campo `crmArchivado` al modelo Paciente, exponer el endpoint `PATCH /pacientes/:id/crm-archivo` (toggle archivar/desarchivar), y excluir automáticamente los pacientes archivados del kanban CRM y de la lista de acción diaria.

Purpose: Permitir que la secretaria retire pacientes irrelevantes del embudo CRM sin eliminarlos del sistema, manteniendo el kanban enfocado en oportunidades activas (ARCH-01, ARCH-02, ARCH-03).
Output: Migración de schema, DTO, endpoint controller, método de service y filtros en las dos queries CRM.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md

@backend/src/prisma/schema.prisma
@backend/src/modules/pacientes/pacientes.controller.ts
@backend/src/modules/pacientes/pacientes.service.ts
@backend/src/modules/pacientes/dto/update-whatsapp-opt-in.dto.ts

<interfaces>
<!-- Patrones reales del repo a reutilizar — el executor NO debe explorar la base de código. -->

Modelo Paciente (backend/src/prisma/schema.prisma, líneas ~148-217). Agregar el campo
JUNTO a los otros Boolean del CRM (whatsappOptIn, enListaEspera):
```prisma
  enListaEspera              Boolean           @default(false)
  // ... otros campos CRM ...
```
NO agregar índice nuevo (el filtro siempre va acompañado de profesionalId que ya está indexado).

DTO template (backend/src/modules/pacientes/dto/update-whatsapp-opt-in.dto.ts):
```typescript
import { IsBoolean } from 'class-validator';
export class UpdateWhatsappOptInDto {
  @IsBoolean()
  optIn: boolean;
}
```

Service method template — updateWhatsappOptIn (pacientes.service.ts ~líneas 731-751):
```typescript
async updateWhatsappOptIn(id: string, optIn: boolean) {
  const exists = await this.prisma.paciente.findUnique({
    where: { id }, select: { id: true },
  });
  if (!exists) throw new NotFoundException('Paciente no encontrado');
  return this.prisma.paciente.update({
    where: { id },
    data: { whatsappOptIn: optIn, whatsappOptInAt: optIn ? new Date() : null },
    select: { id: true, nombreCompleto: true, whatsappOptIn: true, whatsappOptInAt: true },
  });
}
```

Controller route template — updateWhatsappOptIn (pacientes.controller.ts ~líneas 202-208):
```typescript
@Patch(':id/whatsapp-opt-in')
updateWhatsappOptIn(@Param('id') id: string, @Body() dto: UpdateWhatsappOptInDto) {
  return this.pacientesService.updateWhatsappOptIn(id, dto.optIn);
}
```

getKanban WHERE actual (pacientes.service.ts ~línea 593-597):
```typescript
where: {
  profesionalId,
  OR: [{ flujo: FlujoPaciente.CIRUGIA }, { flujo: null }],
},
```

getListaAccion WHERE actual (pacientes.service.ts ~líneas 799-806):
```typescript
where: {
  profesionalId,
  etapaCRM: { notIn: ['CONFIRMADO', 'PERDIDO'] as EtapaCRM[] },
  NOT: { contactos: { some: { fecha: { gte: hoyInicio } } } },
  OR: [{ flujo: FlujoPaciente.CIRUGIA }, { flujo: null }],
},
```
NOTA: ambas queries usan `OR` para flujo. Agregar `crmArchivado: false` como condición
top-level del `where` (AND implícito) — NO dentro del array OR.

Carpeta de migraciones: backend/src/prisma/migrations/ (nombre formato: YYYYMMDDHHMMSS_descripcion)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Agregar campo crmArchivado al schema y crear migración manual</name>
  <files>backend/src/prisma/schema.prisma, backend/src/prisma/migrations/20260609000000_add_crm_archivado/migration.sql</files>
  <action>
    1. En `backend/src/prisma/schema.prisma`, dentro del `model Paciente` (línea ~148), agregar el campo Boolean junto a los otros booleanos del CRM (después de `enListaEspera` o cerca de `whatsappOptIn`):
       `crmArchivado               Boolean           @default(false)`
       NO agregar nuevo @@index — el filtro siempre va junto a profesionalId (ya indexado).
    2. Crear la migración manual en `backend/src/prisma/migrations/20260609000000_add_crm_archivado/migration.sql` con:
       `ALTER TABLE "Paciente" ADD COLUMN "crmArchivado" BOOLEAN NOT NULL DEFAULT false;`
       (verificar el nombre exacto de la tabla — el modelo Paciente no tiene @@map, así que la tabla es "Paciente").
    3. Regenerar el cliente Prisma: `cd backend && npx prisma generate`.
    Crear la migración manualmente (no correr `prisma migrate dev` que requiere conexión a DB) — seguir el patrón de migraciones existentes del repo (ver carpeta migrations/).
  </action>
  <verify>
    <automated>cd backend && npx prisma validate && npx prisma generate && grep -q "crmArchivado" src/prisma/schema.prisma && grep -q "crmArchivado" src/prisma/migrations/20260609000000_add_crm_archivado/migration.sql && echo OK</automated>
  </verify>
  <done>El modelo Paciente tiene `crmArchivado Boolean @default(false)`, el cliente Prisma regenerado lo expone, y existe la migration.sql con el ALTER TABLE.</done>
</task>

<task type="auto">
  <name>Task 2: Crear DTO, endpoint PATCH crm-archivo y método de service</name>
  <files>backend/src/modules/pacientes/dto/update-crm-archivo.dto.ts, backend/src/modules/pacientes/pacientes.controller.ts, backend/src/modules/pacientes/pacientes.service.ts</files>
  <action>
    1. Crear `backend/src/modules/pacientes/dto/update-crm-archivo.dto.ts` siguiendo el patrón de update-whatsapp-opt-in.dto.ts:
       ```typescript
       import { IsBoolean } from 'class-validator';
       export class UpdateCrmArchivoDto {
         @IsBoolean()
         archivado: boolean;
       }
       ```
    2. En `pacientes.service.ts`, agregar `async updateCrmArchivo(id: string, archivado: boolean)` siguiendo el patrón de `updateWhatsappOptIn`: verificar que el paciente existe (findUnique select id, NotFoundException si no), luego `prisma.paciente.update` con `data: { crmArchivado: archivado }` y `select: { id, nombreCompleto, crmArchivado }`. Es un toggle: el frontend manda el valor destino (true=archivar, false=desarchivar).
    3. En `pacientes.controller.ts`, importar `UpdateCrmArchivoDto` y agregar la ruta DESPUÉS de `@Patch(':id/whatsapp-opt-in')` y ANTES de `@Patch(':id/flujo')` (orden de rutas con params no genéricos no es crítico aquí porque el segmento es literal `crm-archivo`):
       ```typescript
       @Patch(':id/crm-archivo')
       updateCrmArchivo(@Param('id') id: string, @Body() dto: UpdateCrmArchivoDto) {
         return this.pacientesService.updateCrmArchivo(id, dto.archivado);
       }
       ```
       Roles: la ruta hereda `@Auth('ADMIN','PROFESIONAL','SECRETARIA','FACTURADOR')` del controller — apropiado (la secretaria debe poder archivar). NO agregar @Auth restrictivo.
  </action>
  <verify>
    <automated>cd backend && npx tsc --noEmit -p tsconfig.build.json && grep -q "crm-archivo" src/modules/pacientes/pacientes.controller.ts && grep -q "updateCrmArchivo" src/modules/pacientes/pacientes.service.ts && echo OK</automated>
  </verify>
  <done>Compila sin errores TS. El endpoint `PATCH /pacientes/:id/crm-archivo` recibe `{archivado:boolean}` y persiste `crmArchivado`. Toggle funciona en ambos sentidos (true/false).</done>
</task>

<task type="auto">
  <name>Task 3: Excluir pacientes archivados en getKanban y getListaAccion</name>
  <files>backend/src/modules/pacientes/pacientes.service.ts</files>
  <action>
    En `pacientes.service.ts`:
    1. En `getKanban` (where ~línea 593): agregar `crmArchivado: false,` como propiedad top-level del objeto `where` (junto a `profesionalId`, NO dentro del array `OR`). El where queda:
       ```typescript
       where: {
         profesionalId,
         crmArchivado: false,
         OR: [{ flujo: FlujoPaciente.CIRUGIA }, { flujo: null }],
       },
       ```
    2. En `getListaAccion` (where ~línea 799): agregar `crmArchivado: false,` como propiedad top-level del objeto `where` (junto a `profesionalId`, fuera del `OR` y del `NOT`). El where queda:
       ```typescript
       where: {
         profesionalId,
         crmArchivado: false,
         etapaCRM: { notIn: ['CONFIRMADO', 'PERDIDO'] as EtapaCRM[] },
         NOT: { contactos: { some: { fecha: { gte: hoyInicio } } } },
         OR: [{ flujo: FlujoPaciente.CIRUGIA }, { flujo: null }],
       },
       ```
    No tocar la lógica de agrupación por columnas ni el cálculo de score — solo el filtro de la query.
  </action>
  <verify>
    <automated>cd backend && npx tsc --noEmit -p tsconfig.build.json && [ "$(grep -c 'crmArchivado: false' src/modules/pacientes/pacientes.service.ts)" -ge 2 ] && echo OK</automated>
  </verify>
  <done>getKanban y getListaAccion incluyen `crmArchivado: false` en su where; los pacientes archivados ya no aparecen en kanban ni en la lista de acción sin filtros manuales.</done>
</task>

</tasks>

<verification>
- `npx prisma validate` pasa y el cliente regenerado expone `crmArchivado`.
- `npx tsc --noEmit -p tsconfig.build.json` compila sin errores.
- `grep -c 'crmArchivado: false'` en pacientes.service.ts devuelve >= 2 (kanban + lista-accion).
- La ruta `crm-archivo` existe en el controller y delega a `updateCrmArchivo`.
- `findOne(id)` (que retorna el paciente completo) sigue devolviendo el paciente archivado — NO se filtra ahí (ARCH-04: visible en sección general).
</verification>

<success_criteria>
- ARCH-01: model Paciente tiene `crmArchivado Boolean @default(false)` + migración.
- ARCH-02: `PATCH /pacientes/:id/crm-archivo` persiste el campo y permite toggle (archivar/desarchivar).
- ARCH-03: getKanban y getListaAccion excluyen automáticamente `crmArchivado = true`.
- El paciente archivado NO se elimina (sigue en findAll/findOne).
</success_criteria>

<output>
After completion, create `.planning/phases/43-archivar-embudo-crm/43-01-SUMMARY.md`
</output>
