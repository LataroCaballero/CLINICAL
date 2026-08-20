"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUIStore } from "@/lib/stores/useUIStore";
import { useCreatePaciente } from "@/hooks/useCreatePaciente";
import { cn } from "@/lib/utils";

export type PacienteCreado = {
  id: string;
  nombreCompleto: string;
  fotoUrl?: string | null;
  [key: string]: unknown;
};

type Props = {
  /** El texto crudo tipeado en el autosuggest. Se lee una sola vez, al montar. */
  query: string;
  profesionalId?: string | null;
  onCreated: (paciente: PacienteCreado) => void;
  onCancel: () => void;
  /**
   * gap #2 de 68-VERIFICATION.md / D-13: reporta el `isPending` del alta al
   * padre (AutocompletePaciente) para que sepa que hay un POST en vuelo y no
   * lo descarte con Escape mientras está corriendo.
   */
  onPendingChange?: (pending: boolean) => void;
};

/** El repo no tiene códigos de error estructurados (Phase 67, D-10). */
type ApiError = {
  response?: { status?: number; data?: { message?: string } };
  message?: string;
};

const schema = z.object({
  nombreCompleto: z.string().min(3, "Mínimo 3 caracteres"),
  dni: z.string().min(7, "Mínimo 7 dígitos"),
  telefono: z
    .string()
    .optional()
    .refine((v) => !v || v.trim() === "" || v.trim().length >= 6, {
      message: "Teléfono inválido",
    }),
});

type FormValues = z.infer<typeof schema>;

function stripSeparators(q: string): string {
  return q.replace(/[\s.-]/g, "");
}

function capitalizarNombre(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase())
    .join(" ");
}

/** D-09: query todo dígitos (sin espacios/puntos/guiones) precarga DNI; cualquier otro caso precarga Nombre. */
export function buildPrefill(query: string): { nombreCompleto: string; dni: string } {
  const stripped = stripSeparators(query);
  if (stripped.length > 0 && /^\d+$/.test(stripped)) {
    return { dni: stripped, nombreCompleto: "" };
  }
  return { dni: "", nombreCompleto: capitalizarNombre(query.trim()) };
}

export default function InlineCreatePaciente({
  query,
  profesionalId,
  onCreated,
  onCancel,
  onPendingChange,
}: Props) {
  const { focusModeEnabled: fm } = useUIStore();
  const { mutateAsync, isPending } = useCreatePaciente();
  const [prefill] = useState(() => buildPrefill(query));
  const nombreRef = useRef<HTMLInputElement | null>(null);
  const dniRef = useRef<HTMLInputElement | null>(null);
  /**
   * WR-02 de 68-REVIEW.md / truth #13 de 68-VERIFICATION.md: candado
   * síncrono contra el doble submit. `isPending` (useState) no alcanza
   * porque `handleSubmit` de RHF hace `await resolver(...)` (zod) antes de
   * invocar `onSubmit`, así que dos eventos del mismo tick leen ambos
   * `isPending === false`. Un ref se escribe y se lee de forma síncrona: el
   * segundo evento ya lo ve en `true`.
   */
  const submittingRef = useRef(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombreCompleto: prefill.nombreCompleto,
      dni: prefill.dni,
      telefono: "",
    },
  });

  // Foco al montar (D-04): primer campo vacío en el orden Nombre -> DNI.
  useEffect(() => {
    if (prefill.nombreCompleto) {
      setTimeout(() => dniRef.current?.focus(), 50);
    } else {
      setTimeout(() => nombreRef.current?.focus(), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // gap #2 / D-13: reporta el isPending del alta al padre. La cleanup fuerza
  // false al desmontar para que el padre nunca quede con `true` colgado
  // (si no, Escape quedaría bloqueado para siempre tras el desmontaje).
  useEffect(() => {
    onPendingChange?.(isPending);
    return () => {
      onPendingChange?.(false);
    };
  }, [isPending, onPendingChange]);

  const fieldClassName = cn(
    fm &&
      "bg-[var(--fc-bg-surface)] border-[var(--fc-border)] text-[var(--fc-text-primary)] placeholder:text-slate-500"
  );

  async function onSubmit(data: FormValues) {
    if (submittingRef.current) return;
    submittingRef.current = true;

    const payload = {
      nombreCompleto: data.nombreCompleto.trim(),
      dni: data.dni,
      telefono: data.telefono?.trim() ?? "",
      profesionalId: profesionalId ?? undefined,
      estado: "ACTIVO",
      consentimientoFirmado: false,
      indicacionesEnviadas: false,
    };

    // gap #2 de 68-VERIFICATION.md: los callbacks de nivel mutate() viven en
    // el MutationObserver de TanStack Query v5 y no disparan tras el
    // desmontaje. La continuación de un await es un closure de JS, no está
    // atada al ciclo de vida de React, así que corre igual y el paciente
    // creado nunca se pierde en silencio (D-07 / ALTA-04).
    try {
      const creado = (await mutateAsync(payload)) as PacienteCreado;
      toast.success(`${creado.nombreCompleto} creado correctamente`);
      onCreated(creado);
    } catch (err) {
      const error = err as ApiError;
      const status = error?.response?.status;
      const message = error?.response?.data?.message || error?.message;

      if (status === 409 || message?.includes("DNI")) {
        setError("dni", { message: "Este DNI ya está registrado" });
        return;
      }
      toast.error(message || "Error al crear el paciente");
    } finally {
      submittingRef.current = false;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Enter") return;
    // gap #1 de 68-VERIFICATION.md / CR-02 de 68-REVIEW.md: la activación de
    // un <button> con Enter es la acción por defecto del keydown. Un
    // preventDefault() indiscriminado la cancelaba y caía igual al submit —
    // la tecla de descarte (Cancelar) terminaba creando el paciente. Si el
    // foco está sobre un botón, salir temprano y dejar que su activación
    // nativa dispare su propio onClick.
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    e.preventDefault();
    e.stopPropagation();
    // WR-02: bloquear Enter repetido/sostenido mientras el alta está en
    // vuelo, en paridad con el disabled={isPending} de ambos botones.
    if (isPending || submittingRef.current) return;
    void handleSubmit(onSubmit)();
  }

  return (
    <div className="p-3 grid gap-3" onKeyDown={handleKeyDown}>
      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-muted-foreground">
          Nombre completo <span className="text-destructive">*</span>
        </label>
        <Input
          {...register("nombreCompleto")}
          ref={(el) => {
            register("nombreCompleto").ref(el);
            nombreRef.current = el;
          }}
          placeholder="Juan Pérez"
          className={fieldClassName}
        />
        {errors.nombreCompleto && (
          <Alert variant="destructive" className="py-2">
            <AlertDescription>{errors.nombreCompleto.message}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-muted-foreground">
          DNI <span className="text-destructive">*</span>
        </label>
        <Input
          value={watch("dni")}
          onChange={(e) =>
            setValue("dni", e.target.value.replace(/\D/g, ""), { shouldValidate: false })
          }
          ref={dniRef}
          placeholder="40111222"
          inputMode="numeric"
          className={fieldClassName}
        />
        {errors.dni && (
          <Alert variant="destructive" className="py-2">
            <AlertDescription>{errors.dni.message}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-muted-foreground">
          Teléfono <span className="text-muted-foreground/60 font-normal">(opcional)</span>
        </label>
        {/* Input plano, sin el selector de país con Popover propio: anidarlo acá metería Popover dentro de Popover dentro de Dialog. */}
        <Input
          {...register("telefono")}
          placeholder="11 2233 4455"
          inputMode="tel"
          className={fieldClassName}
        />
        {errors.telefono && (
          <Alert variant="destructive" className="py-2">
            <AlertDescription>{errors.telefono.message}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="button" onClick={handleSubmit(onSubmit)} disabled={isPending}>
          {isPending ? "Creando..." : "Crear paciente"}
        </Button>
      </div>
    </div>
  );
}
