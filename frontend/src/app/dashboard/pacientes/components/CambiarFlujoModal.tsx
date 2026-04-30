'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUpdateFlujo } from "@/hooks/useUpdateFlujo";

type FlujoValue = "CIRUGIA" | "TRATAMIENTO" | "PENDIENTE";

interface CambiarFlujoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pacienteId: string;
  currentFlujo: FlujoValue | null;
  onOptimisticUpdate: (flujo: FlujoValue) => void;
  onRevert: () => void;
}

const FLUJO_OPTIONS: {
  value: FlujoValue;
  label: string;
  baseClass: string;
  ringClass: string;
}[] = [
  {
    value: "CIRUGIA",
    label: "Cirugía",
    baseClass: "bg-blue-100 text-blue-700",
    ringClass: "ring-2 ring-blue-400",
  },
  {
    value: "TRATAMIENTO",
    label: "Tratamiento",
    baseClass: "bg-green-100 text-green-700",
    ringClass: "ring-2 ring-green-400",
  },
  {
    value: "PENDIENTE",
    label: "Pendiente",
    baseClass: "bg-amber-100 text-amber-700",
    ringClass: "ring-2 ring-amber-400",
  },
];

export function CambiarFlujoModal({
  open,
  onOpenChange,
  pacienteId,
  currentFlujo,
  onOptimisticUpdate,
  onRevert,
}: CambiarFlujoModalProps) {
  const router = useRouter();
  const mutation = useUpdateFlujo(pacienteId);
  const [selectedFlujo, setSelectedFlujo] = useState<FlujoValue>(
    currentFlujo ?? "PENDIENTE"
  );

  useEffect(() => {
    if (open) {
      setSelectedFlujo(currentFlujo ?? "PENDIENTE");
    }
  }, [open, currentFlujo]);

  const handleConfirmar = () => {
    if (!selectedFlujo || selectedFlujo === currentFlujo) return;
    onOptimisticUpdate(selectedFlujo);
    onOpenChange(false);
    mutation.mutate(selectedFlujo, {
      onError: () => {
        onRevert();
        toast.error("Error al actualizar el flujo. Intentá nuevamente.");
      },
      onSuccess: () => {
        const label = {
          CIRUGIA: "Cirugía",
          TRATAMIENTO: "Tratamiento",
          PENDIENTE: "Pendiente",
        }[selectedFlujo];
        toast(`Flujo actualizado a ${label}`, {
          action: {
            label: "Ver en CRM →",
            onClick: () => {
              localStorage.setItem("pacientes-vista", "embudo");
              router.refresh();
            },
          },
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cambiar flujo</DialogTitle>
        </DialogHeader>

        <div className="flex gap-3 mt-2">
          {FLUJO_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedFlujo(option.value)}
              className={`flex-1 px-3 py-4 rounded-lg text-sm font-medium transition-all ${option.baseClass} ${
                selectedFlujo === option.value ? option.ringClass : ""
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          Al confirmar, el paciente quedará en la etapa Sin Clasificar y se
          registrará un contacto automático.
        </p>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={selectedFlujo === currentFlujo || mutation.isPending}
          >
            {mutation.isPending ? "Guardando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
