import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import AppointmentDetailModal from "../AppointmentDetailModal";
import CalendarGrid from "../CalendarGrid";
import { MOTIVO_SIN_TELEFONO } from "@/lib/telefono";

// jsdom no implementa ResizeObserver; el Popper de Radix (usado por
// TooltipContent) lo requiere para posicionarse al abrir en hover.
class ResizeObserverStub implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverStub;
}

// El modal (via SendWAMessageModal) dispara GET /whatsapp/templates al montar.
// Sin este mock el test dependería de la red / del backend real.
vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

function buildEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "turno-1",
    title: "Consulta – Juana Perez",
    paciente: "Juana Perez",
    pacienteId: "paciente-1",
    whatsappOptIn: true,
    telefono: "+541122334455",
    start: new Date("2026-01-15T10:00:00"),
    end: new Date("2026-01-15T10:30:00"),
    tipo: "Consulta",
    estado: "PENDIENTE" as const,
    observaciones: "",
    ...overrides,
  };
}

function renderModal(event: ReturnType<typeof buildEvent> | null) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AppointmentDetailModal open onOpenChange={() => {}} event={event} />
    </QueryClientProvider>
  );
}

// ── CR-01 (D-11/D-13/D-15/D-17): el atajo de WhatsApp EXISTE en el DOM ──────
describe("AppointmentDetailModal — atajo de WhatsApp del detalle de turno (CR-01)", () => {
  it("paciente CON teléfono y CON opt-in: el botón está en el documento y habilitado", () => {
    renderModal(buildEvent());

    const boton = screen.getByRole("button", { name: /whatsapp/i });
    expect(boton).toBeInTheDocument();
    expect(boton).not.toBeDisabled();
  });

  it("paciente SIN teléfono: el botón está en el documento, deshabilitado, y el motivo de MOTIVO_SIN_TELEFONO es alcanzable en hover", async () => {
    renderModal(buildEvent({ telefono: null }));

    const boton = screen.getByRole("button", { name: /whatsapp/i });
    expect(boton).toBeInTheDocument();
    expect(boton).toBeDisabled();

    const trigger = boton.closest('[data-slot="tooltip-trigger"]') ?? boton;
    await userEvent.hover(trigger);

    await waitFor(() => {
      expect(screen.getAllByText(MOTIVO_SIN_TELEFONO).length).toBeGreaterThan(0);
    });
  });

  it("pacienteId ausente (estado PRE-fix): el botón NO está en el documento", () => {
    renderModal(buildEvent({ pacienteId: undefined }));

    expect(
      screen.queryByRole("button", { name: /whatsapp/i })
    ).not.toBeInTheDocument();
  });
});

// ── Task 4: efecto colateral declarado (ampliación de alcance de Task 1) ───
// esSobreturno pasó a viajar desde el backend (Task 1) y del mapeo (Task 2),
// lo que hace que CalendarGrid vuelva a dibujar el borde punteado naranja de
// los sobreturnos. Ese cambio de UI no estaba en los gaps del
// 69-VERIFICATION.md y no puede quedar sin verificar (D-17 aplica el mismo
// estándar: código presente != comportamiento correcto).
function buildCalendarEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "turno-cg-1",
    title: "Consulta",
    paciente: "Paciente CalendarGrid",
    start: new Date("2026-01-15T10:00:00"),
    end: new Date("2026-01-15T10:30:00"),
    tipo: "Consulta",
    tipoTurnoId: "tipo-1",
    estado: "PENDIENTE" as const,
    esSobreturno: false,
    ...overrides,
  };
}

describe("CalendarGrid — borde punteado de sobreturnos (ampliación de alcance de Task 1)", () => {
  it("evento con esSobreturno=true lleva el borde punteado naranja; uno con esSobreturno=false no", () => {
    const conSobreturno = buildCalendarEvent({
      id: "turno-sobreturno",
      paciente: "Con Sobreturno",
      esSobreturno: true,
      start: new Date("2026-01-15T10:00:00"),
      end: new Date("2026-01-15T10:30:00"),
    });
    const sinSobreturno = buildCalendarEvent({
      id: "turno-normal",
      paciente: "Sin Sobreturno",
      esSobreturno: false,
      start: new Date("2026-01-15T12:00:00"),
      end: new Date("2026-01-15T12:30:00"),
    });

    const { container } = render(
      <CalendarGrid
        view="day"
        date={new Date("2026-01-15T00:00:00")}
        events={[conSobreturno, sinSobreturno]}
        agenda={null}
        timeRange={{ min: new Date("2026-01-15T08:00:00"), max: new Date("2026-01-15T18:00:00") }}
        onSelectEvent={() => {}}
        onSelectSlot={() => {}}
        onEventMove={() => {}}
        onEventResize={() => {}}
      />
    );

    const eventEls = Array.from(container.querySelectorAll("[data-event]"));
    expect(eventEls.length).toBe(2);

    const stEl = eventEls.find((el) => el.textContent?.includes("Con Sobreturno"));
    const normalEl = eventEls.find((el) => el.textContent?.includes("Sin Sobreturno"));
    expect(stEl).toBeTruthy();
    expect(normalEl).toBeTruthy();

    expect(stEl!.className).toMatch(/border-dashed/);
    expect(stEl!.className).toMatch(/border-orange-400/);
    expect(normalEl!.className).not.toMatch(/border-dashed/);
  });
});
