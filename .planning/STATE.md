---
gsd_state_version: 1.0
milestone: v1.9
milestone_name: Plantilla Primera Consulta
status: Roadmap ready, awaiting first plan
last_updated: "2026-06-12T22:48:00.605Z"
last_activity: 2026-06-12 — Roadmap created (4 phases, 14/14 requirements mapped)
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 6
  completed_plans: 4
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-12)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Milestone v1.9 Plantilla Primera Consulta — Phase 44: Schema + Catálogo en BD

## Current Position

Phase: 44 — Schema + Catálogo en BD
Plan: Not started
Status: Roadmap ready, awaiting first plan
Last activity: 2026-06-12 — Roadmap created (4 phases, 14/14 requirements mapped)

```
Progress: ░░░░░░░░░░ 0% (0/4 phases)
```

## Decisions

(Full decision log in PROJECT.md Key Decisions table. Cleared on milestone completion.)
- [Phase 44]: useCatalogoHC enabled guard via options?.enabled allows SECRETARIA/ADMIN to delay query until profesionalId available
- [Phase 44-schema-cat-logo-en-bd]: Nombres definitivos: ZonaHC / DiagnosticoHC / TratamientoHC; profesionalId denormalizado en hijos sin @relation; esSistema en los 3 modelos; FK opcional TratamientoHC→Tratamiento con ON DELETE SET NULL
- [Phase 44-schema-cat-logo-en-bd]: Seed runs outside transaction in usuarios.service.crear() — failure warn-logged, lazy seed via GET covers any failure
- [Phase 44-schema-cat-logo-en-bd]: crearZona() creates ZonaHC + Otros DiagnosticoHC + Otros TratamientoHC in  — Phase 46 reuses for APR-01
- [Phase 44-schema-cat-logo-en-bd]: normalizarNombre: native NFD + combining-mark strip — no external dependencies for accent-insensitive price matching
- [Phase 45-formulario-primera-consulta]: zonas[] present and non-empty triggers new grouped JSONB shape; empty array treated as legacy; legacy DTO fields kept for LiveTurnoFooter compatibility

## Accumulated Context

### Carry-forward from v1.8
- 4 tipos de turno públicos en DB: "Consulta", "Tratamiento", "Pre-Quirúrgico", "Control" + "Cirugía" (interno, esCirugia=true, oculto vía filtro en findAll)
- TipoEntradaHC enum en HistoriaClinicaEntrada: CONSULTA_CIRUGIA, TRATAMIENTO, CONTROL, SEGUIMIENTO, PREOPERATORIO
- resolverNuevoFlujo helper puro en historia-clinica.flujo.helpers.ts (testeable sin NestJS)
- TratamientosTab dual-source: fuente A (tipoTurno=Tratamiento) OR fuente B (Consulta + tipoEntradaHC=TRATAMIENTO); tipoEntradaHC expuesto en obtenerTurnosPorRango
- crmArchivado Boolean en Paciente; getKanban/getListaAccion filtran crmArchivado=false; PATCH :id/crm-archivo toggle
- Dialog-from-Sheet + onSettled invalidation por key prefix (patrón establecido v1.7, reusado v1.8)
- Quick task 1 (2026-06-12): dropdown "Tipo de consulta" eliminado de HCCreatorForm — tipoEntrada inferido de la plantilla

### Carry-forward from v1.7
- CRM kanban movimiento libre con warnings no bloqueantes (forward-only guard para auto-transiciones)
- etapasProtegidas pattern para PERDIDO: [CONFIRMADO, PROCEDIMIENTO_REALIZADO]
- getKanban ACEPTADO-first para múltiples presupuestos (elimina falsos positivos)
- HCCreatorForm reutilizable compartido entre LiveTurno y PatientDrawer

### Relevant to v1.9
- Plantilla actual: PrimeraConsultaForm.tsx consume frontend/src/lib/zonas-diagnostico.json (hardcodeado) vía zonas-diagnostico.ts
- Zonas actuales en JSON: abdomen, Nariz, Mamas, Otros (diagnósticos); tratamientos en categorías separadas: abdominoplastia, mastoplastia, rinoplastia, lunar_cirugia_local, tratamiento_facial, otros
- Mapeo zona → tratamiento para seed: abdominoplastia→Abdomen, mastoplastia→Mamas, rinoplastia→Nariz, tratamiento_facial→Facial, lunar_cirugia_local→Locales
- Facial y Locales: sin diagnósticos definidos hoy → arrancan con diagnósticos=[Otros] en v1.9
- addTratamiento ya hace lookup en tratamientosProfesional (catálogo con precios) por nombre — punto de integración existente para APR-04
- Catálogos per-profesional ya existen: cirugias-catalogo y tratamientos — patrón a seguir para ZonaHC
- Migrate deploy (no dev) vía SQL manual — patrón pgBouncer establecido desde v1.2

### Phase 44 Key Decisions (to make)
- Nombres de modelos Prisma: ZonaHC / DiagnosticoHC / TratamientoHC (sugeridos, confirmar)
- Orden de zonas en seed: definir campo `orden` o array ordenado
- Endpoint pattern: GET /profesionales/:id/zonas-hc o GET /historia-clinica/zonas-catalogo

### Known Tech Debt (carry-forward)
- LIVHC-05/PAC-01: tratamientos snapshot no se escribe cuando consumirInsumos=false
- STOCK-03: FACTURADOR excluido del backend de ordenes-consumo pero accede desde frontend
- CALL-01: botón "Llamar" placeholder en agenda
- marcarPracticasPagadas deprecado — limpiar cuando no tenga callers externos
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs
