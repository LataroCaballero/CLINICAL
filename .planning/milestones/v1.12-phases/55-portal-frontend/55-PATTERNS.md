# Phase 55: Portal Frontend - Pattern Map

**Mapped:** 2026-07-01
**Files analyzed:** 6 (5 new, 1 modified)
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| NEW `frontend/src/app/portal/[token]/page.tsx` | page (client shell) | request-response + state-machine | `frontend/src/app/presupuesto/[token]/page.tsx` | exact |
| NEW `frontend/src/lib/portal-api.ts` (portal axios client) | utility / api-client | request-response | `frontend/src/lib/api.ts` | role-match (staff JWT → portal JWT) |
| NEW `frontend/src/hooks/usePortalDatos.ts` + mutation hooks | hook | CRUD (query + mutation) | `frontend/src/hooks/useMensajesChats.ts` (query) + `frontend/src/hooks/useCreatePaciente.ts` (mutation) | exact |
| NEW health-step chip UI `frontend/src/components/portal/SaludChips.tsx` | component | transform (chip select) | `frontend/src/components/AlergiasChips.tsx` (F52 chip pattern) | exact |
| NEW contact/consulta forms (RHF + Zod) | component + schema | transform / request-response | `frontend/src/components/crm/ContactoSheet.tsx` + `frontend/src/schemas/createTurno.schema.ts` | exact |
| MODIFIED `backend/src/modules/paciente-portal/paciente-portal.controller.ts` (+`POST /consulta`) & `.service.ts` | controller + service | CRUD (create) | existing `@Patch('salud')` handler (guard + narrow DTO) + `MensajesInternosService.create()` | exact |

## Pattern Assignments

### `frontend/src/app/portal/[token]/page.tsx` (page, state-machine)

**Analog:** `frontend/src/app/presupuesto/[token]/page.tsx` — 1:1 for the public-token shell + DNI gate.

**Imports + client directive** (analog lines 1-24): `"use client"`, `useParams` from `next/navigation`, shadcn `Button/Input/Textarea/Badge/Accordion`, `lucide-react` icons. Copy verbatim; add `Tabs` if the free-navigation layout (D-07) uses tabs instead of accordion.

**State-machine type** (analog lines 47-56): a discriminated `PageState` union drives the whole render. For the portal adapt to:
```typescript
type PageState = "loading" | "dni-gate" | "blocked" | "ready" | "error";
```
Add `"blocked"` to model the F54 429 lock (D-09) — presupuesto had no lock, this is the one new state.

**Initial pre-verify effect** (analog lines 88-107): `useEffect` on `token` → `fetch(GET pre-verify)` → sets `dni-gate` / `error`. For portal call `GET /paciente-portal/public/:token` (returns 200 + `{ bloqueado }` or 404). Map 404 → `"error"`; if `bloqueado` → `"blocked"`; else `"dni-gate"`.

**DNI verify handler** (analog lines 109-136): POST verify, branch on `res.status === 401` (wrong DNI msg) and `!res.ok`. For portal, POST `/:token/verificar` returns the **portal JWT as a plain string** (`verificar(): Promise<string>`, service line 165) — store it (see portal-api client below) and transition to `"ready"`. Add a `res.status === 429` branch → human "estás bloqueado por 15 minutos" message + `"blocked"` (D-09, the F54 lock).

**DNI-gate UI block** (analog lines 234-283): full mobile-first centered card — copy structure (icon circle, `Input inputMode="numeric"`, error `<p>`, full-width `Button` with `Loader2` spinner, `onKeyDown Enter → verify`). Copy tuteo Spanish (D-12).

**Main navigable view** (analog lines 288-604): the presupuesto uses `<Accordion type="multiple">` with per-section `AccordionItem` + icon + title. Reuse this exact pattern for the 4 portal sections (Info básica / Salud / Consentimiento[placeholder] / Consultas). Note D-07 requires all 4 always accessible in any order — `Accordion type="multiple"` (analog line 308) already gives that; a "Paso X de 4" is a visual progress label only, not a lock.

**Duda/consulta sub-panel** (analog lines 433-495): the presupuesto's "Tengo una duda" panel (predefined chips + "Otra consulta..." + `Textarea` + submit) is the direct template for the F55 Consultas section (CHAT-04) and is also a mini-template for the health chip selection. Reuse `DUDAS_PREDEFINIDAS` const style (analog lines 58-64) → per-category "sugerencias comunes" (D-04). Consultas is one-way (D-02): submit → confirmation banner (analog lines 299-306), no reply rendering.

**Error/blocked/confirmation full-screen states** (analog lines 190-231): copy the `loading` spinner, `error` XCircle screen, and the green confirmation banner patterns.

---

### `frontend/src/lib/portal-api.ts` (api-client utility)

**Analog:** `frontend/src/lib/api.ts` — but the portal JWT is **separate from the staff JWT** (D per CONTEXT `<code_context>`). Do NOT reuse `api` (it reads `localStorage.accessToken` and redirects to `/login` on 401 — wrong for a public portal).

**Axios factory** (analog lines 3-6):
```typescript
export const portalApi = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });
```

**Request interceptor** — mirror analog lines 27-35 but read a portal-scoped token key (e.g. `sessionStorage.getItem("portalToken")`, keyed per-token, NOT `accessToken`):
```typescript
portalApi.interceptors.request.use((config) => {
  const t = typeof window !== "undefined" ? sessionStorage.getItem("portalToken") : null;
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});
```

**Deliberately DROP** the analog's refresh/queue/`redirectToLogin` machinery (analog lines 8-138): the portal JWT is short-lived and non-refreshable; on 401 the patient re-enters DNI at the gate, never a `/login` redirect. Keep the client minimal.

---

### `frontend/src/hooks/usePortalDatos.ts` + mutation hooks (hooks, CRUD)

**Query analog:** `frontend/src/hooks/useMensajesChats.ts` (lines 1-37) — `useQuery` + typed interface + `api.get`. For portal:
```typescript
export function usePortalDatos() {
  return useQuery<PortalDatos>({
    queryKey: ["portal-datos"],
    queryFn: async () => (await portalApi.get("/paciente-portal/public")).data,
    enabled: /* only after DNI verified */,
  });
}
```
`PortalDatos` shape comes directly from the backend `getDatos` return (service lines 121-150): `{ nombreCompleto, dni, obraSocial, proximaCirugia, contacto{...7 fields}, saludAutoReportada{4 fields} }`.

**Mutation analog:** `frontend/src/hooks/useCreatePaciente.ts` (lines 1-17) — `useMutation` + `api.post` + `invalidateQueries` on success. Create three mutations, each hitting an existing/new endpoint and invalidating `["portal-datos"]`:
- `useUpdateContacto()` → `portalApi.patch("/paciente-portal/public/datos-personales", dto)`
- `useUpdateSalud()` → `portalApi.patch("/paciente-portal/public/salud", dto)`
- `useEnviarConsulta()` → `portalApi.post("/paciente-portal/public/consulta", { mensaje })` (new endpoint, D-01)

Wire "save on leaving a section" (D-08) by calling the relevant `mutateAsync` on tab/accordion blur or an explicit "Guardar" button.

---

### `frontend/src/components/portal/SaludChips.tsx` (component, chip-transform)

**Analog:** `frontend/src/components/AlergiasChips.tsx` (F52 pattern, lines 1-101).

**Core chip pattern** (analog lines 10-47): a `PREDEFINED` const array (per-category "sugerencias comunes", D-04) merged with selected values via `Array.from(new Set([...PREDEFINED, ...selected]))` (line 30); `toggle()` add/removes; a free `Input` + `Plus` button `addCustom()` is the "otro" field (lines 84-98).

**Selectable Badge** (analog lines 66-78): shadcn `Badge variant="outline"` with `cn()` active/inactive classes and `onClick={toggle}`. `framer-motion` animation is optional (already used in analog lines 54-81).

**Data-shape adaptation (important):** the analog serializes to a comma-joined **string** (`onChange(newList.join(", "))`, line 37). The portal `PATCH /salud` DTO (`update-salud-staged.dto.ts` lines 12-30) expects **`string[]`** for `alergiasAutoReportadas` / `medicacionAutoReportada`, an **object** for `antecedentesAutoReportados`, and a **string** for `tratamientosPreviosAutoReportados`. So keep the chip UI but emit arrays (skip the `.join(", ")` step) to match the DTO. Pre-fill each category from `saludAutoReportada` (D-05).

**Categories (D-04):** condiciones/enfermedades → `antecedentesAutoReportados`; alergias → `alergiasAutoReportadas`; medicación → `medicacionAutoReportada`; tratamientos previos → `tratamientosPreviosAutoReportados`.

---

### Contact + Consulta forms (RHF + Zod)

**Schema analog:** `frontend/src/schemas/createTurno.schema.ts` (lines 1-10) — `z.object({...})` + `z.infer` type export. Create a `portalContacto.schema.ts` (email `z.string().email()`, telefono validation per D "Claude's Discretion", emergencia nombre/telefono/relacion → maps to `UpdateContactoPortalDto` fields, `update-contacto-portal.dto.ts` lines 12-40).

**Form wiring analog:** `frontend/src/components/crm/ContactoSheet.tsx` (lines 93-121):
```typescript
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
const { control, register, handleSubmit, reset } = useForm<FormValues>({
  resolver: zodResolver(schema),
  defaultValues: { /* pre-fill from usePortalDatos().contacto */ },
});
const onSubmit = async (values) => {
  try { await mutation.mutateAsync(values); toast.success("Guardado"); }
  catch { toast.error("Error al guardar"); }
};
// <form onSubmit={handleSubmit(onSubmit)}>
```
Copy the `try/mutateAsync/toast` structure (analog lines 104-121) for each section save.

---

### `paciente-portal.controller.ts` + `.service.ts` — NEW `POST /consulta` (D-01)

**Guard + narrow-DTO analog:** the existing `@Patch('salud')` handler (controller lines 98-106). Copy exactly:
```typescript
@UseGuards(PortalJwtGuard)
@Post('consulta')
enviarConsulta(
  @Req() req: PortalRequest,
  @Body(new ValidationPipe({ whitelist: true })) dto: CreateConsultaPortalDto,
) {
  return this.service.crearConsulta(req.user.pacienteId, dto);
}
```
- `PortalJwtGuard` per-route, NEVER class-level (guard file lines 10-11; controller doc lines 24-38).
- `pacienteId` from `req.user` (controller line 20 `PortalRequest` type), NEVER from body (D-03, pitfall 12).
- Explicit per-route `new ValidationPipe({ whitelist: true })` — load-bearing, there is NO global pipe (controller lines 77-81).

**New DTO** `dto/create-consulta-portal.dto.ts` — mirror `create-mensaje.dto.ts` but narrow (D-03: only the text, no `pacienteId`):
```typescript
import { IsString, MaxLength, MinLength } from 'class-validator';
export class CreateConsultaPortalDto {
  @IsString() @MinLength(1) @MaxLength(2000)
  mensaje: string;
}
```

**Service create analog:** `MensajesInternosService.create()` (mensajes-internos.service.ts lines 145-184). New `crearConsulta(pacienteId, dto)`:
1. Look up `paciente.profesionalId` (the chat destination is derived from the patient, D-01/D-03) — `findChats` filters by `profesionalId` (service lines 24-31), confirming it's the routing key.
2. `prisma.mensajeInterno.create({ data: { mensaje: dto.mensaje, pacienteId, origenPaciente: true, autorId: null } })` — set `origenPaciente = true` (schema.prisma line 244) and `autorId: null` (schema line 242 is nullable; the author is the patient, not a `Usuario`). `prioridad` defaults to `MEDIA` (schema line 240).
3. Do NOT create a `mensajeLectura` for the author (the analog lines 176-181 self-mark is staff-only; a patient has no `usuarioId`).

Register the service in `PacientePortalService` (already wired with `PrismaService`); no new module wiring needed beyond the DTO import.

---

## Shared Patterns

### Portal JWT handling (patient-side, separate from staff)
**Source:** `frontend/src/lib/api.ts` (structure) + `backend/.../guards/portal-jwt.guard.ts`
**Apply to:** portal-api client + every portal hook.
Portal token lives outside the staff `localStorage.accessToken`; the `PortalJwtGuard` wraps the named `'portal-jwt'` passport strategy (guard lines 10-11), so a staff JWT is rejected and vice-versa. Never redirect to `/login` on a portal 401 — re-gate on DNI.

### Narrow-DTO + explicit ValidationPipe (SC#3 protection)
**Source:** `paciente-portal.controller.ts` lines 82-106; DTOs `update-contacto-portal.dto.ts`, `update-salud-staged.dto.ts`
**Apply to:** the new `POST /consulta` handler.
Every write route repeats `@Body(new ValidationPipe({ whitelist: true }))` because there is NO global pipe. Prohibited fields are silently stripped (200), never rejected. Keep `POST /consulta`'s DTO to the single `mensaje` field.

### shadcn/Tailwind mobile-first design system (D-12)
**Source:** `frontend/src/app/presupuesto/[token]/page.tsx` (whole file)
**Apply to:** every portal component.
Reuse `Button/Input/Textarea/Badge/Accordion/Tabs` from `@/components/ui/*`, `lucide-react` icons, tuteo Spanish copy, `text-sm`/`text-base` (≥16px, SC#1), centered `max-w-sm`/`max-w-lg` mobile containers. No `/gsd:ui-phase`.

### RHF + Zod client validation
**Source:** `frontend/src/schemas/createTurno.schema.ts` + `frontend/src/components/crm/ContactoSheet.tsx` lines 93-121
**Apply to:** contact form + consulta form. `zodResolver(schema)` + `handleSubmit` + `mutateAsync` + `toast` success/error.

### Chip + suggestions + "otro" (F52)
**Source:** `frontend/src/components/AlergiasChips.tsx`
**Apply to:** all 4 health categories. Same UI, but emit `string[]`/object per the `UpdateSaludStagedDto` shape, not a joined string.

## No Analog Found

None. Every target file has a strong in-repo analog.

## Metadata

**Analog search scope:** `frontend/src/app/presupuesto/`, `frontend/src/lib/`, `frontend/src/hooks/`, `frontend/src/components/`, `frontend/src/schemas/`, `backend/src/modules/paciente-portal/`, `backend/src/modules/mensajes-internos/`, `backend/src/prisma/schema.prisma`
**Files scanned:** ~14 read in full/targeted
**Pattern extraction date:** 2026-07-01
