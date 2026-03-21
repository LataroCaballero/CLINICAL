"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MotivoPerdidaCRM } from "@/hooks/useCRMKanban";

const MOTIVOS: { value: MotivoPerdidaCRM; label: string }[] = [
  { value: "PRECIO", label: "Precio muy alto" },
  { value: "TIEMPO", label: "No es el momento" },
  { value: "MIEDO_CIRUGIA", label: "Miedo a la cirugía" },
  { value: "PREFIERE_OTRO_PROFESIONAL", label: "Prefiere otro profesional" },
  { value: "NO_CANDIDATO_MEDICO", label: "No es candidato médico" },
  { value: "NO_RESPONDIO", label: "No respondió" },
  { value: "OTRO", label: "Otro motivo" },
];

interface Props {
  open: boolean;
  onConfirm: (motivo: MotivoPerdidaCRM) => void;
  onCancel: () => void;
}

export function LossReasonModal({ open, onConfirm, onCancel }: Props) {
  const [selected, setSelected] = useState<MotivoPerdidaCRM | null>(null);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>¿Por qué se perdió esta oportunidad?</DialogTitle>
        </DialogHeader>

        <RadioGroup
          value={selected ?? ""}
          onValueChange={(v) => setSelected(v as MotivoPerdidaCRM)}
          className="space-y-2 py-2"
        >
          {MOTIVOS.map(({ value, label }) => (
            <div key={value} className="flex items-center gap-2">
              <RadioGroupItem value={value} id={value} />
              <Label htmlFor={value} className="cursor-pointer">
                {label}
              </Label>
            </div>
          ))}
        </RadioGroup>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={!selected}
            onClick={() => selected && onConfirm(selected)}
          >
            Confirmar pérdida
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
