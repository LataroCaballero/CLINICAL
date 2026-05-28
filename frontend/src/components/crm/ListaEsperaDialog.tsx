"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useUpdateListaEspera } from "@/hooks/useUpdateListaEspera";
import { toast } from "sonner";
import { KanbanPatient } from "@/hooks/useCRMKanban";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  patient: KanbanPatient | null;
}

export function ListaEsperaDialog({ open, onOpenChange, patient }: Props) {
  const [comentario, setComentario] = useState("");

  // Sync comment whenever the patient or open state changes
  useEffect(() => {
    setComentario(patient?.comentarioListaEspera ?? "");
  }, [patient?.id, open]);

  const { mutate, isPending } = useUpdateListaEspera();

  if (!patient) return null;

  const estaEnLista = patient.enListaEspera;

  function handleAgregar() {
    if (!patient) return;
    mutate(
      {
        pacienteId: patient.id,
        enListaEspera: true,
        comentarioListaEspera: comentario.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Paciente agregado a lista de espera");
          onOpenChange(false);
        },
        onError: () => toast.error("No se pudo actualizar la lista de espera"),
      }
    );
  }

  function handleGuardar() {
    if (!patient) return;
    mutate(
      {
        pacienteId: patient.id,
        enListaEspera: true,
        comentarioListaEspera: comentario.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Lista de espera actualizada");
          onOpenChange(false);
        },
        onError: () => toast.error("No se pudo actualizar la lista de espera"),
      }
    );
  }

  function handleQuitar() {
    if (!patient) return;
    mutate(
      {
        pacienteId: patient.id,
        enListaEspera: false,
      },
      {
        onSuccess: () => {
          toast.success("Paciente quitado de lista de espera");
          onOpenChange(false);
        },
        onError: () => toast.error("No se pudo actualizar la lista de espera"),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {estaEnLista ? "Lista de espera" : "Agregar a lista de espera"}
          </DialogTitle>
        </DialogHeader>

        <Textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder={'Ej: "Solo puedo en la tarde"'}
          rows={3}
          className="resize-none"
        />

        {estaEnLista ? (
          <div className="flex flex-col gap-2">
            <Button className="w-full" onClick={handleGuardar} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar cambios
            </Button>
            <Button
              variant="ghost"
              className="w-full text-destructive hover:text-destructive"
              onClick={handleQuitar}
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Quitar de lista de espera
            </Button>
          </div>
        ) : (
          <Button className="w-full" onClick={handleAgregar} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Agregar a lista de espera
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
