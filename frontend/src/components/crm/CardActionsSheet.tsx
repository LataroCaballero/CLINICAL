"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Phone, MessageCircle, Users, Calendar, FileText, Loader2, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useCreateContacto } from "@/hooks/useCreateContacto";
import { useUpdateListaEspera } from "@/hooks/useUpdateListaEspera";
import { toast } from "sonner";
import { KanbanPatient } from "@/hooks/useCRMKanban";

type TipoContacto = "LLAMADA" | "MENSAJE" | "PRESENCIAL";

const TIPO_OPTIONS: { value: TipoContacto; label: string; icon: React.ReactNode }[] = [
  { value: "LLAMADA", label: "Llamada", icon: <Phone className="h-4 w-4" /> },
  { value: "MENSAJE", label: "Mensaje", icon: <MessageCircle className="h-4 w-4" /> },
  { value: "PRESENCIAL", label: "Presencial", icon: <Users className="h-4 w-4" /> },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  patient: KanbanPatient | null;
  onOpenDrawer: (pacienteId: string) => void;
  onOpenNuevoTurno: (pacienteId: string) => void;
  onOpenPresupuestos: (pacienteId: string) => void;
}

export function CardActionsSheet({
  open,
  onOpenChange,
  patient,
  onOpenDrawer,
  onOpenNuevoTurno,
  onOpenPresupuestos,
}: Props) {
  const [tipo, setTipo] = useState<TipoContacto>("LLAMADA");
  const [nota, setNota] = useState("");
  const [listaEsperaOn, setListaEsperaOn] = useState(patient?.enListaEspera ?? false);
  const [comentarioEspera, setComentarioEspera] = useState(patient?.comentarioListaEspera ?? "");

  const { mutate: createContacto, isPending } = useCreateContacto(patient?.id ?? "");
  const { mutate: updateListaEspera, isPending: isPendingEspera } = useUpdateListaEspera();

  useEffect(() => {
    setListaEsperaOn(patient?.enListaEspera ?? false);
    setComentarioEspera(patient?.comentarioListaEspera ?? "");
  }, [patient?.id]);

  function handleSubmitListaEspera() {
    if (!patient) return;
    updateListaEspera(
      { pacienteId: patient.id, enListaEspera: listaEsperaOn, comentarioListaEspera: comentarioEspera.trim() || undefined },
      {
        onSuccess: () => toast.success(listaEsperaOn ? "Paciente agregado a lista de espera" : "Paciente quitado de lista de espera"),
        onError: () => toast.error("No se pudo actualizar la lista de espera"),
      }
    );
  }

  function handleSubmitContacto() {
    if (!patient) return;
    createContacto(
      { tipo, nota: nota.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Contacto registrado");
          setNota("");
          onOpenChange(false);
        },
        onError: () => toast.error("No se pudo registrar el contacto"),
      }
    );
  }

  if (!patient) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 pt-5 pb-4 border-b">
          <SheetTitle className="text-base font-semibold">{patient.nombreCompleto}</SheetTitle>
          {patient.procedimiento && (
            <p className="text-xs text-muted-foreground mt-0.5">{patient.procedimiento}</p>
          )}
          {(patient.pendingAutorizaciones ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border border-purple-300 bg-purple-50 text-purple-700 font-medium w-fit mt-1">
              🛡 {patient.pendingAutorizaciones} autorización{(patient.pendingAutorizaciones ?? 0) > 1 ? "es" : ""} pendiente{(patient.pendingAutorizaciones ?? 0) > 1 ? "s" : ""}
            </span>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

          {/* Registrar contacto */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Registrar contacto
            </h3>

            {/* Tipo */}
            <div className="flex gap-2">
              {TIPO_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTipo(opt.value)}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1 rounded-lg border py-2.5 text-xs font-medium transition-colors",
                    tipo === opt.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Nota */}
            <div className="space-y-1.5">
              <Label className="text-xs">Nota (opcional)</Label>
              <Textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="¿De qué se habló?"
                rows={3}
                className="resize-none text-sm"
              />
            </div>

            <Button
              className="w-full"
              onClick={handleSubmitContacto}
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar
            </Button>
          </section>

          {/* Divider */}
          <div className="border-t" />

          {/* Acciones rápidas */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Acciones rápidas
            </h3>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => {
                  onOpenChange(false);
                  onOpenNuevoTurno(patient.id);
                }}
              >
                <Calendar className="h-4 w-4" />
                Dar un turno
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => {
                  onOpenChange(false);
                  onOpenPresupuestos(patient.id);
                }}
              >
                <FileText className="h-4 w-4" />
                Crear presupuesto
              </Button>
            </div>
          </section>

          {/* Divider */}
          <div className="border-t" />

          {/* Lista de espera */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Lista de espera
            </h3>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Quiere adelantar turno</Label>
              <Switch
                checked={listaEsperaOn}
                onCheckedChange={setListaEsperaOn}
                disabled={isPendingEspera}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Comentario (opcional)</Label>
              <Textarea
                value={comentarioEspera}
                onChange={(e) => setComentarioEspera(e.target.value)}
                placeholder='Ej: "Solo puedo en la tarde"'
                rows={2}
                className="resize-none text-sm"
              />
            </div>
            <Button
              variant="outline"
              className={cn("w-full", listaEsperaOn && "border-amber-400 text-amber-700 hover:bg-amber-50")}
              onClick={handleSubmitListaEspera}
              disabled={isPendingEspera}
            >
              {isPendingEspera && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </section>

          {/* Divider */}
          <div className="border-t" />

          {/* Ver perfil completo */}
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => {
              onOpenChange(false);
              onOpenDrawer(patient.id);
            }}
          >
            Ver perfil completo
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
