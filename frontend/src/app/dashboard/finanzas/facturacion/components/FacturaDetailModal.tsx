"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Download, ExternalLink, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useFactura, useUpdateTipoCambio, useEmitirFactura } from "@/hooks/useFinanzas";
import { EstadoFactura } from "@/types/finanzas";
import { api } from "@/lib/api";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Format YYYYMMDD string (e.g. '20260330') → '30/03/2026' */
function formatAfipDate(yyyymmdd: string): string {
  if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd;
  return `${yyyymmdd.slice(6, 8)}/${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(0, 4)}`;
}

const ESTADO_BADGE: Record<EstadoFactura, { label: string; className: string }> = {
  [EstadoFactura.EMITIDA]: { label: "Emitida", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  [EstadoFactura.ANULADA]: { label: "Anulada", className: "bg-gray-100 text-gray-500 border-gray-200" },
  [EstadoFactura.EMISION_PENDIENTE]: { label: "Emitiendo...", className: "bg-amber-50 text-amber-700 border-amber-200" },
  [EstadoFactura.CAEA_PENDIENTE_INFORMAR]: { label: "CAEA Pendiente", className: "bg-orange-50 text-orange-700 border-orange-200" },
};

async function downloadFacturaPdf(facturaId: string, numero: string) {
  const response = await api.get(`/finanzas/facturas/${facturaId}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `factura-${numero}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function FacturaDetailModal({
  facturaId,
  open,
  onOpenChange,
}: {
  facturaId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: factura, isLoading } = useFactura(facturaId);
  const updateTipoCambio = useUpdateTipoCambio();
  const emitirFactura = useEmitirFactura();
  const [tipoCambioInput, setTipoCambioInput] = useState<string>("");
  const [isDownloading, setIsDownloading] = useState(false);

  // Sync tipoCambioInput when factura loads
  useEffect(() => {
    if (factura?.tipoCambio) {
      setTipoCambioInput(String(factura.tipoCambio));
    }
  }, [factura?.tipoCambio]);

  const handleSaveTipoCambio = async () => {
    if (!facturaId) return;
    const value = Number(tipoCambioInput);
    if (!value || value <= 0) {
      toast.error("Ingrese una cotización válida mayor a 0");
      return;
    }
    try {
      await updateTipoCambio.mutateAsync({ id: facturaId, tipoCambio: value });
      toast.success("Cotización actualizada correctamente");
    } catch {
      toast.error("Error al actualizar la cotización");
    }
  };

  const handleDownloadPdf = async () => {
    if (!facturaId || !factura) return;
    setIsDownloading(true);
    try {
      await downloadFacturaPdf(facturaId, factura.numero);
    } catch {
      toast.error("Error al descargar el PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isLoading ? (
              <Skeleton className="h-6 w-48" />
            ) : factura ? (
              `Factura #${factura.numero}`
            ) : (
              "Detalle de Comprobante"
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : factura ? (
          <div className="space-y-4 py-2">
            {/* Header: fecha + estado */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{formatDate(factura.fecha)}</span>
              <Badge variant="outline" className={ESTADO_BADGE[factura.estado].className}>
                {ESTADO_BADGE[factura.estado].label}
              </Badge>
            </div>

            <Separator />

            {/* Receptor */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Receptor</p>
              <p className="font-medium">
                {factura.razonSocial || factura.paciente?.nombreCompleto || "-"}
              </p>
              {factura.cuit && (
                <p className="text-sm text-gray-500">CUIT: {factura.cuit}</p>
              )}
            </div>

            <Separator />

            {/* Montos */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Montos</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatMoney(factura.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Impuestos</span>
                  <span>{formatMoney(factura.impuestos)}</span>
                </div>
                <div className="flex justify-between font-semibold pt-1 border-t">
                  <span>Total</span>
                  <span>{formatMoney(factura.total)}</span>
                </div>
              </div>
            </div>

            {/* AFIP section — only if CAE exists */}
            {factura.cae && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Datos AFIP</p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500">CAE</p>
                      <p className="font-mono text-sm bg-gray-50 px-2 py-1 rounded border select-all">
                        {factura.cae}
                      </p>
                    </div>
                    {factura.caeFchVto && (
                      <div>
                        <p className="text-xs text-gray-500">Vencimiento CAE</p>
                        <p className="text-sm font-medium">{formatAfipDate(factura.caeFchVto)}</p>
                      </div>
                    )}
                    {factura.qrImageDataUrl && (
                      <div className="flex flex-col items-center gap-1 pt-1">
                        <img
                          src={factura.qrImageDataUrl}
                          alt="Código QR AFIP"
                          className="w-24 h-24 border border-gray-200 rounded"
                        />
                        <p className="text-xs text-gray-400">Escanear para verificar en AFIP</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* USD section — only if moneda is USD */}
            {factura.moneda === 'USD' && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-amber-700">
                      Factura en USD — se requiere cotización BNA del día de emisión
                    </p>
                  </div>
                  <a
                    href="https://www.bna.com.ar/Home/Cotizaciones"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 underline text-sm"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Ver cotización en bna.com.ar
                  </a>
                  <div className="space-y-1">
                    <Label htmlFor="tipoCambio" className="text-sm">
                      Cotización BNA (ARS por USD)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="tipoCambio"
                        type="number"
                        min="0"
                        step="0.01"
                        value={tipoCambioInput}
                        onChange={(e) => setTipoCambioInput(e.target.value)}
                        placeholder="0.00"
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveTipoCambio}
                        disabled={updateTipoCambio.isPending}
                      >
                        {updateTipoCambio.isPending ? "Guardando..." : "Guardar"}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">
            No se pudo cargar el comprobante
          </div>
        )}

        {factura?.afipError && (
          factura.estado === EstadoFactura.EMISION_PENDIENTE ||
          factura.estado === EstadoFactura.CAEA_PENDIENTE_INFORMAR
        ) && (
          <>
            <Separator />
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mx-6 mb-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-700">Error de emisión AFIP</p>
                  <p className="text-sm text-red-600 mt-1">{factura.afipError}</p>
                </div>
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          {!factura?.cae && factura?.estado !== EstadoFactura.ANULADA && (
            <Button
              variant="default"
              onClick={() => emitirFactura.mutate(facturaId!)}
              disabled={
                emitirFactura.isPending ||
                factura?.estado === EstadoFactura.EMISION_PENDIENTE
              }
            >
              {factura?.estado === EstadoFactura.EMISION_PENDIENTE
                ? 'Emitiendo...'
                : emitirFactura.isPending
                ? 'Enviando...'
                : 'Emitir Comprobante'}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {factura?.cae && (
            <Button onClick={handleDownloadPdf} disabled={isDownloading}>
              <Download className="w-4 h-4 mr-2" />
              {isDownloading ? "Descargando..." : "Descargar PDF"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
