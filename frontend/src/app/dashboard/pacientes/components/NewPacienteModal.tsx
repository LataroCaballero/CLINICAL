"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useCreatePaciente } from "@/hooks/useCreatePaciente";
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";
import { useObrasSociales } from "@/hooks/useObrasSociales";
import { PlanCombobox } from "@/components/PlanCombobox";
import { PhoneInput } from "@/components/PhoneInput";
import { EmailInput } from "@/components/EmailInput";
import { toast } from "sonner";

const schema = z.object({
  dni: z.string().min(7, "Mínimo 7 dígitos"),
  nombreCompleto: z.string().min(3, "Mínimo 3 caracteres"),
  telefono: z.string().min(6, "Teléfono inválido"),
  email: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()),
      { message: "Email inválido" }
    ),
  obraSocialId: z.string().optional(),
  plan: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewPacienteModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const profesionalId = useEffectiveProfessionalId();
  const { mutate, isPending } = useCreatePaciente();
  const { data: obrasSociales = [] } = useObrasSociales();
  const nombreRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { dni: "", nombreCompleto: "", telefono: "", email: "", obraSocialId: "", plan: "" },
  });

  const obraSocialId = watch("obraSocialId");
  const planesDisponibles = (obrasSociales as any[]).find((o) => o.id === obraSocialId)?.planes ?? [];

  // Focus DNI al abrir
  useEffect(() => {
    if (open) {
      setTimeout(() => nombreRef.current?.focus(), 50);
    }
  }, [open]);

  function onSubmit(data: FormValues) {
    const payload = {
      dni: data.dni.trim(),
      nombreCompleto: data.nombreCompleto.trim(),
      telefono: data.telefono.trim(),
      email: data.email?.trim() || undefined,
      obraSocialId: data.obraSocialId || undefined,
      plan: data.plan || undefined,
      profesionalId: profesionalId ?? undefined,
      estado: "ACTIVO",
      consentimientoFirmado: false,
      indicacionesEnviadas: false,
    };

    mutate(payload, {
      onSuccess: () => {
        toast.success(`${data.nombreCompleto} creado correctamente`);
        reset();
        // Focus de vuelta al primer campo para cargar otro inmediatamente
        setTimeout(() => nombreRef.current?.focus(), 50);
      },
      onError: (error: any) => {
        const status = error?.response?.status;
        const message = error?.response?.data?.message || error?.message;

        if (status === 409 || message?.includes("DNI")) {
          setError("dni", { message: "Este DNI ya está registrado" });
          return;
        }
        toast.error(message || "Error al crear el paciente");
      },
    });
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nuevo paciente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Nombre */}
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              Nombre completo <span className="text-destructive">*</span>
            </label>
            <Input
              {...register("nombreCompleto")}
              ref={(el) => {
                register("nombreCompleto").ref(el);
                (nombreRef as any).current = el;
              }}
              placeholder="Juan Pérez"
            />
            {errors.nombreCompleto && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription>{errors.nombreCompleto.message}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* DNI */}
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              DNI <span className="text-destructive">*</span>
            </label>
            <Input
              {...register("dni")}
              placeholder="40111222"
              inputMode="numeric"
            />
            {errors.dni && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription>{errors.dni.message}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Teléfono */}
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              Teléfono <span className="text-destructive">*</span>
            </label>
            <PhoneInput
              value={watch("telefono") || ""}
              onChange={(v: string) => setValue("telefono", v)}
            />
            {errors.telefono && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription>{errors.telefono.message}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Email */}
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              Email <span className="text-muted-foreground/60 font-normal">(opcional)</span>
            </label>
            <EmailInput
              value={watch("email") || ""}
              onChange={(v: string) => setValue("email", v)}
            />
            {errors.email && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription>{errors.email.message}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Obra Social */}
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              Obra social <span className="text-muted-foreground/60 font-normal">(opcional)</span>
            </label>
            <Select
              value={obraSocialId || ""}
              onValueChange={(v) => {
                setValue("obraSocialId", v);
                setValue("plan", "");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar obra social" />
              </SelectTrigger>
              <SelectContent>
                {(obrasSociales as any[]).map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Plan — solo si hay obra social seleccionada */}
          {obraSocialId && planesDisponibles.length > 0 && (
            <div className="grid gap-1.5 animate-in fade-in slide-in-from-top-1">
              <label className="text-sm font-medium text-muted-foreground">Plan</label>
              <PlanCombobox
                planes={planesDisponibles}
                obraSocialId={obraSocialId}
                value={watch("plan")}
                onChange={(val: string) => setValue("plan", val)}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cerrar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creando..." : "Crear paciente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
