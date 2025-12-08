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

export default function PatientDrawer({
  open,
  onOpenChange,
  pacienteId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pacienteId: string | null;
}) {
  const { data: paciente, isLoading, isError } = usePaciente(pacienteId);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] overflow-y-auto">
        <DrawerHeader>
          <DrawerTitle>Información del paciente</DrawerTitle>
        </DrawerHeader>

        <div className="p-4">
          {isLoading && <PacienteDetailsSkeleton />}

          {isError && (
            <div className="p-4 border border-red-300 rounded text-red-600">
              Error al cargar el paciente.
            </div>
          )}

          {paciente && !isLoading && <PacienteDetails paciente={paciente} />}
        </div>

        <div className="p-4 flex justify-end">
          <DrawerClose asChild>
            <Button variant="outline">Cerrar</Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
