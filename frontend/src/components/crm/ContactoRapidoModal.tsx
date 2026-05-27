"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Phone, MessageCircle, Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateContacto } from "@/hooks/useCreateContacto";
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
}

export function ContactoRapidoModal({ open, onOpenChange, patient }: Props) {
  const [tipo, setTipo] = useState<TipoContacto>("LLAMADA");
  const [nota, setNota] = useState("");

  const { mutate, isPending } = useCreateContacto(patient?.id ?? "");

  if (!patient) return null;

  function handleSubmit() {
    mutate(
      { tipo, nota: nota.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Contacto registrado");
          setNota("");
          // Only closes THIS Dialog — does NOT affect the parent Sheet
          onOpenChange(false);
        },
        onError: () => toast.error("No se pudo registrar el contacto"),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar contacto</DialogTitle>
        </DialogHeader>

        {/* Tipo selector */}
        <div className="flex gap-2">
          {TIPO_OPTIONS.map(({ value, label, icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTipo(value)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-xs transition-colors",
                tipo === value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              )}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Nota */}
        <Textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="¿De qué se habló?"
          rows={3}
          className="resize-none"
        />

        {/* Submit */}
        <Button className="w-full" onClick={handleSubmit} disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Registrar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
