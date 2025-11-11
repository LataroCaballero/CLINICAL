"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { FileUp, CalendarIcon } from "lucide-react";
import dynamic from "next/dynamic";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createPortal } from "react-dom";

const Editor = dynamic(() => import("./TiptapEditor"), { ssr: false });

export default function NewHistoryEntryModal({ open, onOpenChange, onSave }: any) {
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [content, setContent] = useState("");
  const [fecha, setFecha] = useState<Date>(new Date());
  const [tipoPractica, setTipoPractica] = useState("");
  const [pago, setPago] = useState({ monto: "", metodo: "", nota: "" });
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const handleFileUpload = (e: any) => {
    const files = Array.from(e.target.files);
    setAttachments((prev) => [...prev, ...files]);
  };

  const handleSave = () => {
    const newEntry = {
      id: Math.random(),
      fecha,
      titulo: title,
      plantilla: template,
      tipoPractica,
      descripcion: content,
      archivos: attachments.map((f) => f.name),
      pago,
    };
    onSave(newEntry);
    onOpenChange(false);
  };

  // Keyboard navigation for preview
  useEffect(() => {
    if (previewIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewIndex(null);
      if (e.key === "ArrowRight")
        setPreviewIndex((prev) =>
          prev === null ? null : (prev + 1) % attachments.length
        );
      if (e.key === "ArrowLeft")
        setPreviewIndex((prev) =>
          prev === null
            ? null
            : (prev - 1 + attachments.length) % attachments.length
        );
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [attachments.length, previewIndex]);

  const previewFile =
    previewIndex !== null ? attachments[previewIndex] : null;

  return (
    <>
      {/* Modal principal */}
      <Dialog
        open={open}
        onOpenChange={(val) => {
          if (previewIndex !== null) return; // no cerrar si hay preview abierto
          onOpenChange(val);
        }}
      >
        <DialogContent
          className={cn(
            "sm:max-w-[95vw] w-[95vw] h-[90vh] flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-all",
            previewIndex !== null && "pointer-events-none opacity-50"
          )}
        >
          <DialogHeader className="shrink-0 px-6 pt-4">
            <DialogTitle className="text-xl font-semibold">
              Nueva entrada clínica
            </DialogTitle>
            <DialogDescription>
              Registra una nueva evolución, procedimiento o práctica realizada.
            </DialogDescription>
          </DialogHeader>

          {/* Contenido scrolleable */}
          <ScrollArea className="flex-1 overflow-y-auto pr-3">
            <div className="space-y-6 py-4">
              {/* Fila superior */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Título</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej: Control post-operatorio"
                  />
                </div>

                <div>
                  <Label>Plantilla</Label>
                  <Select onValueChange={setTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar plantilla" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="control">Control post-operatorio</SelectItem>
                      <SelectItem value="cirugia">Cirugía facial</SelectItem>
                      <SelectItem value="evaluacion">Evaluación inicial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Fecha</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !fecha && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fecha
                          ? format(fecha, "PPP", { locale: es })
                          : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={fecha}
                        onSelect={setFecha}
                        initialFocus
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Tipo de práctica */}
              <div>
                <Label>Tipo de práctica</Label>
                <Select onValueChange={setTipoPractica}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consulta">Consulta</SelectItem>
                    <SelectItem value="tratamiento">Tratamiento</SelectItem>
                    <SelectItem value="cirugia">Cirugía</SelectItem>
                    <SelectItem value="control">Control post-operatorio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Editor enriquecido */}
              <div>
                <Label>Contenido</Label>
                <Editor content={content} onChange={setContent} />
              </div>

              {/* Archivos adjuntos */}
              <div>
                <Label>Archivos adjuntos</Label>
                <div className="flex gap-2 items-center mb-2">
                  <Button asChild variant="outline" className="flex items-center gap-2">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <FileUp className="w-4 h-4" /> Subir archivos
                    </label>
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>

                {attachments.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto p-2 bg-gray-50 rounded-md border">
                    {attachments.map((file, i) => (
                      <div
                        key={i}
                        className="flex-shrink-0 w-40 h-40 relative border rounded-md overflow-hidden cursor-pointer hover:opacity-80"
                        onClick={() => setPreviewIndex(i)}
                      >
                        {file.type.startsWith("image/") ? (
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-xs text-gray-500 px-2 text-center">
                            <span>{file.name}</span>
                            <span className="text-indigo-500 mt-1">Ver PDF</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pago asociado */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Monto del pago</Label>
                  <Input
                    type="number"
                    placeholder="Ej: 15000"
                    value={pago.monto}
                    onChange={(e) => setPago({ ...pago, monto: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Método de pago</Label>
                  <Select onValueChange={(v) => setPago({ ...pago, metodo: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notas del pago</Label>
                  <Input
                    placeholder="Ej: Seña por tratamiento"
                    value={pago.nota}
                    onChange={(e) => setPago({ ...pago, nota: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t bg-white p-4 flex justify-end gap-2 shrink-0 sticky bottom-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-indigo-500 hover:bg-indigo-600 text-white"
              onClick={handleSave}
            >
              Guardar entrada
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox global */}
      {previewFile &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999999] flex flex-col bg-black/95 text-white pointer-events-auto"
            onClick={() => setPreviewIndex(null)}
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-black/60 backdrop-blur-sm border-b border-white/10">
              <div>
                <h2 className="text-base font-medium truncate max-w-[80vw]">
                  {previewFile?.name || "Archivo"}
                </h2>
                <p className="text-xs text-gray-400">
                  ← / → para cambiar — Esc para cerrar
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewIndex(null);
                }}
                className="text-3xl leading-none hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            {/* Contenido */}
            <div
              className="flex-1 flex items-center justify-center overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              {previewFile.type.startsWith("image/") ? (
                <img
                  src={URL.createObjectURL(previewFile)}
                  alt={previewFile.name}
                  className="object-contain w-[95vw] h-[90vh] rounded-md transition-transform duration-300 hover:scale-[1.02]"
                />
              ) : (
                <iframe
                  src={URL.createObjectURL(previewFile)}
                  className="w-[95vw] h-[90vh] bg-white rounded-md shadow-lg"
                />
              )}

              {/* Flechas */}
              {attachments.length > 1 && previewIndex !== null && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewIndex(
                        (prev) =>
                          prev === null
                            ? 0
                            : (prev - 1 + attachments.length) % attachments.length
                      )
                    }
                    className="absolute left-6 top-1/2 -translate-y-1/2 text-6xl text-white/70 hover:text-white select-none"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewIndex(
                        (prev) =>
                          prev === null
                            ? 0
                            : (prev + 1) % attachments.length
                      )
                    }
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-6xl text-white/70 hover:text-white select-none"
                  >
                    ›
                  </button>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
