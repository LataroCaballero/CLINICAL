"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePresupuestos } from "@/hooks/usePresupuestos";
import {
  useCreatePresupuesto,
  useAceptarPresupuesto,
  useDeletePresupuesto,
  PresupuestoItemInput,
} from "@/hooks/useCreatePresupuesto";
import { useRechazarPresupuesto } from "@/hooks/useRechazarPresupuesto";
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";
import EnviarPresupuestoModal from "@/components/presupuesto/EnviarPresupuestoModal";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Trash2, Plus, Send, FileText, MessageSquare, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Props = {
  pacienteId: string;
  pacienteEmail?: string;
  pacienteOptIn?: boolean;
  onBack: () => void;
};

const estadoColors: Record<string, string> = {
  BORRADOR: "bg-gray-100 text-gray-800",
  ENVIADO: "bg-blue-100 text-blue-800",
  ACEPTADO: "bg-green-100 text-green-800",
  RECHAZADO: "bg-red-100 text-red-800",
  CANCELADO: "bg-gray-100 text-gray-500",
  VENCIDO: "bg-amber-100 text-amber-700",
};

export default function PresupuestosView({ pacienteId, pacienteEmail = "", pacienteOptIn = false, onBack }: Props) {
  const { data: presupuestos = [], isLoading } = usePresupuestos(pacienteId);
  const createPresupuesto = useCreatePresupuesto();
  const aceptarPresupuesto = useAceptarPresupuesto();
  const deletePresupuesto = useDeletePresupuesto();
  const rechazarPresupuesto = useRechazarPresupuesto();
  const profesionalId = useEffectiveProfessionalId();

  // Modal de creacion
  const [openModal, setOpenModal] = useState(false);
  const [items, setItems] = useState<PresupuestoItemInput[]>([{ descripcion: "", precioTotal: 0 }]);
  const [descuentos, setDescuentos] = useState("");
  const [moneda, setMoneda] = useState<"ARS" | "USD">("ARS");
  const [fechaValidez, setFechaValidez] = useState("");

  // Modal de envio
  const [enviarModal, setEnviarModal] = useState<{ open: boolean; presupuestoId: string } | null>(null);

  // WA send state per presupuesto
  const [sendingWAId, setSendingWAId] = useState<string | null>(null);

  // PDF inline preview state (CONTEXT.md: "inline, dentro de la plataforma" - NOT window.open)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  const addItem = () => {
    setItems([...items, { descripcion: "", precioTotal: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: "descripcion" | "precioTotal", value: string | number) => {
    const newItems = [...items];
    if (field === "descripcion") {
      newItems[index].descripcion = value as string;
    } else {
      newItems[index].precioTotal = Math.max(0, Number(value) || 0);
    }
    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + item.precioTotal, 0);
  const descuentoNum = parseFloat(descuentos) || 0;
  const total = subtotal - descuentoNum;
  const simbolo = moneda === "USD" ? "U$S" : "$";

  const handleCreate = async () => {
    if (!profesionalId) return;
    const validItems = items.filter((item) => item.descripcion.trim() && item.precioTotal > 0);
    if (validItems.length === 0) return;

    await createPresupuesto.mutateAsync({
      pacienteId,
      profesionalId,
      items: validItems,
      descuentos: descuentoNum > 0 ? descuentoNum : undefined,
      moneda,
      fechaValidez: fechaValidez || undefined,
    });

    setItems([{ descripcion: "", precioTotal: 0 }]);
    setDescuentos("");
    setMoneda("ARS");
    setFechaValidez("");
    setOpenModal(false);
  };

  const handleViewPdf = async (presupuestoId: string) => {
    try {
      const response = await api.get(`/presupuestos/${presupuestoId}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      setPdfPreviewUrl(url);
    } catch {
      console.error("No se pudo cargar el PDF");
    }
  };

  const closePdfPreview = () => {
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
  };

  // Suppress unused variable warning for rechazarPresupuesto (available for future use)
  void rechazarPresupuesto;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>← Volver</Button>
        <h2 className="text-lg font-semibold">Presupuestos</h2>
        <Button onClick={() => setOpenModal(true)}>Nuevo</Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando presupuestos...</p>}

      {!isLoading && presupuestos.length === 0 && (
        <p className="text-sm text-muted-foreground">No hay presupuestos registrados.</p>
      )}

      {/* Listado */}
      <div className="space-y-3">
        {presupuestos.map((p) => {
          const esBorrador = p.estado === "BORRADOR";
          const puedeBorrar = esBorrador;

          return (
            <div key={p.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(p.createdAt), "dd/MM/yyyy", { locale: es })}
                    {p.fechaValidez && (
                      <span className="ml-2 text-amber-600">
                        · Vence: {format(new Date(p.fechaValidez), "dd/MM/yyyy", { locale: es })}
                      </span>
                    )}
                  </p>
                  <p className="font-semibold text-lg">
                    {p.moneda === "USD" ? "U$S" : "$"} {p.total.toLocaleString("es-AR")}
                  </p>
                </div>
                <Badge className={estadoColors[p.estado] ?? "bg-gray-100 text-gray-700"}>{p.estado}</Badge>
              </div>

              {/* Items */}
              <div className="text-sm text-muted-foreground space-y-1">
                {p.items.map((item, idx) => (
                  <p key={idx}>
                    • {item.descripcion} — ${item.precioTotal.toLocaleString("es-AR")}
                  </p>
                ))}
                {p.descuentos > 0 && (
                  <p className="text-green-600">
                    Descuento: -${p.descuentos.toLocaleString("es-AR")}
                  </p>
                )}
              </div>

              {/* Acciones */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => handleViewPdf(p.id)}>
                  <FileText className="w-3 h-3 mr-1" /> Ver PDF
                </Button>
                {esBorrador && (
                  <Button
                    size="sm"
                    onClick={() => setEnviarModal({ open: true, presupuestoId: p.id })}
                  >
                    <Send className="w-3 h-3 mr-1" /> Enviar
                  </Button>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!pacienteOptIn || sendingWAId === p.id}
                        onClick={async () => {
                          setSendingWAId(p.id);
                          try {
                            await api.post(`/whatsapp/presupuesto/${p.id}/send`, { pacienteId });
                            toast.success('Presupuesto enviado por WhatsApp');
                          } catch (e: any) {
                            toast.error(e.response?.data?.message ?? 'Error al enviar por WhatsApp');
                          } finally {
                            setSendingWAId(null);
                          }
                        }}
                      >
                        {sendingWAId === p.id ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <MessageSquare className="w-3 h-3 mr-1" />
                        )}
                        Enviar por WhatsApp
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!pacienteOptIn && (
                    <TooltipContent>El paciente no tiene opt-in para WhatsApp</TooltipContent>
                  )}
                </Tooltip>
                {puedeBorrar && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deletePresupuesto.mutate({ presupuestoId: p.id, pacienteId })}
                    disabled={deletePresupuesto.isPending}
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Eliminar
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal nuevo presupuesto */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Presupuesto</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Moneda + Fecha validez */}
            <div className="flex gap-4">
              <div className="space-y-1 flex-1">
                <Label>Moneda</Label>
                <Select value={moneda} onValueChange={(v) => setMoneda(v as "ARS" | "USD")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARS">ARS (Pesos)</SelectItem>
                    <SelectItem value="USD">USD (Dolares)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 flex-1">
                <Label htmlFor="fecha-validez">Valido hasta (opcional)</Label>
                <Input
                  id="fecha-validez"
                  type="date"
                  value={fechaValidez}
                  onChange={(e) => setFechaValidez(e.target.value)}
                />
              </div>
            </div>

            {/* Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Procedimientos</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-1" /> Agregar
                </Button>
              </div>

              {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <Input
                      placeholder="Nombre del procedimiento"
                      value={item.descripcion}
                      onChange={(e) => updateItem(index, "descripcion", e.target.value)}
                    />
                  </div>
                  <div className="w-36">
                    <Input
                      type="number"
                      placeholder={`Precio (${simbolo})`}
                      min={0}
                      value={item.precioTotal || ""}
                      onChange={(e) => updateItem(index, "precioTotal", e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Descuento */}
            <div className="space-y-2">
              <Label htmlFor="descuento">Descuento global (opcional)</Label>
              <Input
                id="descuento"
                type="number"
                placeholder="0"
                value={descuentos}
                onChange={(e) => setDescuentos(e.target.value)}
              />
            </div>

            {/* Totales */}
            <div className="border-t pt-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{simbolo} {subtotal.toLocaleString("es-AR")}</span>
              </div>
              {descuentoNum > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Descuento:</span>
                  <span>-{simbolo} {descuentoNum.toLocaleString("es-AR")}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-lg">
                <span>Total:</span>
                <span>{simbolo} {total.toLocaleString("es-AR")}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenModal(false)}>Cancelar</Button>
            <Button
              onClick={handleCreate}
              disabled={
                createPresupuesto.isPending ||
                items.every((i) => !i.descripcion.trim() || i.precioTotal <= 0)
              }
            >
              {createPresupuesto.isPending ? "Creando..." : "Crear Presupuesto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de envio */}
      {enviarModal && (
        <EnviarPresupuestoModal
          open={enviarModal.open}
          onClose={() => setEnviarModal(null)}
          presupuestoId={enviarModal.presupuestoId}
          pacienteId={pacienteId}
          pacienteEmail={pacienteEmail}
        />
      )}

      {/* PDF preview inline (CONTEXT.md: "inline, dentro de la plataforma") */}
      {pdfPreviewUrl && (
        <Dialog open={!!pdfPreviewUrl} onOpenChange={closePdfPreview}>
          <DialogContent className="max-w-4xl w-full h-[85vh] flex flex-col p-0">
            <DialogHeader className="px-4 pt-4 pb-2">
              <DialogTitle>Vista previa del presupuesto</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full border-0"
                title="Presupuesto PDF"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
