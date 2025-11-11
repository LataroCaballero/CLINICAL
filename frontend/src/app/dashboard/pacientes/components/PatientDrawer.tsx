"use client";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import PatientHistory from "./PatientHistory";
import { useState } from "react";

export default function PatientDrawer({ patient, onClose }: any) {
  const [activeView, setActiveView] = useState<
    "info" | "historia" | "cuenta" | "turnos"
  >("info");

  if (!patient) return null;

  return (
    <Drawer open={!!patient} onOpenChange={onClose}>
      <DrawerContent className="p-0 max-w-md ml-auto flex flex-col">
        {/* Header */}
        <DrawerHeader className="border-b bg-gray-50 px-6 py-4">
          <DrawerTitle className="text-lg font-semibold">
            {patient.nombre}
          </DrawerTitle>
          <DrawerDescription>
            {patient.ultimaIntervencion} — {patient.fecha}
          </DrawerDescription>
        </DrawerHeader>

        {/* Contenido scrollable */}
        <div className="relative flex-1 flex flex-col">
          <ScrollArea className="p-6 flex-1">
            {activeView === "info" && (
              <>
                <div className="space-y-3 text-sm">
                  <p>
                    <strong>Edad:</strong> {patient.edad} años
                  </p>
                  <p>
                    <strong>Peso:</strong> {patient.peso} kg
                  </p>
                  <p>
                    <strong>Estado:</strong>{" "}
                    <span className="capitalize">{patient.estado}</span>
                  </p>
                  <p>
                    <strong>Última intervención:</strong>{" "}
                    {patient.ultimaIntervencion}
                  </p>
                  <p>
                    <strong>Modificado por:</strong> {patient.modificadoPor}
                  </p>
                </div>

                <div className="mt-6 flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setActiveView("historia")}
                  >
                    Ver Historia Clínica
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveView("cuenta")}
                  >
                    Ver Cuenta Corriente
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveView("turnos")}
                  >
                    Ver Turnos
                  </Button>
                </div>
              </>
            )}

            {activeView === "historia" && <PatientHistory patient={patient} />}

            {activeView === "cuenta" && (
              <div className="text-sm text-gray-600">
                <p className="mb-4 font-semibold">Cuenta Corriente</p>
                <p>(Esta sección se implementará más adelante)</p>
              </div>
            )}

            {activeView === "turnos" && (
              <div className="text-sm text-gray-600">
                <p className="mb-4 font-semibold">Turnos del paciente</p>
                <p>(Próximamente se integrará la vista de turnos filtrada)</p>
              </div>
            )}
          </ScrollArea>

          {/* Botón volver: SIEMPRE visible cuando no estamos en la vista principal */}
          {activeView !== "info" && (
            <div className="border-t bg-gray-50 px-6 py-3 flex justify-start sticky bottom-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveView("info")}
                className="text-gray-600 hover:text-gray-800"
              >
                ← Volver
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4 flex justify-end">
          <DrawerClose asChild>
            <Button variant="outline">Cerrar</Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
