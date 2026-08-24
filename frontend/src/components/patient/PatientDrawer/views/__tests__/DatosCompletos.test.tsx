import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import DatosCompletos from "../DatosCompletos";
import { api } from "@/lib/api";

// El componente dispara dos llamadas de red al montar: el PATCH de guardado
// (controlado por test) y el GET de useObrasSociales (sin relación con lo
// que este archivo prueba). Ambas se mockean para no depender de la red.
vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

// El toast de sonner no requiere un <Toaster/> montado para no tirar, pero
// lo mockeamos igual para que los tests no dependan de su implementación.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function buildPaciente(overrides: Record<string, unknown> = {}) {
  return {
    id: "paciente-1",
    dni: "12345678",
    nombreCompleto: "Juana Perez",
    fechaNacimiento: null,
    direccion: null,
    telefono: null,
    telefonoAlternativo: null,
    email: null,
    contactoEmergenciaNombre: "",
    contactoEmergenciaRelacion: "",
    contactoEmergenciaTelefono: "",
    obraSocialId: null,
    plan: null,
    alergias: [],
    condiciones: [],
    diagnostico: null,
    tratamiento: null,
    deriva: null,
    lugarIntervencion: null,
    objetivos: null,
    estado: "ACTIVO",
    consentimientoFirmado: false,
    consentimientoFirmadoAt: null,
    indicacionesEnviadas: false,
    fechaIndicaciones: null,
    cuentaCorriente: null,
    presupuestos: [],
    VentaProducto: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderComponent(paciente: ReturnType<typeof buildPaciente>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

  render(
    <QueryClientProvider client={queryClient}>
      <DatosCompletos paciente={paciente} onBack={() => {}} />
    </QueryClientProvider>
  );

  return { queryClient, invalidateQueriesSpy };
}

// Abre la sección "Datos de contacto", escribe el teléfono dado en el primer
// campo de texto (Teléfono) y hace click en Guardar. Localiza los controles
// por rol accesible, acotados a la sección con `within` — el lápiz/check/X
// son ícono-only sin aria-label, así que la sección es la única forma de
// distinguir "el botón de esta sección" de los de las otras 6.
async function editarYGuardarTelefono(telefono: string) {
  const user = userEvent.setup();
  const heading = screen.getByText("Datos de contacto");
  const section = heading.closest("section");
  if (!section) throw new Error("No se encontró la sección de Contacto");
  const scope = within(section as HTMLElement);

  // Antes de editar sólo hay un botón en la sección (el lápiz).
  await user.click(scope.getByRole("button"));

  const telefonoInput = scope.getAllByRole("textbox")[0];
  await user.clear(telefonoInput);
  if (telefono) {
    await user.type(telefonoInput, telefono);
  }

  // En edición hay 2 botones: Guardar (Check) primero, Cancelar (X) segundo,
  // en ese orden en el JSX de Section.tsx.
  const [saveButton] = scope.getAllByRole("button");
  await user.click(saveButton);
}

describe("DatosCompletos — invalidación de la query del paciente tras guardar (CR-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
  });

  it("PATCH exitoso invalida ['paciente', id] (prefijo de 2 elementos)", async () => {
    (api.patch as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });

    const paciente = buildPaciente({ telefono: null });
    const { invalidateQueriesSpy } = renderComponent(paciente);

    await editarYGuardarTelefono("1122334455");

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalled();
    });

    const call = invalidateQueriesSpy.mock.calls.find(
      (args) => (args[0] as { queryKey?: unknown[] })?.queryKey?.[0] === "paciente"
    );
    expect(call).toBeTruthy();
    const queryKey = (call?.[0] as { queryKey: unknown[] }).queryKey;
    expect(queryKey[0]).toBe("paciente");
    expect(queryKey[1]).toBe(paciente.id);
    // Prefijo de 2 elementos: si alguien lo "corrige" a la clave completa de
    // usePaciente (3 elementos, con effectiveProfessionalId), este assert
    // tiene que cazarlo.
    expect(queryKey.length).toBe(2);
  });

  it("PATCH fallido NO invalida (la invalidación quedó dentro del try, no en finally)", async () => {
    (api.patch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network error"));

    const paciente = buildPaciente({ telefono: null });
    const { invalidateQueriesSpy } = renderComponent(paciente);

    await editarYGuardarTelefono("1122334455");

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalled();
    });

    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });

  it("validación fallida (teléfono < 6 caracteres) NO llama a api.patch ni invalida", async () => {
    const paciente = buildPaciente({ telefono: null });
    const { invalidateQueriesSpy } = renderComponent(paciente);

    await editarYGuardarTelefono("123");

    expect(api.patch).not.toHaveBeenCalled();
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });
});
