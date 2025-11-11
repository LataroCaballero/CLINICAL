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

export default function PatientDrawer({ patient, onClose }: any) {
  if (!patient) return null;

  return (
    <Drawer open={!!patient} onOpenChange={onClose}>
      <DrawerContent className="p-0 max-w-md ml-auto">
        <DrawerHeader className="border-b bg-gray-50 px-6 py-4">
          <DrawerTitle className="text-lg font-semibold">
            {patient.nombre}
          </DrawerTitle>
          <DrawerDescription>
            {patient.ultimaIntervencion} — {patient.fecha}
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="p-6 max-h-[75vh]">
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
              <strong>Última intervención:</strong> {patient.ultimaIntervencion}
            </p>
            <p>
              <strong>Modificado por:</strong> {patient.modificadoPor}
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <Button variant="outline">Ver Historia Clínica</Button>
            <Button variant="outline">Ver Cuenta Corriente</Button>
            <Button variant="outline">Ver Turnos</Button>
          </div>
        </ScrollArea>

        <div className="border-t bg-gray-50 p-4 flex justify-end">
          <DrawerClose asChild>
            <Button variant="outline">Cerrar</Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
