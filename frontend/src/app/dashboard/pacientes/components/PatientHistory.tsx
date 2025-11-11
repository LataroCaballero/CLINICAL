"use client";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarIcon, FileText, Plus } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import NewHistoryEntryModal from "./NewHistoryEntryModal";
import HistoryEntryDetail from "./HistoryEntryDetail";

export default function PatientHistory({ patient }: { patient: any }) {
  const [entries, setEntries] = useState([
    {
      id: 1,
      fecha: new Date(2025, 9, 28, 10, 0),
      titulo: "Consulta post operatoria",
      descripcion:
        "El paciente presenta buena evolución post operatoria. Sin signos de infección ni sangrado. Se recomienda continuar con antibiótico 3 días más.",
      tipoPractica: "Consulta",
      pago: { monto: "15000", metodo: "efectivo" },
      archivos: ["foto1.jpg", "informe.pdf"],
    },
    {
      id: 2,
      fecha: new Date(2025, 9, 15, 9, 30),
      titulo: "Cirugía blefaroplastia",
      descripcion:
        "Procedimiento realizado bajo anestesia local. Se retirarán puntos en 7 días. Se indican antibióticos y antiinflamatorios.",
      tipoPractica: "Cirugía",
      pago: { monto: "250000", metodo: "transferencia" },
      archivos: [],
    },
  ]);

  const [openModal, setOpenModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [openDetail, setOpenDetail] = useState(false);

  const handleSaveEntry = (entry: any) => {
    setEntries((prev) => [entry, ...prev]);
  };

  const handleOpenDetail = (entry: any) => {
    setSelectedEntry(entry);
    setOpenDetail(true);
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="flex justify-between items-center p-0 mb-4">
        <CardTitle className="text-lg font-medium text-gray-800">
          Historia clínica
        </CardTitle>
        <Button
          variant="default"
          size="sm"
          className="flex items-center gap-2"
          onClick={() => setOpenModal(true)}
        >
          <Plus className="w-4 h-4" /> Nueva entrada
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[500px] pr-2">
          {entries.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              No hay registros en la historia clínica.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-sm transition"
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {format(entry.fecha, "d 'de' MMMM yyyy", { locale: es })}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-indigo-600 hover:text-indigo-700"
                      onClick={() => handleOpenDetail(entry)}
                    >
                      Ver detalle
                    </Button>
                  </div>

                  <h3 className="font-semibold text-gray-800">{entry.titulo}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {entry.descripcion.length > 160
                      ? entry.descripcion.slice(0, 160) + "..."
                      : entry.descripcion}
                  </p>

                  {entry.archivos.length > 0 && (
                    <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span>{entry.archivos.length} adjunto(s)</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Modal para crear nueva entrada */}
      <NewHistoryEntryModal
        open={openModal}
        onOpenChange={setOpenModal}
        onSave={handleSaveEntry}
      />

      {/* Modal de detalle */}
      <HistoryEntryDetail
        open={openDetail}
        onOpenChange={setOpenDetail}
        entry={selectedEntry}
      />
    </Card>
  );
}
