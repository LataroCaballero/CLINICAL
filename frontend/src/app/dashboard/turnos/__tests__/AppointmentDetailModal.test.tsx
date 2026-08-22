import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import AppointmentDetailModal from "../AppointmentDetailModal";
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
