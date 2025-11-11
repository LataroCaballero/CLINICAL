"use client";
import * as React from "react";
import { addMinutes, format, setHours, setMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search } from "lucide-react";

export default function QuickAppointment() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [showSearch, setShowSearch] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [patientModal, setPatientModal] = React.useState(false);

  // Pacientes de ejemplo
  const patients = [
    { id: 1, name: "María Pérez", dni: "39288774" },
    { id: 2, name: "Juan Gómez", dni: "35111902" },
    { id: 3, name: "Lucía Fernández", dni: "40444911" },
  ];

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.dni.includes(searchTerm)
  );

  // Horarios del día
  const start = setHours(setMinutes(new Date(), 0), 8);
  const hours = Array.from({ length: 49 }, (_, i) =>
    format(addMinutes(start, i * 15), "HH:mm")
  );

  return (
    <>
      {/* Tarjeta principal */}
      <Card className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden mt-8">
        <CardContent className="flex flex-col md:flex-row gap-4 p-4 md:p-6">
          {/* Calendario */}
          <div className="w-full md:w-[60%] flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              locale={es}
              className="rounded-md border border-gray-100"
            />
          </div>

          {/* Horarios */}
          <div className="w-full md:w-[40%] flex flex-col gap-2 overflow-y-auto max-h-[420px] pr-2">
            {hours.map((time) => (
              <Button
                key={time}
                variant={selectedTime === time ? "default" : "outline"}
                className={`w-full justify-center ${
                  selectedTime === time ? "bg-indigo-500 text-white" : ""
                }`}
                onClick={() => setSelectedTime(time)}
              >
                {time}
              </Button>
            ))}
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between p-4 border-t text-sm text-gray-600">
          <span>Seleccioná un horario para reservar un turno!</span>
          <Button
            onClick={() => {
              if (!date || !selectedTime)
                return alert("Seleccioná fecha y hora");
              setOpen(true);
            }}
            className="bg-indigo-500 hover:bg-indigo-600 text-white"
          >
            Continuar
          </Button>
        </CardFooter>
      </Card>

      {/* Modal principal: datos del turno */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Agendar nuevo turno</DialogTitle>
            <DialogDescription>
              Seleccioná el paciente y tipo de turno.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Selector de paciente */}
            <div className="grid gap-2">
              <Label>Paciente</Label>

              {/* Botón -> Caja de búsqueda */}
              {!showSearch ? (
                <div className="flex items-center border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setPatientModal(true)}
                    className="p-2 border-r bg-gray-50 hover:bg-gray-100 transition"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setShowSearch(true)}
                    className="flex-1 text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    + Seleccionar Paciente
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center border rounded-lg overflow-hidden mb-2">
                    <Search className="w-4 h-4 ml-2 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Buscar por nombre o DNI..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="border-none focus-visible:ring-0"
                    />
                  </div>
                  <div className="border rounded-md max-h-[160px] overflow-y-auto">
                    {filteredPatients.length > 0 ? (
                      filteredPatients.map((p) => (
                        <button
                          key={p.id}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                          onClick={() => {
                            alert(`Paciente seleccionado: ${p.name}`);
                            setShowSearch(false);
                          }}
                        >
                          {p.name} — {p.dni}
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 px-3 py-2">
                        No se encontraron resultados
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Tipo de turno */}
            <div className="grid gap-2">
              <Label>Tipo de turno</Label>
              <select className="border rounded-md px-3 py-2 text-sm">
                <option>Primera vez</option>
                <option>Consulta</option>
                <option>Prequirúrgico</option>
                <option>Cirugía</option>
                <option>Tratamiento</option>
              </select>
            </div>

            {/* Observaciones */}
            <div className="grid gap-2">
              <Label>Observaciones</Label>
              <Textarea placeholder="Notas adicionales (opcional)" />
            </div>

            {/* Fecha y hora */}
            <div className="text-sm text-gray-500 mt-2">
              <strong>Fecha:</strong>{" "}
              {date ? format(date, "dd/MM/yyyy") : "—"} <br />
              <strong>Hora:</strong> {selectedTime || "—"}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-indigo-500 hover:bg-indigo-600 text-white"
              onClick={() => {
                setOpen(false);
                alert("✅ Turno agendado correctamente");
              }}
            >
              Confirmar turno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submodal para crear paciente */}
      <Dialog open={patientModal} onOpenChange={setPatientModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar nuevo paciente</DialogTitle>
            <DialogDescription>
              Completá los datos principales para dar de alta al paciente.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nombre completo</Label>
              <Input placeholder="Ej. María Pérez" />
            </div>
            <div className="grid gap-2">
              <Label>DNI</Label>
              <Input placeholder="Ej. 39288774" />
            </div>
            <div className="grid gap-2">
              <Label>Teléfono</Label>
              <Input placeholder="Ej. +54 9 264 1234567" />
            </div>
            <div className="grid gap-2">
              <Label>Obra social</Label>
              <Input placeholder="Ej. OSDE, Swiss Medical..." />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPatientModal(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-indigo-500 hover:bg-indigo-600 text-white"
              onClick={() => {
                alert("👤 Paciente creado correctamente");
                setPatientModal(false);
              }}
            >
              Guardar paciente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
