"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";

import { Button } from "@/components/ui/button";
import PacienteDetails from "./PacienteDetails";
import PacienteDetailsSkeleton from "./PacienteDetailsSkeleton";
import { usePaciente } from "@/hooks/usePaciente";
import { useState, useEffect } from "react";
import DatosCompletos from "@/components/patient/PatientDrawer/views/DatosCompletos";
import HistoriaClinica from "@/components/patient/PatientDrawer/views/HistoriaClinica";
import PacienteTurnos from "@/components/patient/PatientDrawer/views/TurnosPaciente";
import CuentaCorrienteView from "@/components/patient/PatientDrawer/views/CuentaCorrienteView";
import PresupuestosView from "@/components/patient/PatientDrawer/views/PresupuestosView";
import MensajesView from "@/components/patient/PatientDrawer/views/MensajesView";
import { ContactosSection } from "./ContactosSection";
import { AutorizacionesPacienteSection } from "./AutorizacionesPacienteSection";

type DrawerView = "default" | "datos" | "historia" | "turnos" | "mensajes" | "cuenta" | "presupuestos";

export default function PatientDrawer({
  open,
  onOpenChange,
  pacienteId,
  initialView = "default",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pacienteId: string | null;
  initialView?: DrawerView;
}) {
  const { data: paciente, isLoading, isError } = usePaciente(pacienteId);
  const [view, setView] = useState<DrawerView>(initialView);

  // Reset to initialView every time the drawer opens
  useEffect(() => {
    if (open) setView(initialView);
  }, [open, initialView]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] flex flex-col">

        {/* HEADER */}
        <DrawerHeader className="border-b">
          <DrawerTitle className="text-lg font-semibold text-center">
            Información del paciente
          </DrawerTitle>
        </DrawerHeader>

        {/* CONTENIDO SCROLLEABLE */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="max-w-3xl mx-auto">

            {isLoading && <PacienteDetailsSkeleton />}

            {isError && (
              <div className="p-4 border border-red-300 rounded text-red-600">
                Error al cargar el paciente.
              </div>
            )}

            {paciente && !isLoading && view === "default" && (
              <>
                <PacienteDetails
                  paciente={paciente}
                  onAction={setView}
                />
                <div className="mt-6 pt-5 border-t">
                  <AutorizacionesPacienteSection
                    pacienteId={paciente.id}
                    obraSocialId={(paciente as any).obraSocialId}
                    profesionalId={(paciente as any).profesionalId}
                  />
                </div>
                <div className="mt-6 pt-5 border-t">
                  <ContactosSection
                    pacienteId={paciente.id}
                    pacienteNombre={paciente.nombreCompleto}
                  />
                </div>
              </>
            )}
            {view === "datos" && paciente &&
              <DatosCompletos
                paciente={paciente}
                onBack={() => setView("default")}
              />
            }
            {view === "historia" && paciente &&
              <HistoriaClinica
                pacienteId={paciente.id}
                onBack={() => setView("default")}
              />
            }
            {view === "turnos" && paciente &&
              <PacienteTurnos
                pacienteId={paciente.id}
                onBack={() => setView("default")}
              />
            }
            {view === "cuenta" && paciente &&
              <CuentaCorrienteView
                pacienteId={paciente.id}
                onBack={() => setView("default")}
              />
            }
            {view === "presupuestos" && paciente &&
              <PresupuestosView
                pacienteId={paciente.id}
                pacienteEmail={paciente.email ?? ""}
                pacienteOptIn={(paciente as any).whatsappOptIn ?? false}
                onBack={() => setView("default")}
              />
            }
            {view === "mensajes" && paciente &&
              <MensajesView
                pacienteId={paciente.id}
                pacienteNombre={paciente.nombreCompleto}
                whatsappOptIn={(paciente as any).whatsappOptIn ?? false}
                onBack={() => setView("default")}
              />
            }
          </div>
        </div>

        {/* FOOTER FIJO */}
        <div className="border-t p-4 bg-white">
          <DrawerClose asChild>
            <Button variant="outline" className="w-full max-w-sm mx-auto block">
              Cerrar
            </Button>
          </DrawerClose>
        </div>

      </DrawerContent>
    </Drawer>
  );
}
