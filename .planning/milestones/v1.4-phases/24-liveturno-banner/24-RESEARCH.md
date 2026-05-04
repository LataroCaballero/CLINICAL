# Phase 24: LiveTurno Banner - Research

**Researched:** 2026-04-16
**Domain:** Frontend React/Zustand — UI banner component with optimistic state update
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Banner position: sticky between `<LiveTurnoTabs />` and content div — visible in all 4 tabs
- Height: compact ~40-48px barra, not a card
- Text: "Paciente sin clasificar — ¿Cirugía o Tratamiento?"
- Buttons: "Cirugía" and "Tratamiento" (exact labels)
- Dismiss: X icon only at right edge (no text label)
- Color: amber
- Optimistic update: banner disappears instantly on classification click, no wait for server
- After disappear: brief check state "✓ Clasificado como Cirugía" for ~2 seconds in same banner slot
- Best-effort: if PATCH fails, banner stays dismissed, no interruption to consulta
- Once classified in session: banner never returns for that session
- Dismiss: banner disappears for session, patient stays PENDIENTE, banner returns on next `startSession()`
- Visibility: `flujo === 'PENDIENTE'` → show; `flujo === null` → NO show; CIRUGIA/TRATAMIENTO → NO show

### Claude's Discretion
- Animation for banner entry/exit (fade, slide, or none)
- Icon/indicator inside banner (e.g. AlertTriangle from lucide-react)
- Exact brief check state implementation (CSS transition vs setTimeout)
- How to expose `pacienteFlujo` in LiveTurnoSession (store field + iniciar-sesion response mapping)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LIVT-01 | In LiveTurno, if patient has `flujo = PENDIENTE`, an amber non-blocking banner appears indicating the patient must be classified | Store field `pacienteFlujo` read in `LiveTurnoPanel`; banner rendered between tabs and content |
| LIVT-02 | From the banner, the professional can classify as "Cirugía" or "Tratamiento"; banner disappears after action and flujo is saved | `api.patch('/pacientes/:id/flujo', { flujo })` + optimistic store update via `bannerDismissed: true` |
| LIVT-03 | Banner is dismissible per session (disappears without classifying); patient stays PENDIENTE; banner returns on next LiveTurno session | `bannerDismissed` flag reset in `startSession()`, persisted only for session lifetime |
</phase_requirements>

---

## Summary

Phase 24 is a **purely frontend** change. The backend PATCH `/pacientes/:id/flujo` endpoint (from Phase 22) and the `FlujoPaciente` enum are fully in place. The `iniciarSesion` backend method already returns the full `paciente` object via `include` (including `flujo`), so the only backend-touching work is adding `flujo` to the TypeScript interface `IniciarSesionResponse.paciente` in `useLiveTurnoActions.ts`.

The feature requires: (1) extending `LiveTurnoStore` with two fields — `pacienteFlujo` and `bannerDismissed`; (2) mapping `flujo` from the `iniciarSesion` response into the store's `startSession()` call; (3) creating the new `LiveTurnoFlujoBanner.tsx` component; (4) mounting that component in `LiveTurnoPanel.tsx` between `<LiveTurnoTabs />` and the content div.

**Primary recommendation:** Extend the Zustand store minimally, build a single self-contained banner component that calls `api.patch` directly (no new hook file needed), and use a local `useState('idle' | 'classified' | 'dismissed')` for the banner's internal three-state UX.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand (persist) | existing | Store session state + banner flags | Already used for `useLiveTurnoStore` |
| TanStack Query / axios | existing | `api.patch()` for PATCH `/pacientes/:id/flujo` | All mutations in repo use `api.*` directly or via hooks |
| lucide-react | existing | `AlertTriangle` + `X` + `Check` icons | Already imported in live-turno components |
| Tailwind CSS | existing | Amber color classes for banner styling | `bg-amber-50 border-amber-300 text-amber-800` pattern already in repo |
| shadcn/ui Button | existing | Classification action buttons | Already used inside LiveTurno tabs |

### No New Dependencies Required
This phase introduces zero new npm packages. All primitives exist.

---

## Architecture Patterns

### Recommended Project Structure (additions only)
```
frontend/src/
├── components/live-turno/
│   └── LiveTurnoFlujoBanner.tsx   ← NEW: self-contained banner component
├── store/
│   └── live-turno.store.ts        ← EXTEND: add pacienteFlujo + bannerDismissed
├── hooks/
│   └── useLiveTurnoActions.ts     ← EXTEND: add flujo to IniciarSesionResponse.paciente
```

### Pattern 1: Three-State Banner FSM
**What:** The banner component manages its own display state via local `useState`.
**When to use:** Short-lived UI states that don't need to survive re-mounts or page reload.

```typescript
// Conceptual FSM — not stored in Zustand (too ephemeral)
type BannerState = 'visible' | 'classifying' | 'classified' | 'dismissed';
```

- `visible` → user sees amber banner with "Cirugía" / "Tratamiento" / X
- `classifying` → button clicked, optimistic: immediately transition to `classified`
- `classified` → shows "✓ Clasificado como Cirugía" for ~2 seconds, then calls `dismissBanner()` in store
- `dismissed` → component returns `null`

The `classifying` state is skipped visually (instant transition to `classified`) per the decision to not block on server response.

### Pattern 2: Store Extension — Minimal Fields
**What:** Add two fields to `LiveTurnoState` / `LiveTurnoSession`.
**When to use:** Whenever banner needs to re-initialize per session.

```typescript
// In LiveTurnoSession interface:
pacienteFlujo: 'PENDIENTE' | 'CIRUGIA' | 'TRATAMIENTO' | null;

// In LiveTurnoState interface:
bannerDismissed: boolean;

// In startSession():
startSession: (session: LiveTurnoSession) => {
  set({
    session,
    bannerDismissed: false,   // reset per session
    // ... existing fields
  });
}
```

`bannerDismissed` must NOT be in `partialize` (persist config) — it should NOT survive page reloads, only live for the current session's lifetime. The flag resets via `startSession()`.

`pacienteFlujo` should be part of `LiveTurnoSession` (which IS persisted) so it survives recovery dialog scenarios.

### Pattern 3: Direct `api.patch()` in Component (no new hook file)
**What:** Call `api.patch` directly inside the banner component using local state, not via a new `useMutation` hook file.
**When to use:** One-off mutations scoped to a single component with no need for shared query invalidation.

```typescript
// Inside LiveTurnoFlujoBanner.tsx
const handleClassify = async (flujo: 'CIRUGIA' | 'TRATAMIENTO') => {
  setBannerState('classified');
  setClassifiedLabel(flujo === 'CIRUGIA' ? 'Cirugía' : 'Tratamiento');
  // Optimistic: banner already transitions — PATCH is best-effort
  api.patch(`/pacientes/${session.pacienteId}/flujo`, { flujo })
    .catch(() => { /* silent fail per decision */ });
  // After 2s, fully dismiss
  setTimeout(() => {
    store.dismissBanner();   // sets bannerDismissed: true
  }, 2000);
};
```

### Pattern 4: Mounting Location in LiveTurnoPanel
**What:** Insert banner between `<LiveTurnoTabs />` and the content `<div className="flex-1 overflow-auto">`.
**Current LiveTurnoPanel structure:**
```
<div className="flex flex-col h-full">
  <LiveTurnoHeader />
  <LiveTurnoTabs />
  {/* INSERT BANNER HERE */}
  <div className="flex-1 overflow-auto p-6">
    {tab content}
  </div>
  <LiveTurnoFooter />
</div>
```

The banner is NOT inside the scrollable area — it's sticky/fixed between tabs and content, never scrolled away.

### Anti-Patterns to Avoid
- **Persisting `bannerDismissed` in Zustand `partialize`:** The dismiss is per-session, not per-reload. If persisted, the banner would never reappear even after a true new session.
- **Blocking on PATCH response before hiding banner:** Violates the optimistic update decision — user must see instant feedback.
- **Re-fetching `pacienteFlujo` from server inside the banner:** Introduces latency, adds a query, and is unnecessary — `flujo` is captured at session start.
- **Using a toast for classification success:** CONTEXT.md explicitly chose the brief check state inside the banner itself.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Amber warning styling | Custom CSS class | Tailwind `bg-amber-50 border border-amber-300 text-amber-800` | Already used in `PatientCard.tsx` and `CRMMetricsBar.tsx` — consistent palette |
| Warning icon | Custom SVG | `AlertTriangle` from lucide-react | Already imported in `DatosPacienteTab.tsx` and `LiveTurnoSyncChecker.tsx` |
| Dismiss button | Custom button | `X` from lucide-react + plain `<button>` | Consistent with existing X usage in `AutorizacionCodigosForm.tsx` |
| Success icon | Custom SVG | `Check` from lucide-react | Already imported in `NuevoTurnoTab.tsx` and `CobrarConsultaTab.tsx` |

---

## Common Pitfalls

### Pitfall 1: Banner Reappears After Classification (Session Still Active)
**What goes wrong:** After classifying, user minimizes and restores panel — banner reappears because `bannerDismissed` was never set to true.
**Why it happens:** `bannerDismissed` is controlled by the store action but the banner component may read stale store state.
**How to avoid:** Ensure `dismissBanner()` store action sets `bannerDismissed: true` AND the banner component subscribes reactively with `useLiveTurnoStore((s) => s.bannerDismissed)`.
**Warning signs:** Banner flickers or reappears during tab switches.

### Pitfall 2: `bannerDismissed` Survives Page Reload
**What goes wrong:** User refreshes mid-session — banner never shows again, patient stays PENDIENTE forever.
**Why it happens:** `bannerDismissed` accidentally added to `partialize` in the persist config.
**How to avoid:** Exclude `bannerDismissed` from the `partialize` function — it should NOT be in the list `{ session, draftData, isMinimized, activeTab }`.

### Pitfall 3: `flujo` Not Exposed in `IniciarSesionResponse`
**What goes wrong:** TypeScript compiles but `data.paciente.flujo` is `undefined` at runtime.
**Why it happens:** The `IniciarSesionResponse` interface in `useLiveTurnoActions.ts` does not declare `flujo` in `paciente`. The backend already returns it (full `include`), but the TypeScript type doesn't expose it.
**How to avoid:** Add `flujo: 'PENDIENTE' | 'CIRUGIA' | 'TRATAMIENTO' | null` to the `paciente` field in `IniciarSesionResponse`. Map it to `pacienteFlujo` in the `sessionData` object.

### Pitfall 4: Brief Check State Timer Leaks on Unmount
**What goes wrong:** `setTimeout` fires after the component unmounts (e.g., user ends session during the 2-second window), attempting a state update on an unmounted component.
**Why it happens:** `setTimeout` callback holds a reference to component state setter.
**How to avoid:** Use `useEffect` cleanup to `clearTimeout`. Store the timeout ref with `useRef<ReturnType<typeof setTimeout>>`.

### Pitfall 5: Null `flujo` Patients See Banner
**What goes wrong:** Legacy patients (flujo === null, created before Phase 22) see the banner because the null-check is inverted.
**Why it happens:** Condition written as `if (!session.pacienteFlujo)` instead of `if (session.pacienteFlujo === 'PENDIENTE')`.
**How to avoid:** The visibility condition MUST be a strict equality check: `session.pacienteFlujo === 'PENDIENTE'`. Null (legacy) and falsy values must NOT trigger the banner.

---

## Code Examples

### Extending the Store

```typescript
// live-turno.store.ts

// In LiveTurnoSession interface — add:
pacienteFlujo: 'PENDIENTE' | 'CIRUGIA' | 'TRATAMIENTO' | null;

// In LiveTurnoState interface — add:
bannerDismissed: boolean;
dismissBanner: () => void;

// In initialState — add:
bannerDismissed: false,

// In startSession() action — add to set({...}):
bannerDismissed: false,

// New action:
dismissBanner: () => set({ bannerDismissed: true }),

// partialize — DO NOT add bannerDismissed (intentionally excluded)
```

### Extending IniciarSesionResponse and sessionData Mapping

```typescript
// useLiveTurnoActions.ts

// In IniciarSesionResponse.paciente — add:
flujo: 'PENDIENTE' | 'CIRUGIA' | 'TRATAMIENTO' | null;

// In onSuccess sessionData mapping — add:
pacienteFlujo: data.paciente.flujo ?? null,
```

### Banner Component Shell

```typescript
// LiveTurnoFlujoBanner.tsx
'use client';

import { useRef, useState } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useLiveTurnoStore } from '@/store/live-turno.store';
import { Button } from '@/components/ui/button';

type BannerPhase = 'visible' | 'classified' | 'gone';

export function LiveTurnoFlujoBanner() {
  const { session, bannerDismissed, dismissBanner } = useLiveTurnoStore();
  const [phase, setPhase] = useState<BannerPhase>('visible');
  const [classifiedAs, setClassifiedAs] = useState<string>('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Visibility gate — strict PENDIENTE check
  if (!session || session.pacienteFlujo !== 'PENDIENTE') return null;
  if (bannerDismissed || phase === 'gone') return null;

  const handleClassify = (flujo: 'CIRUGIA' | 'TRATAMIENTO') => {
    const label = flujo === 'CIRUGIA' ? 'Cirugía' : 'Tratamiento';
    setClassifiedAs(label);
    setPhase('classified');
    // Best-effort PATCH — no await, no error blocking
    api.patch(`/pacientes/${session.pacienteId}/flujo`, { flujo }).catch(() => {});
    timerRef.current = setTimeout(() => {
      dismissBanner();
      setPhase('gone');
    }, 2000);
  };

  const handleDismiss = () => {
    dismissBanner();
  };

  if (phase === 'classified') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border-b border-green-200 text-green-800 text-sm">
        <Check className="w-4 h-4 shrink-0" />
        <span>Clasificado como {classifiedAs}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 border-b border-amber-300 text-amber-800 text-sm">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span className="flex-1">Paciente sin clasificar — ¿Cirugía o Tratamiento?</span>
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-xs border-amber-400 text-amber-800 hover:bg-amber-100"
        onClick={() => handleClassify('CIRUGIA')}
      >
        Cirugía
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-xs border-amber-400 text-amber-800 hover:bg-amber-100"
        onClick={() => handleClassify('TRATAMIENTO')}
      >
        Tratamiento
      </Button>
      <button
        onClick={handleDismiss}
        className="ml-1 p-1 rounded hover:bg-amber-100"
        aria-label="Descartar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
```

### Mounting in LiveTurnoPanel

```typescript
// LiveTurnoPanel.tsx — add import and mount point

import { LiveTurnoFlujoBanner } from './LiveTurnoFlujoBanner';

// Inside JSX, between <LiveTurnoTabs /> and content div:
<LiveTurnoTabs />
<LiveTurnoFlujoBanner />   {/* ← INSERT HERE */}
<div className="flex-1 overflow-auto p-6">
```

---

## Integration Map

### Backend — No Code Changes Required
The `iniciarSesion` method returns `paciente` via `include: { obraSocial: true }` which returns ALL paciente columns including `flujo`. The `FlujoPaciente` enum is `PENDIENTE | CIRUGIA | TRATAMIENTO`. The PATCH `/pacientes/:id/flujo` endpoint exists and accepts `{ flujo: FlujoPaciente }`. **Zero backend files need modification.**

### Frontend — 3 Files Modified + 1 New File

| File | Change Type | What Changes |
|------|-------------|--------------|
| `frontend/src/store/live-turno.store.ts` | Extend | Add `pacienteFlujo` to `LiveTurnoSession`, `bannerDismissed` + `dismissBanner()` to `LiveTurnoState`; reset in `startSession()` |
| `frontend/src/hooks/useLiveTurnoActions.ts` | Extend | Add `flujo` to `IniciarSesionResponse.paciente`; map to `pacienteFlujo` in `sessionData` |
| `frontend/src/components/live-turno/LiveTurnoPanel.tsx` | Mount | Import and render `<LiveTurnoFlujoBanner />` between tabs and content |
| `frontend/src/components/live-turno/LiveTurnoFlujoBanner.tsx` | New | Full banner component (~70 lines) |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No patient classification tracking | `Paciente.flujo` column (PENDIENTE/CIRUGIA/TRATAMIENTO/null) | Phase 22 | Enables banner conditional |
| No banner in LiveTurno | `LiveTurnoFlujoBanner` amber sticky bar | Phase 24 (this) | Professional classifies inline |
| `iniciarSesion` returns flujo (already present in response body) | Frontend type doesn't declare it | Phase 24 (this) | Type gap fixed by adding `flujo` to `IniciarSesionResponse` |

---

## Open Questions

1. **Cleanup of `timerRef` on `endSession()`**
   - What we know: `endSession()` unmounts `LiveTurnoPanel` which unmounts the banner; React cleanup fires.
   - What's unclear: Does React guarantee `useEffect` cleanup runs before the setTimeout fires in the 2-second window?
   - Recommendation: Add `useEffect` cleanup that calls `clearTimeout(timerRef.current)` to be safe.

2. **Recovery scenario: user reloads during PENDIENTE session**
   - What we know: `session` is persisted (including `pacienteFlujo`), `bannerDismissed` is NOT persisted.
   - What's unclear: After recovery dialog, `startSession()` is called again — this resets `bannerDismissed: false`, so the banner will reappear. Is that the desired behavior?
   - Recommendation: Yes — a reload is a "new session" from the user's perspective, so banner reappearing is correct. No action needed.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of `live-turno.store.ts` — store interface, `startSession()`, `partialize` config
- Direct codebase inspection of `useLiveTurnoActions.ts` — `IniciarSesionResponse` interface, `sessionData` mapping
- Direct codebase inspection of `turnos.service.ts` (lines 685-703) — `iniciarSesion` uses `include: { paciente: { include: { obraSocial: true } } }`, confirming all paciente fields (including `flujo`) are returned
- Direct codebase inspection of `schema.prisma` (line 194) — `flujo FlujoPaciente? @default(PENDIENTE)` nullable field; enum values PENDIENTE/CIRUGIA/TRATAMIENTO
- Direct codebase inspection of `pacientes.controller.ts` + `pacientes.service.ts` — PATCH `:id/flujo` endpoint confirmed working
- Direct codebase inspection of `LiveTurnoPanel.tsx` — current DOM structure confirming insertion point
- Direct codebase inspection of `LiveTurnoSyncChecker.tsx` — established amber/orange warning banner pattern with `AlertTriangle`

### Secondary (MEDIUM confidence)
- Pattern inference from `PatientCard.tsx` amber classes (`bg-amber-100 text-amber-700`, `border-amber-400 text-amber-600`) — consistent amber palette across the app

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in repo, no new deps
- Architecture: HIGH — insertion point confirmed by reading actual source files; patterns confirmed by existing code
- Pitfalls: HIGH — sourced from actual code inspection (partialize config, strict null vs PENDIENTE check)
- Integration points: HIGH — backend already returns `flujo` in `iniciarSesion` response (confirmed via Prisma include)

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (stable domain — no fast-moving dependencies)
