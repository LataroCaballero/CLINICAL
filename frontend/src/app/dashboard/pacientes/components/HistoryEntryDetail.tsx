"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileText, Download, Printer, Calendar, User, CreditCard, Pencil } from "lucide-react";
import { useState } from "react";
import NewHistoryEntryModal from "./NewHistoryEntryModal";

export default function HistoryEntryDetail({ open, onOpenChange, entry }: any) {
  const [openEdit, setOpenEdit] = useState(false);

  if (!entry) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Detalle de la Entrada
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 pb-8">
              {/* Encabezado con info general */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <p className="text-sm text-gray-700">
                    <strong>Fecha:</strong>{" "}
                    {new Date(entry.fecha).toLocaleDateString("es-AR")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <p className="text-sm text-gray-700">
                    <strong>Tipo de práctica:</strong> {entry.tipoPractica || "-"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  <p className="text-sm text-gray-700">
                    <strong>Pago:</strong>{" "}
                    {entry.pago?.monto ? `$${entry.pago.monto}` : "No registrado"}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Contenido */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Contenido</h3>
                <div
                  className="prose max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: entry.descripcion }}
                />
              </div>

              {/* Archivos adjuntos */}
              {entry.archivos?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">
                    Archivos adjuntos
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {entry.archivos.map((file: any, i: number) => (
                      <div
                        key={i}
                        className="w-40 h-40 border rounded-md overflow-hidden cursor-pointer group relative"
                        onClick={() => window.open(file.url || "#", "_blank")}
                      >
                        {file.type?.startsWith("image/") ? (
                          <img
                            src={file.url || "#"}
                            alt={file.name}
                            className="object-cover w-full h-full group-hover:opacity-80 transition"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full bg-gray-50 text-gray-600">
                            <FileText className="w-6 h-6 mb-1" />
                            <span className="text-xs text-center px-1 truncate">
                              {file.name}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer con acciones */}
          <div className="border-t pt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={onOpenChange}>
              Cerrar
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => setOpenEdit(true)}
            >
              <Pencil className="w-4 h-4" /> Editar entrada
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Printer className="w-4 h-4" /> Imprimir
            </Button>
            <Button className="bg-indigo-500 hover:bg-indigo-600 text-white flex items-center gap-2">
              <Download className="w-4 h-4" /> Exportar PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de edición */}
      {openEdit && (
        <NewHistoryEntryModal
          open={openEdit}
          onOpenChange={setOpenEdit}
          onSave={(updatedEntry: any) => {
            Object.assign(entry, updatedEntry);
            setOpenEdit(false);
          }}
        />
      )}
    </>
  );
}
