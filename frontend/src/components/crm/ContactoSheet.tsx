"use client";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Phone, MessageSquare, MapPin } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateContacto } from "@/hooks/useCreateContacto";

// Tipos de interacción con íconos y labels
const TIPO_OPTIONS = [
  { value: "LLAMADA", label: "Llamada", icon: Phone },
  { value: "MENSAJE", label: "Mensaje", icon: MessageSquare },
  { value: "PRESENCIAL", label: "Presencial", icon: MapPin },
] as const;

// Etapas CRM disponibles — valores del enum EtapaCRM del schema Prisma
const ETAPAS_CRM = [
  { value: "NUEVO_LEAD", label: "Nuevo Lead" },
  { value: "TURNO_AGENDADO", label: "Turno Agendado" },
  { value: "CONSULTADO", label: "Consultado" },
  { value: "PRESUPUESTO_ENVIADO", label: "Presupuesto Enviado" },
  { value: "PROCEDIMIENTO_REALIZADO", label: "Procedimiento Realizado" },
  { value: "CONFIRMADO", label: "Confirmado" },
  { value: "PERDIDO", label: "Perdido" },
];

const TEMPERATURAS = [
  { value: "CALIENTE", label: "Caliente", color: "text-red-500" },
  { value: "TIBIO", label: "Tibio", color: "text-amber-500" },
  { value: "FRIO", label: "Frío", color: "text-blue-400" },
];

// Intervalos predefinidos para próxima acción
const PRESETS = [
  { label: "2 días", getValue: () => addDays(new Date(), 2) },
  { label: "1 semana", getValue: () => addWeeks(new Date(), 1) },
  { label: "2 semanas", getValue: () => addWeeks(new Date(), 2) },
  { label: "1 mes", getValue: () => addMonths(new Date(), 1) },
];

const schema = z.object({
  tipo: z.enum(["LLAMADA", "MENSAJE", "PRESENCIAL"]),
  nota: z.string().optional(),
  fecha: z.string().optional(),
  etapaCRM: z.string().optional(),
  temperatura: z.string().optional(),
  proximaAccionFecha: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ContactoSheetProps {
  pacienteId: string;
  pacienteNombre: string;
  trigger: React.ReactNode;
  onSuccess?: () => void;
  // Cuando se abre desde el drawer del paciente, usar modal={false} para evitar conflicto de portales
  modalMode?: boolean;
}

export function ContactoSheet({
  pacienteId,
  pacienteNombre,
  trigger,
  onSuccess,
  modalMode = true,
}: ContactoSheetProps) {
  const [open, setOpen] = useState(false);
  const [proximaMode, setProximaMode] = useState<"preset" | "exact">("preset");
  const mutation = useCreateContacto(pacienteId);

  const { control, register, handleSubmit, setValue, reset, watch } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        tipo: "LLAMADA",
        fecha: new Date().toISOString(),
      },
    });

  const proximaAccionFecha = watch("proximaAccionFecha");

  const onSubmit = async (values: FormValues) => {
    try {
      await mutation.mutateAsync({
        tipo: values.tipo,
        nota: values.nota,
        fecha: values.fecha,
        etapaCRM: values.etapaCRM || undefined,
        temperatura: values.temperatura || undefined,
        proximaAccionFecha: values.proximaAccionFecha || undefined,
      });
      toast.success("Contacto registrado");
      reset();
      setOpen(false);
      onSuccess?.();
    } catch {
      toast.error("Error al registrar el contacto");
    }
  };

  return (
    <>
      <div onClick={() => setOpen(true)}>{trigger}</div>
      <Sheet open={open} onOpenChange={setOpen} modal={modalMode}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Registrar contacto</SheetTitle>
            <p className="text-sm text-muted-foreground">{pacienteNombre}</p>
          </SheetHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-4 px-4">
            {/* Tipo de interacción */}
            <div>
              <Label>Tipo de interacción</Label>
              <Controller
                control={control}
                name="tipo"
                render={({ field }) => (
                  <div className="flex gap-2 mt-2">
                    {TIPO_OPTIONS.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => field.onChange(value)}
                        className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border text-sm transition-colors ${
                          field.value === value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            {/* Nota libre */}
            <div>
              <Label htmlFor="nota">Nota</Label>
              <Textarea
                id="nota"
                {...register("nota")}
                placeholder="¿De qué hablaron? ¿Cuál fue el resultado?"
                className="mt-1 resize-none"
                rows={3}
              />
            </div>

            {/* Etapa CRM */}
            <div>
              <Label>Etapa CRM (opcional)</Label>
              <Controller
                control={control}
                name="etapaCRM"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sin cambio" />
                    </SelectTrigger>
                    <SelectContent>
                      {ETAPAS_CRM.map((e) => (
                        <SelectItem key={e.value} value={e.value}>
                          {e.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Temperatura */}
            <div>
              <Label>Temperatura (opcional)</Label>
              <Controller
                control={control}
                name="temperatura"
                render={({ field }) => (
                  <div className="flex gap-2 mt-2">
                    {TEMPERATURAS.map(({ value, label, color }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => field.onChange(value)}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          field.value === value
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-muted"
                        } ${color}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            {/* Próxima acción */}
            <div>
              <Label>Próxima acción (opcional)</Label>
              <div className="flex gap-2 mt-2 mb-2">
                <button
                  type="button"
                  onClick={() => setProximaMode("preset")}
                  className={`text-sm px-3 py-1 rounded border transition-colors ${
                    proximaMode === "preset"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border"
                  }`}
                >
                  Intervalo
                </button>
                <button
                  type="button"
                  onClick={() => setProximaMode("exact")}
                  className={`text-sm px-3 py-1 rounded border transition-colors ${
                    proximaMode === "exact"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border"
                  }`}
                >
                  Fecha exacta
                </button>
              </div>

              {proximaMode === "preset" ? (
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map(({ label, getValue }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() =>
                        setValue("proximaAccionFecha", getValue().toISOString())
                      }
                      className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                        proximaAccionFecha
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : (
                <Calendar
                  mode="single"
                  locale={es}
                  selected={
                    proximaAccionFecha ? new Date(proximaAccionFecha) : undefined
                  }
                  onSelect={(date) => {
                    if (date) setValue("proximaAccionFecha", date.toISOString());
                  }}
                  disabled={(date) => date < new Date()}
                  className="rounded border"
                />
              )}

              {proximaAccionFecha && (
                <p className="text-xs text-muted-foreground mt-1">
                  Seguimiento:{" "}
                  {format(new Date(proximaAccionFecha), "d 'de' MMMM", {
                    locale: es,
                  })}
                  <button
                    type="button"
                    onClick={() => setValue("proximaAccionFecha", undefined)}
                    className="ml-2 text-destructive underline"
                  >
                    Quitar
                  </button>
                </p>
              )}
            </div>

            <SheetFooter className="pt-2">
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="w-full"
              >
                {mutation.isPending ? "Guardando..." : "Guardar contacto"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
