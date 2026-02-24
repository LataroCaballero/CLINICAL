---
phase: 02-log-de-contactos-lista-de-accion
verified: 2026-02-23T00:00:00Z
status: human_needed
score: 5/5 must-haves verified
human_verification:
  - test: "Registrar un contacto desde el drawer del paciente y verificar que persiste en BD y que la etapa/temperatura se actualiza"
    expected: "El contacto aparece en el historial del drawer, el badge de días sin contacto se actualiza a 0, y si se cambió etapa/temperatura se refleja en el Kanban"
    why_human: "Flujo end-to-end que requiere backend corriendo con BD real; no se puede verificar estáticamente"
  - test: "Registrar un contacto desde /dashboard/accion y verificar animación de desaparición y contador"
    expected: "La card del paciente se pone verde por ~800ms y luego desaparece con animación de colapso de altura; el contador 'Contactados hoy' incrementa; al recargar la página el paciente sigue sin aparecer"
    why_human: "Comportamiento visual en tiempo real con animación framer-motion y sincronización server-side requiere ejecución real"
  - test: "Verificar que los pacientes con etapaCRM CONFIRMADO o PERDIDO no aparecen en la Lista de Acción"
    expected: "GET /pacientes/lista-accion no devuelve ningún paciente cuya etapaCRM sea CONFIRMADO o PERDIDO"
    why_human: "Requiere datos de prueba en BD con esas etapas para validar el filtro en práctica"
---

# Phase 2: Log de Contactos + Lista de Accion — Verification Report

**Phase Goal:** El coordinador tiene un registro completo de toda interacción con cada paciente y una lista diaria priorizada que le dice con quién hablar hoy.
**Verified:** 2026-02-23
**Status:** human_needed — todos los checks automáticos pasaron; 3 items requieren verificación en ejecución real
**Re-verification:** No — verificación inicial

---

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | El coordinador puede registrar una interacción (llamada, mensaje, presencial) desde el perfil del paciente con tipo, nota y fecha | VERIFIED | `POST /pacientes/:id/contactos` existe en controller; `ContactoSheet` con campos tipo/nota/fecha wired a `useCreateContacto` que llama a la API |
| 2 | El perfil del paciente muestra el historial completo de interacciones en orden cronológico, con días desde el último contacto visible | VERIFIED | `ContactosSection` wired a `useContactos` → `GET /pacientes/:id/contactos` (orderBy fecha desc); badge de `diasSinContacto` con colores presente en `ContactosSection` |
| 3 | Al registrar una interacción, el coordinador puede cambiar la etapa CRM y temperatura del paciente en el mismo formulario | VERIFIED | `ContactoSheet` tiene selectores de `etapaCRM` y `temperatura`; `createContacto` en service usa `$transaction` para actualizar `Paciente` si se proveen esos campos |
| 4 | La vista "Lista de Accion" muestra los pacientes ordenados por prioridad calculada (días sin contacto + temperatura + etapa) | VERIFIED | `getListaAccion()` en service calcula `score = min(diasSinContacto,30) x tempWeight x etapaWeight` y ordena por score desc; `/dashboard/accion` page renderiza los items con `useListaAccion` |
| 5 | Los pacientes contactados hoy desaparecen de la lista hasta el próximo período de seguimiento | VERIFIED | Exclusión server-side en `getListaAccion()` con `NOT { contactos: { some: { fecha: { gte: hoyInicio } } } }` (UTC-3); exclusión optimista client-side con `contactadosIds` Set en la página |

**Score: 5/5 truths verified**

---

## Required Artifacts

### Plan 01 Artifacts (Backend)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/prisma/schema.prisma` | modelo ContactoLog + enum TipoContacto + relaciones | VERIFIED | `model ContactoLog` existe en línea 1010; `enum TipoContacto` (LLAMADA/MENSAJE/PRESENCIAL) en línea 1004; `contactos ContactoLog[]` en Paciente y Profesional |
| `backend/src/prisma/migrations/20260223224551_contact_log/migration.sql` | Migración aplicada | VERIFIED | Directorio y `migration.sql` presentes |
| `backend/src/modules/pacientes/dto/create-contacto.dto.ts` | DTO con class-validator, exporta `CreateContactoDto` | VERIFIED | Exporta `CreateContactoDto` con `@IsEnum(TipoContacto)`, campos opcionales con `@IsOptional()` |
| `backend/src/modules/pacientes/pacientes.controller.ts` | 3 endpoints: GET lista-accion, GET :id/contactos, POST :id/contactos | VERIFIED | Los 3 endpoints presentes; `@Get('lista-accion')` colocado ANTES de `@Get(':id')` en línea 83 |
| `backend/src/modules/pacientes/pacientes.service.ts` | `getListaAccion()`, `getContactosByPaciente()`, `createContacto()` | VERIFIED | Los 3 métodos públicos encontrados; `$transaction` en `createContacto`; lógica de scoring con pesos y exclusión UTC-3 en `getListaAccion` |

### Plan 02 Artifacts (Frontend — Log Panel)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/components/ui/sheet.tsx` | shadcn Sheet component con exports requeridos | VERIFIED | Archivo existe (instalado vía `npx shadcn`) |
| `frontend/src/hooks/useContactos.ts` | Query hook exportando `useContactos` | VERIFIED | Exporta `useContactos`, `ContactoLog`, `ContactosResponse`; llama a `GET /pacientes/${pacienteId}/contactos` |
| `frontend/src/hooks/useCreateContacto.ts` | Mutation hook con 4-query invalidation | VERIFIED | Exporta `useCreateContacto`; invalida `contactos`, `lista-accion`, `crm-kanban`, `paciente` en `onSuccess` |
| `frontend/src/components/crm/ContactoSheet.tsx` | Formulario RHF+Zod como sheet lateral | VERIFIED | Exporta `ContactoSheet`; usa `useCreateContacto`; tiene campos tipo/nota/etapaCRM/temperatura/proxima-accion con presets |
| `frontend/src/app/dashboard/pacientes/components/ContactosSection.tsx` | Sección inline con últimas 5 + días sin contacto | VERIFIED | Exporta `ContactosSection`; llama `useContactos(pacienteId, 5)`; renderiza badge de `diasSinContacto` con colores de urgencia |

### Plan 03 Artifacts (Frontend — Lista de Accion)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/hooks/useListaAccion.ts` | Query hook exportando `useListaAccion` | VERIFIED | Exporta `useListaAccion`, `ListaAccionItem`, `ListaAccionResponse`; llama a `GET /pacientes/lista-accion?profesionalId=X` |
| `frontend/src/app/dashboard/accion/page.tsx` | Página con cards + AnimatePresence + contador | VERIFIED | Página existente con `PatientActionCard`, `AnimatePresence mode="popLayout"`, contador `contactadosHoy`, `ContactoSheet` en cada card |
| `frontend/src/app/dashboard/components/ListaAccionWidget.tsx` | Widget con top 3 + link a /dashboard/accion | VERIFIED | Componente existente y wired con `useListaAccion` y `useEffectiveProfessionalId`; exporta `ListaAccionWidget`. Note: no está montado en `dashboard/page.tsx` (decisión documentada) |
| `frontend/src/lib/permissions.ts` | Ruta /dashboard/accion con roles ADMIN/PROFESIONAL/SECRETARIA | VERIFIED | `{ prefix: '/dashboard/accion', roles: ['ADMIN', 'PROFESIONAL', 'SECRETARIA'] }` presente en línea 29 |
| `frontend/src/app/dashboard/components/Sidebar.tsx` | Nav item "Acción" con ícono ListChecks | VERIFIED | `ListChecks` importado de lucide-react; item `{ href: "/dashboard/accion", label: "Acción", icon: <ListChecks /> }` presente |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `PacientesController.createContacto` | `PacientesService.createContacto` | `prisma.$transaction` | WIRED | `this.pacientesService.createContacto(...)` en controller; `prisma.$transaction(async (tx) => {...})` en service |
| `GET /pacientes/lista-accion` | `PacientesService.getListaAccion` | `@Get('lista-accion')` antes de `@Get(':id')` | WIRED | Ruta en línea 83, antes del wildcard `@Get(':id')` — correcto, no hay shadowing |
| `ContactoLog` a `Paciente` | FK `pacienteId` | `pacienteId String` en schema | WIRED | `pacienteId String` en `ContactoLog`, `paciente Paciente @relation(...)` con `onDelete: Cascade` |
| `ContactoSheet` | `useCreateContacto` | `mutation.mutate()` on form submit | WIRED | `useCreateContacto(pacienteId)` en línea 92; `mutation.mutateAsync({...})` en `onSubmit` |
| `ContactosSection` | `useContactos` | hook call con pacienteId | WIRED | `useContactos(pacienteId, 5)` en línea 30 de `ContactosSection.tsx` |
| `PatientDrawer` | `ContactosSection` | import y render en drawer body | WIRED | `import { ContactosSection }` en línea 22; renderizado en línea 66 con `pacienteId` y `pacienteNombre` |
| `accion/page.tsx` | `useListaAccion` | hook call con effectiveProfessionalId | WIRED | `useListaAccion(effectiveProfessionalId)` en línea 110 |
| `accion/page.tsx` | `ContactoSheet` | import y render en cada card | WIRED | `<ContactoSheet pacienteId={item.id} ...>` en línea 89 de `PatientActionCard` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| LOG-01 | 02-01, 02-02 | Coordinador puede registrar interacción (llamada/mensaje/presencial) con fecha, tipo y nota | SATISFIED | `POST /pacientes/:id/contactos` + `ContactoSheet` con los 3 tipos y campos fecha/nota |
| LOG-02 | 02-01, 02-02 | Perfil del paciente muestra historial completo cronológico | SATISFIED | `GET /pacientes/:id/contactos` orderBy fecha desc + `ContactosSection` en `PatientDrawer` |
| LOG-03 | 02-01, 02-02 | Al registrar interacción se puede actualizar etapaCRM y temperatura en el mismo paso | SATISFIED | `ContactoSheet` con selectores opcionales; `createContacto` usa `$transaction` para actualizar `Paciente` |
| LOG-04 | 02-01, 02-02 | El sistema muestra días sin contacto por paciente | SATISFIED | `diasSinContacto` calculado server-side en `getContactosByPaciente()`; badge visible en `ContactosSection` |
| ACCION-01 | 02-01, 02-03 | Coordinador ve lista diaria ordenada por prioridad | SATISFIED | `getListaAccion()` con score = diasSinContacto × tempWeight × etapaWeight; `/dashboard/accion` page |
| ACCION-02 | 02-01, 02-03 | Prioridad calculada automáticamente (días sin contacto + temperatura + etapa CRM) | SATISFIED | `calcularScore()` en service con pesos por temperatura (CALIENTE=3, TIBIO=2, FRIO=1) y etapaCRM |
| ACCION-03 | 02-03 | Desde lista de acción se puede registrar la interacción sin salir de la vista | SATISFIED | `ContactoSheet` inline en cada `PatientActionCard` en `/dashboard/accion` |
| ACCION-04 | 02-01, 02-03 | Pacientes contactados hoy desaparecen de la lista | SATISFIED | Exclusión server-side en `getListaAccion()` + exclusión optimista client-side con `contactadosIds` Set |

**Nota sobre REQUIREMENTS.md:** Todos los 8 requirement IDs del Phase 2 (LOG-01 a LOG-04, ACCION-01 a ACCION-04) están marcados como `[x]` completos en REQUIREMENTS.md y como `Complete` en la tabla de traceabilidad. No hay requirements huérfanos asignados a Phase 2 que no estén cubiertos.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `ContactosSection.tsx` | 99 | Función onClick vacía en botón "Ver todos" (`{/* future: expand */}`) | Warning | El botón "Ver todos" renderiza pero no navega — UX incompleta, no bloquea funcionalidad core |

El botón "Ver todos (N)" en `ContactosSection` tiene un `onClick` sin implementación (`() => {/* future: expand or open full-page view */}`). La funcionalidad core de registrar contactos y ver las últimas 5 entradas funciona correctamente. Este es un stub de UX menor, no un bloqueador.

---

## Deviations from Plan — Documented and Accepted

Las siguientes desviaciones fueron documentadas en los SUMMARYs y son aceptadas:

1. **EtapaCRM enum values corregidos** (02-01-SUMMARY, 02-03-SUMMARY): El plan usaba `CONSULTA_AGENDADA` / `CONSULTA_REALIZADA` que no existen en el schema. Los archivos usan los valores correctos `TURNO_AGENDADO` / `CONSULTADO`.

2. **ListaAccionWidget removido del dashboard home** (02-03-SUMMARY, decisión post-checkpoint humano): El widget existe como componente (`ListaAccionWidget.tsx`) y está wired correctamente, pero no se monta en `dashboard/page.tsx` porque el dashboard ya era denso con CRM KPIs y Funnel. La Lista de Acción es accesible desde el sidebar nav item "Acción". El ROADMAP Success Criterion 4 ("La vista 'Lista de Accion' muestra...") se satisface via la página `/dashboard/accion`, no necesariamente via widget en home.

---

## Human Verification Required

### 1. Flujo completo: registrar contacto desde drawer del paciente

**Test:** Con backend y frontend corriendo, abrir un paciente en el drawer, hacer scroll hasta "Historial de contactos", hacer clic en "+ Registrar", completar el formulario (tipo: Llamada, nota: texto de prueba, etapaCRM: TURNO_AGENDADO), guardar.
**Expected:** El sheet se cierra, la sección "Historial de contactos" muestra la nueva entrada (ícono de teléfono, timestamp "hace unos segundos", nota visible truncada), el badge de días sin contacto se actualiza.
**Why human:** Requiere backend corriendo con BD real; la invalidación de queries TanStack y la actualización de UI no se pueden verificar estáticamente.

### 2. Animación de desaparición y contador en Lista de Acción

**Test:** Ir a `/dashboard/accion`, hacer clic en "Registrar" en cualquier card, completar y guardar el contacto.
**Expected:** La card se marca en verde brevemente, luego se colapsa con animación (opacidad 0 + altura 0 en 250ms), el contador "N pacientes contactados hoy" incrementa. Al recargar la página, el paciente contactado no reaparece.
**Why human:** El comportamiento visual de framer-motion `AnimatePresence` y la sincronización server-side requieren ejecución real para verificar.

### 3. Exclusión de CONFIRMADO/PERDIDO de la lista de acción

**Test:** Con un paciente cuya `etapaCRM` sea `CONFIRMADO` o `PERDIDO`, verificar que no aparece en `GET /pacientes/lista-accion`.
**Expected:** El endpoint devuelve solo pacientes con etapas distintas de CONFIRMADO y PERDIDO.
**Why human:** Requiere datos de prueba en BD con esas etapas específicas para confirmar el filtro funciona en la práctica.

---

## Summary

Phase 2 alcanzó su goal: el coordinador puede registrar interacciones desde el perfil del paciente y desde la Lista de Acción, y la plataforma calcula automáticamente quién contactar primero.

**Todas las capas implementadas y wired:**
- Backend: `ContactoLog` Prisma model, migración aplicada, 3 endpoints con lógica de prioridad server-side y exclusión UTC-3
- Frontend (drawer): `ContactosSection` inline en `PatientDrawer`, `ContactoSheet` con todos los campos, hooks `useContactos`/`useCreateContacto` con invalidación de 4 queries
- Frontend (lista de acción): `/dashboard/accion` con `PatientActionCard`, animación `AnimatePresence`, optimistic removal; `useListaAccion` hook; sidebar nav item; permisos correctos
- `ListaAccionWidget` existe como componente standalone (no montado en dashboard home — decisión post-checkpoint documentada)

**Un warning menor:** El botón "Ver todos (N)" en `ContactosSection` no tiene implementación de navegación todavía (placeholder marcado en el código para Phase futura). No bloquea ningún requirement.

**5/5 ROADMAP Success Criteria satisfechos automáticamente.** La verificación humana confirmaría el comportamiento runtime end-to-end.

---

_Verified: 2026-02-23_
_Verifier: Claude (gsd-verifier)_
