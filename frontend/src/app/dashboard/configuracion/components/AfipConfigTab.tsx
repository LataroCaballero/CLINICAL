"use client";

import { useState } from "react";
import { useAfipConfig } from "@/hooks/useAfipConfig";
import { useSaveCert } from "@/hooks/useSaveCert";
import { useSaveBillingConfig } from "@/hooks/useSaveBillingConfig";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { CertStatus } from "@/types/afip";

function CertBadge({ certStatus, daysUntilExpiry }: { certStatus: CertStatus; daysUntilExpiry?: number }) {
  return (
    <Badge
      className={
        certStatus === "OK"
          ? "bg-green-600 hover:bg-green-600 text-white"
          : certStatus === "EXPIRING_SOON"
          ? "bg-yellow-500 hover:bg-yellow-500 text-white"
          : "bg-red-600 hover:bg-red-600 text-white"
      }
    >
      {certStatus === "OK" && "Certificado activo"}
      {certStatus === "EXPIRING_SOON" && `Vence en ${daysUntilExpiry}d`}
      {certStatus === "EXPIRED" && "Certificado vencido"}
    </Badge>
  );
}

export default function AfipConfigTab() {
  const { data: status, isLoading } = useAfipConfig();
  const saveCert = useSaveCert();
  const saveBilling = useSaveBillingConfig();

  // Cert section state
  const [isEditingCert, setIsEditingCert] = useState(false);
  const [certPem, setCertPem] = useState("");
  const [keyPem, setKeyPem] = useState("");
  const [certPtoVta, setCertPtoVta] = useState("");
  const [certAmbiente, setCertAmbiente] = useState<"HOMOLOGACION" | "PRODUCCION">("HOMOLOGACION");
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Billing section state
  const [billingPtoVta, setBillingPtoVta] = useState("");
  const [billingAmbiente, setBillingAmbiente] = useState<"HOMOLOGACION" | "PRODUCCION">("HOMOLOGACION");

  const handleOpenPreview = () => {
    if (!certPem.trim() || !keyPem.trim() || !certPtoVta) {
      toast.error("Completá todos los campos antes de continuar.");
      return;
    }
    setShowPreviewModal(true);
  };

  const handleConfirmSaveCert = () => {
    saveCert.mutate(
      {
        certPem: certPem.trim(),
        keyPem: keyPem.trim(),
        ptoVta: parseInt(certPtoVta, 10),
        ambiente: certAmbiente,
      },
      {
        onSuccess: () => {
          toast.success("Certificado guardado correctamente.");
          setShowPreviewModal(false);
          setIsEditingCert(false);
          setCertPem("");
          setKeyPem("");
          setCertPtoVta("");
          setCertAmbiente("HOMOLOGACION");
        },
        onError: (error: unknown) => {
          const axiosError = error as {
            response?: { data?: { message?: string } };
            message?: string;
          };
          const mensaje =
            axiosError?.response?.data?.message ||
            axiosError?.message ||
            "Error al validar el certificado con AFIP.";
          setShowPreviewModal(false);
          toast.error(mensaje);
        },
      }
    );
  };

  const handleSaveBilling = () => {
    if (!billingPtoVta) {
      toast.error("Ingresá el punto de venta.");
      return;
    }
    saveBilling.mutate(
      {
        ptoVta: parseInt(billingPtoVta, 10),
        ambiente: billingAmbiente,
      },
      {
        onSuccess: () => {
          toast.success("Configuración de facturación guardada correctamente.");
        },
        onError: (error: unknown) => {
          const axiosError = error as {
            response?: { data?: { message?: string } };
            message?: string;
          };
          const mensaje =
            axiosError?.response?.data?.message ||
            axiosError?.message ||
            "Error al guardar la configuración de facturación.";
          toast.error(mensaje);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AFIP</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Cargando configuración...</p>
        </CardContent>
      </Card>
    );
  }

  const showCertStatusView = status?.configured && !isEditingCert;
  const showBillingSection = status?.configured || isEditingCert;

  return (
    <div className="space-y-6">
      {/* Section 1: Certificado */}
      <Card>
        <CardHeader>
          <CardTitle>Certificado AFIP</CardTitle>
          <CardDescription>
            Cargá el certificado digital y la clave privada para firmar los comprobantes electrónicos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {showCertStatusView ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-gray-200 bg-gray-50 space-y-3">
                <div className="flex items-center gap-2">
                  <CertBadge
                    certStatus={status.certStatus}
                    daysUntilExpiry={status.daysUntilExpiry}
                  />
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {status.cuit && (
                    <div>
                      <span className="text-muted-foreground">CUIT:</span>{" "}
                      <span className="font-medium">{status.cuit}</span>
                    </div>
                  )}
                  {status.ptoVta !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Punto de venta:</span>{" "}
                      <span className="font-medium">{status.ptoVta}</span>
                    </div>
                  )}
                  {status.ambiente && (
                    <div>
                      <span className="text-muted-foreground">Ambiente:</span>{" "}
                      <span className="font-medium">
                        {status.ambiente === "PRODUCCION" ? "Producción" : "Homologación"}
                      </span>
                    </div>
                  )}
                  {status.certExpiresAt && (
                    <div>
                      <span className="text-muted-foreground">Vencimiento:</span>{" "}
                      <span className="font-medium">
                        {new Date(status.certExpiresAt).toLocaleDateString("es-AR")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingCert(true)}
              >
                Actualizar certificado
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="certPem">Certificado PEM (-----BEGIN CERTIFICATE-----...)</Label>
                <Textarea
                  id="certPem"
                  placeholder={"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"}
                  value={certPem}
                  onChange={(e) => setCertPem(e.target.value)}
                  rows={6}
                  className="font-mono text-xs"
                  disabled={saveCert.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="keyPem">Clave privada (-----BEGIN PRIVATE KEY-----...)</Label>
                <Textarea
                  id="keyPem"
                  placeholder={"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"}
                  value={keyPem}
                  onChange={(e) => setKeyPem(e.target.value)}
                  rows={6}
                  className="font-mono text-xs"
                  disabled={saveCert.isPending}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="certPtoVta">Punto de venta</Label>
                  <Input
                    id="certPtoVta"
                    type="number"
                    placeholder="Ej: 1"
                    value={certPtoVta}
                    onChange={(e) => setCertPtoVta(e.target.value)}
                    min={1}
                    disabled={saveCert.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="certAmbiente">Ambiente</Label>
                  <Select
                    value={certAmbiente}
                    onValueChange={(v) => setCertAmbiente(v as "HOMOLOGACION" | "PRODUCCION")}
                    disabled={saveCert.isPending}
                  >
                    <SelectTrigger id="certAmbiente">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HOMOLOGACION">Homologación</SelectItem>
                      <SelectItem value="PRODUCCION">Producción</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleOpenPreview} disabled={saveCert.isPending}>
                  Guardar certificado
                </Button>
                {status?.configured && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsEditingCert(false);
                      setCertPem("");
                      setKeyPem("");
                    }}
                    disabled={saveCert.isPending}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Configuración de facturación */}
      {showBillingSection && (
        <Card>
          <CardHeader>
            <CardTitle>Configuración de facturación</CardTitle>
            <CardDescription>
              Actualizá el punto de venta y ambiente sin necesidad de volver a cargar el certificado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billingPtoVta">Punto de venta</Label>
                <Input
                  id="billingPtoVta"
                  type="number"
                  placeholder={status?.ptoVta?.toString() ?? "Ej: 1"}
                  value={billingPtoVta}
                  onChange={(e) => setBillingPtoVta(e.target.value)}
                  min={1}
                  disabled={saveBilling.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingAmbiente">Ambiente</Label>
                <Select
                  value={billingAmbiente}
                  onValueChange={(v) => setBillingAmbiente(v as "HOMOLOGACION" | "PRODUCCION")}
                  disabled={saveBilling.isPending}
                >
                  <SelectTrigger id="billingAmbiente">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HOMOLOGACION">Homologación</SelectItem>
                    <SelectItem value="PRODUCCION">Producción</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSaveBilling} disabled={saveBilling.isPending}>
              {saveBilling.isPending ? "Validando con AFIP..." : "Guardar configuración"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Preview/confirm modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar carga del certificado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-start gap-2">
              <span className="text-sm text-muted-foreground">Ambiente seleccionado:</span>
              <Badge
                className={
                  certAmbiente === "PRODUCCION"
                    ? "bg-red-600 hover:bg-red-600 text-white text-base px-4 py-1"
                    : "bg-blue-600 hover:bg-blue-600 text-white text-base px-4 py-1"
                }
              >
                {certAmbiente === "PRODUCCION" ? "PRODUCCIÓN" : "HOMOLOGACIÓN"}
              </Badge>
            </div>
            <div className="text-sm text-gray-700 space-y-1">
              <div>
                <span className="text-muted-foreground">Punto de venta:</span>{" "}
                <span className="font-medium">{certPtoVta}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Certificado:</span>{" "}
                <span className="font-mono text-xs text-gray-500">
                  {certPem.trim().slice(0, 60)}...
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground border-l-2 border-gray-300 pl-3">
              El CUIT y la fecha de vencimiento serán extraídos automáticamente del certificado por el servidor.
            </p>
            {certAmbiente === "PRODUCCION" && (
              <p className="text-xs text-red-600 font-medium border-l-2 border-red-400 pl-3">
                Atención: estás cargando un certificado de PRODUCCIÓN. Los comprobantes generados serán válidos ante AFIP.
              </p>
            )}
          </div>
          <DialogFooter>
            {saveCert.isPending ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                Validando con AFIP...
              </div>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowPreviewModal(false)}
                  disabled={saveCert.isPending}
                >
                  Cancelar
                </Button>
                <Button onClick={handleConfirmSaveCert} disabled={saveCert.isPending}>
                  Confirmar y guardar
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
