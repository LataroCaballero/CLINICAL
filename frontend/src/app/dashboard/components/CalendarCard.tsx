import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";

export default function CalendarCard() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Calendario de turnos</h3>
        <Button className="bg-indigo-500 hover:bg-indigo-600 text-white">Nuevo turno</Button>
      </div>
      <div className="flex items-center justify-center h-64 border border-dashed border-gray-200 rounded-lg text-gray-400">
        <CalendarDays className="w-5 h-5 mr-2" /> Aquí irá el calendario interactivo
      </div>
    </div>
  );
}
