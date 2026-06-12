---
phase: quick-1-eliminar-dropdown-tipo-de-consulta-de-hc
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/components/live-turno/tabs/hc/HCCreatorForm.tsx
autonomous: false
requirements: [QUICK-1]

must_haves:
  truths:
    - "El medico no ve ningun dropdown 'Tipo de consulta' al crear una entrada de HC (ni en LiveTurno ni en PatientDrawer)"
    - "Al guardar una entrada de HC, el backend recibe tipoEntrada con el valor mapeado de la plantilla seleccionada (primera_vez -> CONSULTA_CIRUGIA, pre_quirurgico -> PREOPERATORIO, control -> CONTROL, tratamiento_en_consultorio -> TRATAMIENTO)"
    - "La clasificacion automatica de flujo CRM (resolverNuevoFlujo en backend) sigue funcionando igual porque tipoEntrada llega con los mismos valores que antes"
  artifacts:
    - path: "frontend/src/components/live-turno/tabs/hc/HCCreatorForm.tsx"
      provides: "Formulario HC sin selector de tipo de consulta, con tipoEntrada derivado de PLANTILLA_TO_TIPO_ENTRADA"
      contains: "PLANTILLA_TO_TIPO_ENTRADA"
  key_links:
    - from: "frontend/src/components/live-turno/tabs/hc/HCCreatorForm.tsx"
      to: "useCreateHistoriaClinicaEntry dto.tipoEntrada"
      via: "PLANTILLA_TO_TIPO_ENTRADA[tipoSeleccionado] en handleSave"
      pattern: "tipoEntrada:\\s*PLANTILLA_TO_TIPO_ENTRADA"
---

<objective>
Eliminar el dropdown "Tipo de consulta" (selector de tipoEntrada agregado en v1.8 / HC-02) de HCCreatorForm. El tipoEntrada se infiere automaticamente de la plantilla seleccionada via el mapeo PLANTILLA_TO_TIPO_ENTRADA ya existente en el mismo archivo (mapeo 1:1 para las 4 plantillas visibles, sin ambiguedad).

Purpose: El medico no debe ver ni elegir el tipo de consulta — es ruido en el flujo de carga. La clasificacion CRM automatica al cerrar sesion no cambia: el backend sigue recibiendo tipoEntrada con los mismos valores.
Output: HCCreatorForm.tsx sin el bloque Select de tipo de consulta, con tipoEntrada derivado en el momento del save.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@frontend/src/components/live-turno/tabs/hc/HCCreatorForm.tsx
@frontend/src/hooks/useCreateHistoriaClinicaEntry.ts

<interfaces>
From frontend/src/hooks/useCreateHistoriaClinicaEntry.ts (NO modificar — contrato backend intacto):
```typescript
// CreateEntradaDto incluye:
tipoEntrada?: 'CONSULTA_CIRUGIA' | 'TRATAMIENTO' | 'CONTROL' | 'SEGUIMIENTO' | 'PREOPERATORIO';
export type TipoEntradaHCValue = NonNullable<CreateEntradaDto['tipoEntrada']>;
```

Estado actual de HCCreatorForm.tsx (lineas relevantes):
- L14: importa `TipoEntradaHCValue` del hook (se sigue usando para tipar el mapeo)
- L15: importa Select/SelectContent/SelectItem/SelectTrigger/SelectValue — solo se usan en el dropdown a eliminar
- L43-49: constante `TIPO_ENTRADA_OPTIONS` — solo la usa el dropdown
- L51-58: `PLANTILLA_TO_TIPO_ENTRADA` — SE MANTIENE (es la fuente del valor)
- L70: estado `tipoEntradaHC` + setter
- L108-115: `canSave` exige `tipoEntradaHC !== null`
- L122-164: tres llamadas a `createEntry.mutateAsync` con `tipoEntrada: tipoEntradaHC ?? undefined`
- L226-227: onClick de los botones de plantilla setea `setTipoEntradaHC(PLANTILLA_TO_TIPO_ENTRADA[id] ?? 'CONTROL')`
- L242-264: bloque JSX del dropdown "Tipo de consulta" — ELIMINAR completo
- L175: reset `setTipoEntradaHC(null)` en el timeout post-save
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Eliminar dropdown Tipo de consulta y derivar tipoEntrada del mapeo de plantilla</name>
  <files>frontend/src/components/live-turno/tabs/hc/HCCreatorForm.tsx</files>
  <action>
En frontend/src/components/live-turno/tabs/hc/HCCreatorForm.tsx:

1. Eliminar el bloque JSX completo "Tipo de consulta selector" (lineas ~242-264: el `{tipoSeleccionado !== null && (...)}` que contiene label "Tipo de consulta" y el Select).
2. Eliminar el estado `tipoEntradaHC` / `setTipoEntradaHC` (linea ~70) y todas sus referencias:
   - En el onClick de los botones de plantilla (linea ~227), quitar `setTipoEntradaHC(...)`.
   - En el reset post-save (linea ~175), quitar `setTipoEntradaHC(null)`.
   - En `canSave` (linea ~110), quitar la condicion `tipoEntradaHC !== null` (queda derivada de `tipoSeleccionado !== null`, que ya esta).
3. En las TRES llamadas a `createEntry.mutateAsync` (primera_vez ~L126, tratamiento_en_consultorio ~L144, tipos libres ~L162), reemplazar `tipoEntrada: tipoEntradaHC ?? undefined` por `tipoEntrada: PLANTILLA_TO_TIPO_ENTRADA[tipoSeleccionado]`. En la rama de primera_vez puede usarse el literal `tipoSeleccionado` ya estrechado o la variable directamente — TypeScript garantiza que `tipoSeleccionado` no es null dentro de handleSave (early return en L118). Las 4 plantillas de TIPOS tienen entrada en el mapeo, asi que el lookup nunca es undefined; mantener `?? 'CONTROL'` como fallback defensivo es aceptable pero opcional.
4. Eliminar la constante `TIPO_ENTRADA_OPTIONS` (lineas ~43-49) — queda sin uso.
5. Eliminar el import de Select/SelectContent/SelectItem/SelectTrigger/SelectValue (linea ~15) — queda sin uso. MANTENER el import de `TipoEntradaHCValue` (tipa PLANTILLA_TO_TIPO_ENTRADA) y la constante `PLANTILLA_TO_TIPO_ENTRADA` completa (incluidas las keys 'libre' y 'practica', inofensivas).
6. NO tocar useCreateHistoriaClinicaEntry.ts ni nada del backend: el DTO sigue enviando `tipoEntrada` opcional con los mismos valores del enum, por lo que resolverNuevoFlujo (historia-clinica.flujo.helpers.ts) no se ve afectado.
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit && npx next lint --file src/components/live-turno/tabs/hc/HCCreatorForm.tsx</automated>
  </verify>
  <done>
- El archivo no contiene el string "Tipo de consulta" ni `TIPO_ENTRADA_OPTIONS` ni estado `tipoEntradaHC`.
- Las tres llamadas a mutateAsync envian `tipoEntrada` derivado de `PLANTILLA_TO_TIPO_ENTRADA[tipoSeleccionado]`.
- tsc --noEmit pasa sin errores y lint no reporta imports sin uso en el archivo.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Verificar creacion de HC sin dropdown en LiveTurno y PatientDrawer</name>
  <files>frontend/src/components/live-turno/tabs/hc/HCCreatorForm.tsx</files>
  <action>Pausa para verificacion humana del flujo de creacion de HC sin el dropdown. No hay implementacion en esta tarea.</action>
  <what-built>HCCreatorForm sin el selector "Tipo de consulta": el tipoEntrada se infiere de la plantilla elegida y se envia al backend igual que antes.</what-built>
  <how-to-verify>
1. Levantar backend (`cd backend && npm run start:dev`) y frontend (`cd frontend && npm run dev`).
2. Abrir un turno en LiveTurno -> tab Historia Clinica: elegir cada plantilla (Primera Consulta, Pre Quirurgico, Control, Tratamiento en Consultorio) y confirmar que NO aparece el dropdown "Tipo de consulta".
3. Guardar una entrada "Control" con texto libre. En la pestana Network (request POST de la entrada de HC), confirmar que el body incluye `"tipoEntrada": "CONTROL"`.
4. Desde PatientDrawer -> crear HC (HCCreatorDialog): repetir con plantilla "Pre Quirurgico" y confirmar `"tipoEntrada": "PREOPERATORIO"` en el request.
5. Confirmar que la entrada guardada aparece en la HC del paciente.
  </how-to-verify>
  <verify>Pasos manuales descritos en how-to-verify (inspeccion de UI y del body del request POST en Network)</verify>
  <done>Usuario confirma: sin dropdown en ambos flujos, tipoEntrada correcto en los requests, entradas visibles en la HC del paciente.</done>
  <resume-signal>Escribir "approved" o describir el problema encontrado</resume-signal>
</task>

</tasks>

<verification>
- `grep -c "Tipo de consulta" frontend/src/components/live-turno/tabs/hc/HCCreatorForm.tsx` retorna 0 coincidencias.
- `grep -n "tipoEntrada: PLANTILLA_TO_TIPO_ENTRADA" frontend/src/components/live-turno/tabs/hc/HCCreatorForm.tsx` muestra 3 coincidencias (una por rama de save).
- `cd frontend && npx tsc --noEmit` pasa.
- Hook useCreateHistoriaClinicaEntry.ts sin cambios (`git diff --stat` solo muestra HCCreatorForm.tsx).
</verification>

<success_criteria>
- El dropdown "Tipo de consulta" ya no existe en ningun flujo de creacion de HC (LiveTurno y PatientDrawer comparten HCCreatorForm).
- Cada entrada de HC guardada llega al backend con el tipoEntrada correcto segun la plantilla (mapeo 1:1), preservando la clasificacion automatica de flujo CRM.
- Sin cambios de contrato en frontend hook ni backend.
</success_criteria>

<output>
After completion, create `.planning/quick/1-eliminar-dropdown-tipo-de-consulta-de-hc/1-SUMMARY.md`
</output>
