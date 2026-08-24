"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Loader2,
  XCircle,
  User,
  Heart,
  FileSignature,
  ClipboardList,
  MessageCircle,
  ShieldAlert,
} from "lucide-react";
import { setPortalToken } from "@/lib/portal-api";
import { usePortalDatos } from "@/hooks/usePortalDatos";
import { PortalInfoBasica } from "@/components/portal/PortalInfoBasica";
import { PortalSalud } from "@/components/portal/PortalSalud";
import { PortalConsultas } from "@/components/portal/PortalConsultas";
import { PortalConsentimiento } from "@/components/portal/PortalConsentimiento";
import { PortalIndicaciones } from "@/components/portal/PortalIndicaciones";

// ── State machine ────────────────────────────────────────────────────────────
type PageState = "loading" | "dni-gate" | "blocked" | "ready" | "error";

// ── Sections config ─────────────────────────────────────────────────────────
const SECCIONES = [
  { id: "info", label: "Info basica", icon: User },
  { id: "salud", label: "Salud", icon: Heart },
  { id: "consentimiento", label: "Consentimiento", icon: FileSignature },
  { id: "indicaciones", label: "Indicaciones", icon: ClipboardList },
  { id: "consultas", label: "Consultas", icon: MessageCircle },
];

export default function PortalPacientePage() {
  const { token } = useParams<{ token: string }>();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  // ── Page state ─────────────────────────────────────────────────────────────
  const [pageState, setPageState] = useState<PageState>("loading");
  const [blockedMessage, setBlockedMessage] = useState<string>("");

  // ── DNI gate ───────────────────────────────────────────────────────────────
  const [dni, setDni] = useState("");
  const [dniError, setDniError] = useState("");
  const [dniLoading, setDniLoading] = useState(false);

  // ── Active section tracker for "Paso X de 4" ──────────────────────────────
  const [activeSection, setActiveSection] = useState<string>("info");

  // ── Data hook (only enabled after DNI verified) ────────────────────────────
  const { data: portalDatos, isLoading: datosLoading } = usePortalDatos(
    pageState === "ready"
  );

  // ── Initial token validation (pre-verify, no personal data) ───────────────
  useEffect(() => {
    if (!token) return;
    fetch(`${apiUrl}/paciente-portal/public/${token}`)
      .then(async (res) => {
        if (res.status === 404 || !res.ok) {
          setPageState("error");
          return;
        }
        const body = await res.json();
        if (body.bloqueado) {
          setBlockedMessage(
            "Demasiados intentos. Volvé a intentar en unos minutos."
          );
          setPageState("blocked");
        } else {
          setPageState("dni-gate");
        }
      })
      .catch(() => setPageState("error"));
  }, [token, apiUrl]);

  // ── DNI verification handler ───────────────────────────────────────────────
  const handleVerificarDni = async () => {
    if (!dni.trim()) {
      setDniError("Ingresá tu DNI para continuar.");
      return;
    }
    setDniError("");
    setDniLoading(true);
    try {
      const res = await fetch(
        `${apiUrl}/paciente-portal/public/${token}/verificar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dni: dni.trim() }),
        }
      );

      if (res.status === 401) {
        setDniError("El DNI no coincide, fijate que esté bien.");
        return;
      }

      if (res.status === 429) {
        let msg = "Demasiados intentos. Volvé a intentar en unos minutos.";
        try {
          const body = await res.json();
          if (body?.retryAfter) {
            const mins = Math.ceil(body.retryAfter / 60);
            msg = `Demasiados intentos. Volvé a intentar en ${mins} minuto${mins !== 1 ? "s" : ""}.`;
          }
        } catch {
          // ignore parse error, use default message
        }
        setBlockedMessage(msg);
        setPageState("blocked");
        return;
      }

      if (!res.ok) {
        setDniError("Ocurrió un error. Intentá de nuevo más tarde.");
        return;
      }

      // Backend returns the portal JWT as a plain string
      const jwt: string = await res.text();
      setPortalToken(jwt.replace(/^"|"$/g, ""));
      setPageState("ready");
    } finally {
      setDniLoading(false);
    }
  };

  // ── Compute "Paso X de 4" ─────────────────────────────────────────────────
  const seccionIndex = SECCIONES.findIndex((s) => s.id === activeSection);
  const pasoActual = seccionIndex >= 0 ? seccionIndex + 1 : 1;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (pageState === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (pageState === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <XCircle className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="text-xl font-semibold text-gray-900">
          Link no válido
        </h1>
        <p className="text-gray-500 mt-2 text-base">
          El enlace puede estar vencido o ser incorrecto. Contactá a tu médico para obtener uno nuevo.
        </p>
      </div>
    );
  }

  // ── Blocked ──────────────────────────────────────────────────────────────
  if (pageState === "blocked") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <ShieldAlert className="w-12 h-12 text-amber-500 mb-4" />
        <h1 className="text-xl font-semibold text-gray-900">
          Acceso temporalmente bloqueado
        </h1>
        <p className="text-gray-600 mt-2 text-base max-w-sm">
          {blockedMessage ||
            "Demasiados intentos. Volvé a intentar en unos minutos."}
        </p>
        <p className="text-gray-400 mt-4 text-sm">
          Si tenés dudas, contactá a tu médico.
        </p>
      </div>
    );
  }

  // ── DNI Gate ─────────────────────────────────────────────────────────────
  if (pageState === "dni-gate") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-7 h-7 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Tu Portal de Salud
            </h1>
            <p className="text-gray-500 mt-2 text-base">
              Ingresá tu número de DNI para acceder a tu información
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-1">
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
                className={`text-base h-12 ${dniError ? "border-red-400" : ""}`}
              />
              {dniError && (
                <p className="text-sm text-red-600 mt-1">{dniError}</p>
              )}
            </div>
            <Button
              className="w-full h-12 text-base"
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

  // ── Ready — navigable view with 4 sections ────────────────────────────────
  if (datosLoading || !portalDatos) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Header: read-only patient info */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 text-center">
          Tu Portal de Salud
        </h1>
        <p className="text-gray-500 mt-1 text-base text-center">
          Hola,{" "}
          <span className="font-medium text-gray-700">
            {portalDatos.nombreCompleto}
          </span>
        </p>

        {/* Read-only summary badges */}
        <div className="mt-3 flex flex-wrap gap-2 justify-center text-sm">
          <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
            DNI: {portalDatos.dni}
          </span>
          {portalDatos.obraSocial && (
            <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">
              {portalDatos.obraSocial}
            </span>
          )}
          {portalDatos.proximaCirugia && (
            <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full">
              Próxima cirugía:{" "}
              {new Date(portalDatos.proximaCirugia.fecha).toLocaleDateString(
                "es-AR"
              )}{" "}
              — {portalDatos.proximaCirugia.procedimiento}
            </span>
          )}
        </div>
      </div>

      {/* Paso X de 4 — visual progress indicator, NOT a lock */}
      <div className="mb-4 flex items-center justify-between text-sm text-gray-400">
        <span>
          Paso{" "}
          <span className="font-semibold text-indigo-600">{pasoActual}</span>{" "}
          de{" "}
          <span className="font-semibold">{SECCIONES.length}</span>
        </span>
        <span className="text-gray-300">
          {SECCIONES.map((s, i) => (
            <span
              key={s.id}
              className={`inline-block w-2 h-2 rounded-full mx-0.5 ${
                i < pasoActual ? "bg-indigo-500" : "bg-gray-200"
              }`}
            />
          ))}
        </span>
      </div>

      {/* 4 sections — all accessible in any order (type="multiple") */}
      <Accordion
        type="multiple"
        defaultValue={["info"]}
        className="space-y-3"
        onValueChange={(vals) => {
          // Track the last opened section for "Paso X de 4"
          if (vals.length > 0) {
            setActiveSection(vals[vals.length - 1]);
          }
        }}
      >
        {/* 1. Info basica */}
        <AccordionItem
          value="info"
          className="border rounded-xl bg-white shadow-sm px-4"
        >
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-500" />
              <span className="font-semibold text-base">Info básica</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <PortalInfoBasica datos={portalDatos} />
          </AccordionContent>
        </AccordionItem>

        {/* 2. Salud */}
        <AccordionItem
          value="salud"
          className="border rounded-xl bg-white shadow-sm px-4"
        >
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500" />
              <span className="font-semibold text-base">Salud</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <PortalSalud salud={portalDatos.saludAutoReportada} />
          </AccordionContent>
        </AccordionItem>

        {/* 3. Consentimiento — placeholder (Phase 56) */}
        <AccordionItem
          value="consentimiento"
          className="border rounded-xl bg-white shadow-sm px-4"
        >
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-teal-500" />
              <span className="font-semibold text-base">Consentimiento</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <PortalConsentimiento />
          </AccordionContent>
        </AccordionItem>

        {/* 4. Indicaciones — separate from Consentimiento (INDIC-01) */}
        <AccordionItem
          value="indicaciones"
          className="border rounded-xl bg-white shadow-sm px-4"
        >
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-amber-500" />
              <span className="font-semibold text-base">Indicaciones</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <PortalIndicaciones />
          </AccordionContent>
        </AccordionItem>

        {/* 5. Consultas */}
        <AccordionItem
          value="consultas"
          className="border rounded-xl bg-white shadow-sm px-4"
        >
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-orange-500" />
              <span className="font-semibold text-base">Consultas</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <PortalConsultas />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
