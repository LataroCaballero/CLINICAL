---
phase: 43-archivar-embudo-crm
plan: 02
type: execute
wave: 2
depends_on: ["43-01"]
files_modified:
  - frontend/src/hooks/useUpdateCrmArchivo.ts
  - frontend/src/components/crm/CardActionsSheet.tsx
autonomous: false
requirements: [ARCH-04]

must_haves:
  truths:
    - "El sheet lateral del kanban (CardActionsSheet) tiene un botón 'Archivar del embudo'"
    - "Al confirmar archivar, el paciente desaparece del kanban CRM sin recargar la página"
    - "Al confirmar archivar, el paciente desaparece de la lista de acción diaria"
    - "El paciente archivado no se elimina del sistema (sigue en la sección de pacientes general)"
  artifacts:
    - path: "frontend/src/hooks/useUpdateCrmArchivo.ts"
      provides: "Mutation hook que llama PATCH /pacientes/:id/crm-archivo e invalida queries CRM"
      contains: "crm-archivo"
    - path: "frontend/src/components/crm/CardActionsSheet.tsx"
      provides: "Botón 'Archivar del embudo' con confirmación que invoca el hook"
      contains: "Archivar del embudo"
  key_links:
    - from: "CardActionsSheet.tsx botón Archivar"
      to: "useUpdateCrmArchivo mutation"
      via: "onClick -> mutate({ pacienteId, archivado: true })"
      pattern: "useUpdateCrmArchivo"
    - from: "useUpdateCrmArchivo.ts onSettled"
      to: "queryClient invalidateQueries crm-kanban + lista-accion"
      via: "invalidación de queries"
      pattern: "crm-kanban"
---

<objective>
Agregar el hook de mutación `useUpdateCrmArchivo` y un botón "Archivar del embudo" en el sheet lateral del kanban (CardActionsSheet). Al confirmar, el paciente se archiva (crmArchivado=true), desaparece del kanban y de la lista de acción, y el sheet se cierra.

Purpose: Dar a la secretaria la acción visible para retirar pacientes del embudo CRM (ARCH-04), cerrando el ciclo del feature sobre el backend del plan 43-01.
Output: Hook TanStack Query + botón con confirmación en el sheet.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md

@frontend/src/components/crm/CardActionsSheet.tsx
@frontend/src/hooks/useUpdateEtapaCRM.ts
@frontend/src/hooks/useUpdateWhatsappOptIn.ts
@frontend/src/components/crm/LossReasonModal.tsx

<interfaces>
<!-- Patrones reales del repo. Backend del plan 43-01 ya expone PATCH /pacientes/:id/crm-archivo con body { archivado: boolean }. -->

Query keys a invalidar (confirmados en el repo):
- Kanban: `["crm-kanban", profesionalId]` (frontend/src/hooks/useCRMKanban.ts:79)
- Lista de acción: `["lista-accion"]` (frontend/src/app/dashboard/accion/page.tsx:117)
- Pacientes: `["pacientes"]`

Hook mutation template (frontend/src/hooks/useUpdateWhatsappOptIn.ts):
```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface UpdateCrmArchivoInput {
  pacienteId: string;
  archivado: boolean;
}

export function useUpdateCrmArchivo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ pacienteId, archivado }: UpdateCrmArchivoInput) => {
      const res = await api.patch(`/pacientes/${pacienteId}/crm-archivo`, { archivado });
      return res.data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-kanban"] });
      queryClient.invalidateQueries({ queryKey: ["lista-accion"] });
      queryClient.invalidateQueries({ queryKey: ["pacientes"] });
    },
  });
}
```

CardActionsSheet.tsx ya importa: Button, toast (sonner), useEffectiveProfessionalId.
Patrón Dialog-from-Sheet (STATE.md): modales de confirmación dentro del kanban usan
Radix Dialog (monta en document.body, sin conflicto z-index con el Sheet). Ver LossReasonModal.tsx.

El FOOTER del sheet está en CardActionsSheet.tsx (~líneas 119-152). El botón nuevo va ahí,
debajo del link "Ver perfil completo" o como nueva fila. Importar icono de lucide-react
(ej. `Archive`).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Crear hook useUpdateCrmArchivo</name>
  <files>frontend/src/hooks/useUpdateCrmArchivo.ts</files>
  <action>
    Crear `frontend/src/hooks/useUpdateCrmArchivo.ts` siguiendo el patrón de useUpdateWhatsappOptIn.ts (ver bloque interfaces). El hook:
    - Exporta `UpdateCrmArchivoInput { pacienteId: string; archivado: boolean }`.
    - `mutationFn` hace `api.patch('/pacientes/${pacienteId}/crm-archivo', { archivado })`.
    - `onSettled` invalida `["crm-kanban"]`, `["lista-accion"]` y `["pacientes"]` (invalidación parcial por key prefix — cubre todas las variantes de profesionalId).
    No agregar optimistic update — la invalidación en onSettled es suficiente para este toggle.
  </action>
  <verify>
    <automated>cd frontend && grep -q "crm-archivo" src/hooks/useUpdateCrmArchivo.ts && grep -q "crm-kanban" src/hooks/useUpdateCrmArchivo.ts && grep -q "lista-accion" src/hooks/useUpdateCrmArchivo.ts && (npx tsc --noEmit 2>&1 | grep -i "useUpdateCrmArchivo" && echo "TS_ERRORS" || echo OK)</automated>
  </verify>
  <done>El hook existe, llama al endpoint correcto e invalida crm-kanban + lista-accion + pacientes. Sin errores TS en el archivo.</done>
</task>

<task type="auto">
  <name>Task 2: Agregar botón 'Archivar del embudo' con confirmación al CardActionsSheet</name>
  <files>frontend/src/components/crm/CardActionsSheet.tsx</files>
  <action>
    En `frontend/src/components/crm/CardActionsSheet.tsx`:
    1. Importar `useUpdateCrmArchivo` desde `@/hooks/useUpdateCrmArchivo`, el icono `Archive` de `lucide-react`, y los componentes Dialog (`Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter`) desde `@/components/ui/dialog` (mismo patrón que LossReasonModal).
    2. Agregar estado `const [archivarOpen, setArchivarOpen] = useState(false);` y `const { mutate: archivar, isPending: archivando } = useUpdateCrmArchivo();`.
    3. En el FOOTER (después del link "Ver perfil completo", ~línea 151), agregar un botón secundario/sutil:
       ```tsx
       <button
         type="button"
         className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center gap-1.5 w-full"
         onClick={() => setArchivarOpen(true)}
       >
         <Archive className="h-3.5 w-3.5" />
         Archivar del embudo
       </button>
       ```
    4. Agregar un Dialog de confirmación (montado junto a los otros dialogs, ~línea 154+) con título "¿Archivar del embudo?", texto explicando que el paciente desaparecerá del kanban y la lista de acción pero NO se elimina del sistema (sigue accesible por búsqueda en Pacientes), y footer con Cancelar + botón "Archivar". El botón Archivar:
       ```tsx
       onClick={() => {
         archivar(
           { pacienteId: patient!.id, archivado: true },
           {
             onSuccess: () => {
               toast.success("Paciente archivado del embudo");
               setArchivarOpen(false);
               onOpenChange(false); // cerrar el sheet
             },
             onError: () => toast.error("No se pudo archivar. Intentá de nuevo."),
           }
         );
       }}
       disabled={archivando}
       ```
    Mantener el patrón Dialog-from-Sheet (Radix monta en document.body — sin conflicto z-index). NO tocar la lógica del stepper ni los otros botones.
  </action>
  <verify>
    <automated>cd frontend && grep -q "Archivar del embudo" src/components/crm/CardActionsSheet.tsx && grep -q "useUpdateCrmArchivo" src/components/crm/CardActionsSheet.tsx && (npx tsc --noEmit 2>&1 | grep -i "CardActionsSheet" && echo "TS_ERRORS" || echo OK)</automated>
  </verify>
  <done>El sheet muestra un botón "Archivar del embudo" que abre un Dialog de confirmación; al confirmar archiva al paciente (archivado=true), muestra toast de éxito y cierra el sheet. Sin errores TS.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Verificación humana — archivar retira del kanban y de la lista de acción</name>
  <files>(verificación manual — sin archivos)</files>
  <action>
    Checkpoint de verificación humana. El executor NO escribe código en esta tarea; solo
    levanta el entorno, aplica la migración y guía al usuario por los pasos de <how-to-verify>.
    Esperar la señal de <resume-signal> antes de cerrar el plan.
  </action>
  <what-built>
    Botón "Archivar del embudo" en el sheet lateral del kanban + hook que persiste crmArchivado=true vía PATCH /pacientes/:id/crm-archivo, con backend (plan 43-01) que excluye archivados de getKanban y getListaAccion.
  </what-built>
  <how-to-verify>
    1. Levantar backend (`cd backend && npm run start:dev`) y frontend (`cd frontend && npm run dev`).
    2. Aplicar la migración en la DB de desarrollo: `cd backend && npx prisma migrate deploy` (o `migrate dev`).
    3. Ir al kanban CRM (dashboard). Abrir el sheet lateral de un paciente visible.
    4. Click en "Archivar del embudo" → confirmar en el dialog.
    5. Verificar (ARCH-01/03/04):
       - El paciente DESAPARECE del kanban inmediatamente (sin recargar).
       - Ir a la Lista de Acción diaria → el paciente NO aparece.
       - Ir a la sección Pacientes (lista general) → el paciente SÍ aparece (no fue eliminado).
       - Buscar el paciente por nombre/DNI → se encuentra (no eliminado).
    6. (Opcional toggle desarchivar) Con un cliente HTTP o el endpoint, mandar `PATCH /pacientes/:id/crm-archivo` con `{ "archivado": false }` → recargar kanban → el paciente reaparece.
  </how-to-verify>
  <verify>
    <automated>MANUAL — checkpoint de verificación humana, sin comando automatizado</automated>
  </verify>
  <done>El usuario confirma ("approved") que archivar retira al paciente del kanban y de la lista de acción, y que sigue visible en la sección de Pacientes.</done>
  <resume-signal>Escribí "approved" si el paciente se archiva/retira correctamente del kanban y la lista de acción y sigue visible en Pacientes, o describí los problemas encontrados.</resume-signal>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` (frontend) compila sin errores en los archivos modificados.
- El hook invalida crm-kanban + lista-accion + pacientes.
- El botón "Archivar del embudo" está presente en el footer del sheet con confirmación.
- Verificación humana confirma el flujo end-to-end (ARCH-04 + integración con ARCH-03).
</verification>

<success_criteria>
- ARCH-04: el sheet lateral del kanban tiene "Archivar del embudo" que activa el toggle.
- Integración: al archivar, el paciente desaparece del kanban y de la lista de acción (ARCH-03) sin recargar.
- El paciente archivado sigue visible en la sección general de pacientes (no eliminado).
</success_criteria>

<output>
After completion, create `.planning/phases/43-archivar-embudo-crm/43-02-SUMMARY.md`
</output>
