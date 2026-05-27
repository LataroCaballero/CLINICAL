"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Phone, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { KanbanPatient } from "@/hooks/useCRMKanban";
import { CRMFlujoBadge } from "./CRMFlujoBadge";
import { EtapaStepper } from "./EtapaStepper";
import { ContactoRapidoModal } from "./ContactoRapidoModal";
import { ListaEsperaDialog } from "./ListaEsperaDialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  patient: KanbanPatient | null;
  onOpenDrawer: (pacienteId: string) => void;
}

export function CardActionsSheet({
  open,
  onOpenChange,
  patient,
  onOpenDrawer,
}: Props) {
  const [contactoOpen, setContactoOpen] = useState(false);
  const [listaEsperaOpen, setListaEsperaOpen] = useState(false);

  if (!patient) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm flex flex-col gap-0 p-0">
        {/* HEADER */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <SheetTitle className="text-base font-semibold">{patient.nombreCompleto}</SheetTitle>
            <CRMFlujoBadge flujo={patient.flujo} />
          </div>
          {patient.procedimiento && (
            <p className="text-xs text-muted-foreground mt-0.5">{patient.procedimiento}</p>
          )}
          {(patient.pendingAutorizaciones ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border border-purple-300 bg-purple-50 text-purple-700 font-medium w-fit mt-1">
              🛡 {patient.pendingAutorizaciones} autorización{(patient.pendingAutorizaciones ?? 0) > 1 ? "es" : ""} pendiente{(patient.pendingAutorizaciones ?? 0) > 1 ? "s" : ""}
            </span>
          )}
        </SheetHeader>

        {/* STEPPER BODY — scrollable, fills available space */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <EtapaStepper etapaActual={patient.etapaCRM} />
        </div>

        {/* FOOTER — fixed at bottom */}
        <div className="border-t px-5 py-4 flex flex-col gap-2 flex-shrink-0">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 justify-center gap-2 text-sm"
              onClick={() => setContactoOpen(true)}
            >
              <Phone className="h-4 w-4" />
              Registrar contacto
            </Button>
            <Button
              variant="outline"
              className={cn(
                "flex-1 justify-center gap-2 text-sm",
                patient.enListaEspera && "border-amber-400 text-amber-700 hover:bg-amber-50"
              )}
              onClick={() => setListaEsperaOpen(true)}
            >
              <Clock className="h-4 w-4" />
              {patient.enListaEspera ? "En lista de espera" : "Lista de espera"}
            </Button>
          </div>
          <button
            type="button"
            className="text-xs text-muted-foreground underline underline-offset-2 text-center w-full hover:text-foreground transition-colors"
            onClick={() => {
              onOpenChange(false);
              onOpenDrawer(patient.id);
            }}
          >
            Ver perfil completo
          </button>
        </div>

        {/* DIALOGS — Radix DialogPortal mounts in document.body, no z-index conflict with Sheet */}
        <ContactoRapidoModal
          open={contactoOpen}
          onOpenChange={setContactoOpen}
          patient={patient}
        />
        <ListaEsperaDialog
          open={listaEsperaOpen}
          onOpenChange={setListaEsperaOpen}
          patient={patient}
        />
      </SheetContent>
    </Sheet>
  );
}
