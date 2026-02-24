"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

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
}

type PageState = "loading" | "ready" | "confirming-reject" | "accepted" | "rejected" | "error" | "already-processed";

export default function PresupuestoPublicoPage() {
  const { token } = useParams<{ token: string }>();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  const [presupuesto, setPresupuesto] = useState<PresupuestoPublico | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        if (data) {
          setPresupuesto(data);
          setPageState("ready");
        }
      })
      .catch(() => setPageState("error"));
  }, [token, apiUrl]);

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
      if (res.ok) {
        setPageState("rejected");
      } else {
        setPageState("error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const simbolo = presupuesto?.moneda === "USD" ? "U$S" : "$";

  if (pageState === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <XCircle className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="text-xl font-semibold text-gray-900">Presupuesto no encontrado</h1>
        <p className="text-gray-500 mt-2">El enlace puede estar expirado o ser incorrecto.</p>
      </div>
    );
  }

  if (pageState === "already-processed") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <Badge className="mb-4 text-sm px-4 py-2">Presupuesto procesado</Badge>
        <h1 className="text-xl font-semibold text-gray-900">Este presupuesto ya fue respondido</h1>
        <p className="text-gray-500 mt-2">No es necesario realizar ninguna acción adicional.</p>
      </div>
    );
  }

  if (pageState === "accepted") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900">Presupuesto aceptado!</h1>
        <p className="text-gray-600 mt-3 max-w-sm">
          Gracias por confirmar. El equipo de la clinica se pondra en contacto con usted a la brevedad para coordinar la fecha de la cirugia.
        </p>
      </div>
    );
  }

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

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Presupuesto Medico</h1>
        <p className="text-gray-500 mt-1">Estimado/a {presupuesto?.paciente.nombreCompleto}</p>
        {presupuesto?.fechaValidez && (
          <p className="text-sm text-amber-600 mt-1">
            Valido hasta: {new Date(presupuesto.fechaValidez).toLocaleDateString("es-AR")}
          </p>
        )}
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Procedimientos
        </h2>
        <div className="space-y-3">
          {presupuesto?.items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center">
              <span className="text-gray-700">{item.descripcion}</span>
              <span className="font-medium">
                {simbolo} {item.precioTotal.toLocaleString("es-AR")}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t pt-4 mt-4 space-y-2">
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
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>{simbolo} {(presupuesto?.total ?? 0).toLocaleString("es-AR")}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      {pageState === "ready" && (
        <div className="space-y-3">
          <Button
            className="w-full h-12 text-base"
            onClick={handleAceptar}
            disabled={isSubmitting}
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            {isSubmitting ? "Procesando..." : "Aceptar Presupuesto"}
          </Button>

          <Button
            variant="outline"
            className="w-full h-12 text-base border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => setPageState("confirming-reject")}
            disabled={isSubmitting}
          >
            <XCircle className="w-5 h-5 mr-2" />
            Rechazar
          </Button>
        </div>
      )}

      {/* Reject confirmation */}
      {pageState === "confirming-reject" && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-medium text-red-800 mb-2">Por que rechaza el presupuesto?</h3>
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
    </div>
  );
}
