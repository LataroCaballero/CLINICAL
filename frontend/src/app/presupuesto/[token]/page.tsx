"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Calendar,
  FileText,
  ClipboardList,
  MessageCircleQuestion,
  ChevronDown,
} from "lucide-react";

interface PresupuestoPublico {
  id: string;
  total: number;
  subtotal: number;
  descuentos: number;
  moneda: string;
  fechaValidez?: string;
  estado: string;
  items: { descripcion: string; precioTotal: number }[];
  paciente: { nombreCompleto: string };
  profesional: { nombre: string };
  turno?: {
    inicio: string;
    fin: string;
    tipoTurno: { nombre: string };
    esCirugia: boolean;
  };
  instruccionesPre?: string;
  instruccionesPost?: string;
}

type PageState =
  | "loading"
  | "dni-gate"
  | "ready"
  | "confirming-accept"
  | "confirming-reject"
  | "accepted"
  | "rejected"
  | "error"
  | "already-processed";

const DUDAS_PREDEFINIDAS = [
  "¿Cuánto tiempo de recuperación voy a tener?",
  "¿Qué incluye exactamente el presupuesto?",
  "¿Hay posibilidad de pagar en cuotas?",
  "¿Cuáles son los riesgos de la cirugía?",
  "¿Necesito hacerme estudios previos?",
];

export default function PresupuestoPublicoPage() {
  const { token } = useParams<{ token: string }>();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  const [presupuesto, setPresupuesto] = useState<PresupuestoPublico | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // DNI gate
  const [dni, setDni] = useState("");
  const [dniError, setDniError] = useState("");
  const [dniLoading, setDniLoading] = useState(false);

  // Duda flow
  const [showDudaPanel, setShowDudaPanel] = useState(false);
  const [selectedDuda, setSelectedDuda] = useState<string | null>(null);
  const [otraConsulta, setOtraConsulta] = useState("");
  const [dudaSent, setDudaSent] = useState(false);
  const [dudaSubmitting, setDudaSubmitting] = useState(false);

  // Initial token validation (no personal data)
  useEffect(() => {
    if (!token) return;
    fetch(`${apiUrl}/presupuestos/public/${token}`)
      .then((res) => {
        if (res.status === 400) {
          setPageState("already-processed");
          return null;
        }
        if (!res.ok) {
          setPageState("error");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setPageState("dni-gate");
        // estado is available but we only need it post-DNI verification
      })
      .catch(() => setPageState("error"));
  }, [token, apiUrl]);

  const handleVerificarDni = async () => {
    if (!dni.trim()) {
      setDniError("Ingresa tu DNI para continuar");
      return;
    }
    setDniError("");
    setDniLoading(true);
    try {
      const res = await fetch(`${apiUrl}/presupuestos/public/${token}/verificar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni: dni.trim() }),
      });
      if (res.status === 401) {
        setDniError("DNI incorrecto. Verificá el número e intentá nuevamente.");
        return;
      }
      if (!res.ok) {
        setDniError("Ocurrió un error. Intentá más tarde.");
        return;
      }
      const data = await res.json();
      setPresupuesto(data);
      setPageState(data.estado === "ACEPTADO" ? "accepted" : "ready");
    } finally {
      setDniLoading(false);
    }
  };

  const handleAceptar = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/presupuestos/public/${token}/aceptar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setPageState("accepted");
      } else {
        setPageState("error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRechazar = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/presupuestos/public/${token}/rechazar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivoRechazo: motivoRechazo.trim() || undefined }),
      });
      if (res.ok) setPageState("rejected");
      else setPageState("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnviarDuda = async () => {
    const duda = selectedDuda === "otra" ? otraConsulta.trim() : selectedDuda;
    if (!duda) return;
    setDudaSubmitting(true);
    try {
      await fetch(`${apiUrl}/presupuestos/public/${token}/duda`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duda }),
      });
      setDudaSent(true);
      setShowDudaPanel(false);
    } finally {
      setDudaSubmitting(false);
    }
  };

  const simbolo = presupuesto?.moneda === "USD" ? "U$S" : "$";

  // ── Loading ────────────────────────────────────────────────────────────────
  if (pageState === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (pageState === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <XCircle className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="text-xl font-semibold text-gray-900">Presupuesto no encontrado</h1>
        <p className="text-gray-500 mt-2">El enlace puede estar expirado o ser incorrecto.</p>
      </div>
    );
  }

  // ── Already processed ──────────────────────────────────────────────────────
  if (pageState === "already-processed") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <Badge className="mb-4 text-sm px-4 py-2">Presupuesto procesado</Badge>
        <h1 className="text-xl font-semibold text-gray-900">Este presupuesto ya fue respondido</h1>
        <p className="text-gray-500 mt-2">No es necesario realizar ninguna acción adicional.</p>
      </div>
    );
  }

  // ── Rejected ───────────────────────────────────────────────────────────────
  if (pageState === "rejected") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <XCircle className="w-16 h-16 text-gray-400 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900">Presupuesto rechazado</h1>
        <p className="text-gray-600 mt-3 max-w-sm">
          Hemos recibido su respuesta. Si tiene alguna duda o desea reconsiderar, puede comunicarse directamente con la clinica.
        </p>
      </div>
    );
  }

  // ── DNI Gate ───────────────────────────────────────────────────────────────
  if (pageState === "dni-gate") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Portal del Paciente</h1>
            <p className="text-gray-500 mt-2 text-sm">
              Ingresa tu número de DNI para acceder a tu presupuesto
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de DNI
              </label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Ej: 35123456"
                value={dni}
                onChange={(e) => {
                  setDni(e.target.value);
                  setDniError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleVerificarDni()}
                className={dniError ? "border-red-400" : ""}
              />
              {dniError && (
                <p className="text-sm text-red-600 mt-1">{dniError}</p>
              )}
            </div>
            <Button
              className="w-full h-11"
              onClick={handleVerificarDni}
              disabled={dniLoading}
            >
              {dniLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Continuar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main portal (ready / confirming-accept / confirming-reject / accepted) ─
  const accordionDefault = ["presupuesto"];

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tu Portal de Salud</h1>
        <p className="text-gray-500 mt-1">
          Hola, <span className="font-medium text-gray-700">{presupuesto?.paciente.nombreCompleto}</span>
        </p>
      </div>

      {/* Duda sent confirmation */}
      {dudaSent && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <CheckCircle className="w-5 h-5 text-green-600 inline mr-2" />
          <span className="text-green-800 text-sm font-medium">
            Tu consulta fue recibida. Te responderemos pronto.
          </span>
        </div>
      )}

      <Accordion type="multiple" defaultValue={accordionDefault} className="space-y-3">
        {/* ── Presupuesto ── */}
        <AccordionItem value="presupuesto" className="border rounded-xl bg-white shadow-sm px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              <span className="font-semibold">Tu Presupuesto</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            {/* Items */}
            <div className="space-y-2 mb-4">
              {presupuesto?.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-gray-700 text-sm">{item.descripcion}</span>
                  <span className="font-medium text-sm">
                    {simbolo} {item.precioTotal.toLocaleString("es-AR")}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t pt-3 space-y-1">
              {(presupuesto?.descuentos ?? 0) > 0 && (
                <>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span>{simbolo} {(presupuesto?.subtotal ?? 0).toLocaleString("es-AR")}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Descuento</span>
                    <span>- {simbolo} {(presupuesto?.descuentos ?? 0).toLocaleString("es-AR")}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span>{simbolo} {(presupuesto?.total ?? 0).toLocaleString("es-AR")}</span>
              </div>
              {presupuesto?.fechaValidez && (
                <p className="text-xs text-amber-600 pt-1">
                  Valido hasta: {new Date(presupuesto.fechaValidez).toLocaleDateString("es-AR")}
                </p>
              )}
            </div>

            {/* Accepted banner */}
            {pageState === "accepted" && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                <div>
                  <p className="text-green-800 font-medium text-sm">Presupuesto aceptado</p>
                  <p className="text-green-700 text-xs mt-0.5">
                    El equipo se pondrá en contacto para coordinar la fecha.
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            {pageState === "ready" && (
              <div className="mt-5 space-y-3">
                <Button
                  className="w-full h-11 text-sm bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => setPageState("confirming-accept")}
                  disabled={isSubmitting}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aceptar Presupuesto
                  <ChevronDown className="w-4 h-4 ml-auto" />
                </Button>

                <Button
                  className="w-full h-11 text-sm bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={() => { setShowDudaPanel(true); setSelectedDuda(null); setOtraConsulta(""); }}
                  disabled={isSubmitting}
                >
                  <MessageCircleQuestion className="w-4 h-4 mr-2" />
                  Tengo una duda
                  <ChevronDown className="w-4 h-4 ml-auto" />
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-11 text-sm border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => setPageState("confirming-reject")}
                  disabled={isSubmitting}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rechazar
                  <ChevronDown className="w-4 h-4 ml-auto" />
                </Button>
              </div>
            )}

            {/* Accept confirmation */}
            {pageState === "confirming-accept" && (
              <div className="mt-4 space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-800 mb-1 text-sm">¿Confirmás que aceptás el presupuesto?</h3>
                  <p className="text-green-700 text-xs">
                    Al confirmar, el equipo se pondrá en contacto para coordinar la fecha del procedimiento.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setPageState("ready")}
                    disabled={isSubmitting}
                  >
                    Volver
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleAceptar}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar"}
                  </Button>
                </div>
              </div>
            )}

            {/* Duda panel */}
            {pageState === "ready" && showDudaPanel && (
              <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-orange-900">¿Cuál es tu consulta?</p>
                <div className="space-y-2">
                  {DUDAS_PREDEFINIDAS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setSelectedDuda(d)}
                      className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors ${
                        selectedDuda === d
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-white text-gray-700 border-gray-200 hover:border-orange-300"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedDuda("otra")}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors ${
                      selectedDuda === "otra"
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-white text-gray-700 border-gray-200 hover:border-orange-300"
                    }`}
                  >
                    Otra consulta...
                  </button>
                  {selectedDuda === "otra" && (
                    <Textarea
                      placeholder="Escribí tu consulta aquí..."
                      value={otraConsulta}
                      onChange={(e) => setOtraConsulta(e.target.value)}
                      rows={3}
                      className="bg-white"
                    />
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setShowDudaPanel(false)}
                    disabled={dudaSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-orange-500 hover:bg-orange-600"
                    onClick={handleEnviarDuda}
                    disabled={
                      dudaSubmitting ||
                      !selectedDuda ||
                      (selectedDuda === "otra" && !otraConsulta.trim())
                    }
                  >
                    {dudaSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Enviar consulta"}
                  </Button>
                </div>
              </div>
            )}

            {/* Reject confirmation */}
            {pageState === "confirming-reject" && (
              <div className="mt-4 space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-medium text-red-800 mb-2 text-sm">Por que rechaza el presupuesto?</h3>
                  <Textarea
                    placeholder="Puede escribir el motivo aqui (opcional)..."
                    value={motivoRechazo}
                    onChange={(e) => setMotivoRechazo(e.target.value)}
                    rows={3}
                    className="bg-white"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setPageState("ready")}
                    disabled={isSubmitting}
                  >
                    Volver
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleRechazar}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Procesando..." : "Confirmar Rechazo"}
                  </Button>
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* ── Turno ── */}
        {presupuesto?.turno && (
          <AccordionItem value="turno" className="border rounded-xl bg-white shadow-sm px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <span className="font-semibold">Tu Turno</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 text-sm text-gray-700">
                <div>
                  <span className="text-gray-500">Fecha y hora: </span>
                  <span className="font-medium">
                    {new Date(presupuesto.turno.inicio).toLocaleString("es-AR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Procedimiento: </span>
                  <span className="font-medium">{presupuesto.turno.tipoTurno.nombre}</span>
                </div>
                {presupuesto.turno.esCirugia && (
                  <Badge variant="outline" className="text-xs border-indigo-300 text-indigo-700">
                    Cirugía
                  </Badge>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* ── Indicaciones Previas ── */}
        {presupuesto?.instruccionesPre && (
          <AccordionItem value="pre" className="border rounded-xl bg-white shadow-sm px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-indigo-500" />
                <span className="font-semibold">Indicaciones Previas</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {presupuesto.instruccionesPre}
              </p>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* ── Indicaciones Posteriores ── */}
        {presupuesto?.instruccionesPost && (
          <AccordionItem value="post" className="border rounded-xl bg-white shadow-sm px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-indigo-500" />
                <span className="font-semibold">Indicaciones Posteriores</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {presupuesto.instruccionesPost}
              </p>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}
