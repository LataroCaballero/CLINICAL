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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

      {/* Section 3: Guía de configuración */}
      <Card>
        <CardHeader>
          <CardTitle>Guía de configuración</CardTitle>
          <CardDescription>
            Paso a paso para obtener el certificado digital y conectarte con AFIP/ARCA.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">

            <AccordionItem value="prereqs">
              <AccordionTrigger className="text-sm font-medium">
                Prerequisitos antes de empezar
              </AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                <p>Antes de generar el certificado, asegurate de tener:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>Clave Fiscal nivel 3</strong> en el portal de ARCA. Si tenés nivel 2 podés usar homologación, pero producción requiere nivel 3 (se obtiene en persona en una agencia AFIP).
                  </li>
                  <li>
                    <strong>OpenSSL instalado</strong> en tu computadora. En macOS y Linux viene preinstalado. En Windows podés descargarlo desde{" "}
                    <a
                      href="https://www.openssl.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      openssl.org
                    </a>
                    .
                  </li>
                  <li>
                    <strong>Para homologación:</strong> El servicio WSASS debe estar adherido con tu CUIT personal (persona física). No es delegable.
                  </li>
                  <li>
                    <strong>Para producción:</strong> El servicio "Administración de Certificados Digitales" debe estar disponible en tu usuario (ya sea propio o delegado por la empresa).
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step1-csr">
              <AccordionTrigger className="text-sm font-medium">
                Paso 1 — Generar la clave privada y el CSR
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  Estos comandos se ejecutan en la terminal de tu computadora. La clave privada que se genera aquí es permanente — guardala en un lugar seguro junto al certificado.
                </p>
                <div className="space-y-1">
                  <p className="font-medium">1a. Generar la clave privada RSA de 2048 bits:</p>
                  <pre className="bg-muted rounded p-3 text-xs font-mono overflow-x-auto">
                    openssl genrsa -out privada 2048
                  </pre>
                </div>
                <div className="space-y-1">
                  <p className="font-medium">1b. Generar el CSR (pedido de certificado):</p>
                  <pre className="bg-muted rounded p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
{`openssl req -new -key privada \\
  -subj "/C=AR/O=<nombre_empresa>/CN=<nombre_app>/serialNumber=CUIT <cuit>" \\
  -out pedido`}
                  </pre>
                  <p className="text-muted-foreground text-xs">
                    Reemplazá los campos entre <code>&lt; &gt;</code>:
                  </p>
                  <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                    <li><code>&lt;nombre_empresa&gt;</code> — nombre legal de la empresa (ej: <em>Mi Clinica S.A.</em>)</li>
                    <li><code>&lt;nombre_app&gt;</code> — nombre descriptivo del servidor (ej: <em>facturacion-server</em>)</li>
                    <li>
                      <code>&lt;cuit&gt;</code> — CUIT <strong>sin guiones</strong> precedido literalmente por la palabra{" "}
                      <code>CUIT</code> y un espacio (ej: <code>CUIT 30710955057</code>). Este formato es obligatorio.
                    </li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ejemplo completo para CUIT 30-71095505-7:
                  </p>
                  <pre className="bg-muted rounded p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
{`openssl req -new -key privada \\
  -subj "/C=AR/O=Mi Clinica SA/CN=facturacion-server/serialNumber=CUIT 30710955057" \\
  -out pedido`}
                  </pre>
                  <p className="text-muted-foreground text-xs">
                    El archivo generado <code>pedido</code> es el CSR que subís a ARCA. El archivo <code>privada</code> es tu clave privada — nunca lo compartas.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step2-cert">
              <AccordionTrigger className="text-sm font-medium">
                Paso 2 — Subir el CSR y descargar el certificado desde ARCA
              </AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                <ol className="list-decimal pl-5 space-y-2">
                  <li>
                    Ingresá a{" "}
                    <a
                      href="https://auth.afip.gob.ar/contribuyente_/login.xhtml"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      ARCA con Clave Fiscal
                    </a>
                    .
                  </li>
                  <li>
                    En <em>"Mis Servicios"</em>, buscá y abrí <strong>"Administración de Certificados Digitales"</strong>. Si no aparece, pedile al administrador de la empresa que te lo delegue.
                  </li>
                  <li>
                    Seleccioná la empresa (CUIT) para la que estás generando el certificado.
                  </li>
                  <li>
                    Hacé clic en <strong>"Agregar Alias"</strong>. Ingresá un nombre descriptivo (ej: <em>facturacion-1</em>) y subí el archivo <code>pedido</code> generado en el Paso 1.
                  </li>
                  <li>
                    Una vez procesado, hacé clic en <strong>"Ver"</strong> junto al alias creado y descargá el archivo <code>.crt</code> (certificado). Guardalo como <code>certificado.crt</code>.
                  </li>
                </ol>
                <p className="text-xs border-l-2 border-yellow-400 pl-3 text-yellow-700 bg-yellow-50 py-1 rounded">
                  El certificado tiene fecha de vencimiento. Cuando esta aplicación te avise que está por vencer, repetí este proceso con el mismo alias para renovarlo.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step3-associate">
              <AccordionTrigger className="text-sm font-medium">
                Paso 3 — Asociar el certificado al servicio de Facturación Electrónica (WSFEv1)
              </AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Este paso autoriza a tu certificado a operar con el web service de facturación electrónica.
                </p>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>
                    Desde el portal ARCA, abrí <strong>"Administrador de Relaciones de Clave Fiscal"</strong>.
                  </li>
                  <li>
                    Seleccioná la empresa (CUIT).
                  </li>
                  <li>
                    Hacé clic en <strong>"Nueva Relación"</strong>.
                  </li>
                  <li>
                    En el campo <em>"Servicio"</em>, buscá y seleccioná:{" "}
                    <strong>WebServices → Facturación Electrónica</strong>.
                  </li>
                  <li>
                    En el campo <em>"Representante"</em>, seleccioná tu alias desde el desplegable <strong>"Computador Fiscal"</strong> (ej: <em>facturacion-1</em>).
                  </li>
                  <li>
                    Confirmá. El sistema emite el formulario F3283/E como constancia. La autorización queda activa de inmediato.
                  </li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step4-upload">
              <AccordionTrigger className="text-sm font-medium">
                Paso 4 — Cargar el certificado en esta aplicación
              </AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Una vez que tenés el certificado descargado (<code>certificado.crt</code>) y tu clave privada (<code>privada</code>), abrí ambos archivos con un editor de texto y copiá el contenido completo de cada uno en los campos de arriba:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>Certificado PEM:</strong> contenido del archivo <code>certificado.crt</code> (empieza con <code>-----BEGIN CERTIFICATE-----</code>).
                  </li>
                  <li>
                    <strong>Clave privada:</strong> contenido del archivo <code>privada</code> (empieza con <code>-----BEGIN RSA PRIVATE KEY-----</code> o similar).
                  </li>
                  <li>
                    <strong>Punto de venta:</strong> el número de punto de venta electrónico habilitado en ARCA para tu empresa.
                  </li>
                  <li>
                    <strong>Ambiente:</strong> <em>Homologación</em> para pruebas, <em>Producción</em> para comprobantes reales ante AFIP.
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="homo-vs-prod">
              <AccordionTrigger className="text-sm font-medium">
                Diferencias entre Homologación y Producción
              </AccordionTrigger>
              <AccordionContent className="text-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted">
                        <th className="text-left p-2 border">Aspecto</th>
                        <th className="text-left p-2 border">Homologación (testing)</th>
                        <th className="text-left p-2 border">Producción</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr>
                        <td className="p-2 border font-medium text-foreground">Portal certificados</td>
                        <td className="p-2 border">WSASS (autogestionado, solo persona física)</td>
                        <td className="p-2 border">Administración de Certificados Digitales (delegable)</td>
                      </tr>
                      <tr>
                        <td className="p-2 border font-medium text-foreground">Comprobantes</td>
                        <td className="p-2 border">No válidos ante AFIP</td>
                        <td className="p-2 border">Válidos legalmente</td>
                      </tr>
                      <tr>
                        <td className="p-2 border font-medium text-foreground">Clave Fiscal requerida</td>
                        <td className="p-2 border">Nivel 2 (persona física)</td>
                        <td className="p-2 border">Nivel 3</td>
                      </tr>
                      <tr>
                        <td className="p-2 border font-medium text-foreground">WSAA endpoint</td>
                        <td className="p-2 border"><code>wsaahomo.afip.gov.ar</code></td>
                        <td className="p-2 border"><code>wsaa.afip.gov.ar</code></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="homo-adhesion">
              <AccordionTrigger className="text-sm font-medium">
                Homologación — cómo adherirse al servicio WSASS
              </AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  WSASS es el portal de autogestion de certificados para el ambiente de testing. Debe adherirse con el CUIT de una <strong>persona física</strong> (no empresa) y no es delegable.
                </p>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>
                    Ingresá a ARCA con Clave Fiscal <strong>personal</strong>.
                  </li>
                  <li>
                    Ir a <strong>"Administrador de Relaciones"</strong> → <strong>"Adherir Servicio"</strong>.
                  </li>
                  <li>
                    Buscá: <em>ARCA → Servicios Interactivos → WSASS - Autogestion Certificados Homologacion</em>.
                  </li>
                  <li>
                    Confirmá. Cerrá sesión y volvé a ingresar — el tile de WSASS aparecerá en "Mis Servicios".
                  </li>
                  <li>
                    Abrí WSASS y subí el archivo <code>pedido</code> generado en el Paso 1 para obtener el certificado de homologación.
                  </li>
                </ol>
                <p className="text-xs">
                  Soporte para homologación:{" "}
                  <a href="mailto:soporte-ws-testing@arca.gob.ar" className="text-blue-600 underline">
                    soporte-ws-testing@arca.gob.ar
                  </a>
                </p>
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </CardContent>
      </Card>

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
