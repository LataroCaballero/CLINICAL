"use client";

import { useState } from "react";
import { useProfessionalContext } from "@/store/professional-context.store";
import {
  usePracticasPendientesAgrupadas,
  useLimiteDisponible,
  useSetLimiteMensual,
  type PracticaPendienteAgrupada,
} from "@/hooks/useFacturadorDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, AlertTriangle, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useAfipConfig } from "@/hooks/useAfipConfig";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function FacturadorPage() {
  const { selectedProfessionalId } = useProfessionalContext();
  const [mesActual] = useState(() => new Date().toISOString().slice(0, 7));
  const [limiteInput, setLimiteInput] = useState("");

  const { data: agrupadas, isLoading: loadingAgrupadas } =
    usePracticasPendientesAgrupadas(selectedProfessionalId);
  const { data: limiteData, isLoading: loadingLimite } =
    useLimiteDisponible(selectedProfessionalId, mesActual);
  const setLimite = useSetLimiteMensual();
  const { data: afipConfig } = useAfipConfig();

  // Empty state when no professional selected
  if (!selectedProfessionalId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-gray-400">
        <Building2 className="h-12 w-12" />
        <p className="text-lg font-medium">Seleccioná un profesional en la barra lateral para ver los KPIs</p>
      </div>
    );
  }

  // Progress bar calculations
  const limite = limiteData?.limite ?? null;
  const emitido = limiteData?.emitido ?? 0;
  const disponible = limiteData?.disponible ?? null;
  const pct = limite && limite > 0 ? Math.min((emitido / limite) * 100, 100) : 0;
  const overLimit = disponible !== null && disponible < 0;

  const handleSaveLimite = () => {
    const parsed = parseFloat(limiteInput.replace(/[^0-9.]/g, ""));
    if (isNaN(parsed) || parsed <= 0) return;
    setLimite.mutate({
      profesionalId: selectedProfessionalId,
      mes: mesActual,
      limite: parsed,
    });
    setLimiteInput("");
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900">Panel de Facturación</h1>
      <p className="text-sm text-gray-500">Período: {mesActual}</p>

      {afipConfig?.configured && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Certificado AFIP:</span>
          <Badge
            className={
              afipConfig.certStatus === "OK"
                ? "bg-green-600 hover:bg-green-600 text-white"
                : afipConfig.certStatus === "EXPIRING_SOON"
                ? "bg-yellow-500 hover:bg-yellow-500 text-white"
                : "bg-red-600 hover:bg-red-600 text-white"
            }
          >
            {afipConfig.certStatus === "OK" && "Certificado activo"}
            {afipConfig.certStatus === "EXPIRING_SOON" && `Vence en ${afipConfig.daysUntilExpiry}d`}
            {afipConfig.certStatus === "EXPIRED" && "Certificado vencido"}
          </Badge>
        </div>
      )}

      {/* DASH-02: Prácticas pendientes por obra social */}
      <section>
        <h2 className="text-lg font-medium text-gray-700 mb-3">Prácticas pendientes por obra social</h2>
        {loadingAgrupadas ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : !agrupadas || agrupadas.length === 0 ? (
          <p className="text-gray-400 text-sm">Sin prácticas pendientes de liquidación.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agrupadas.map((grupo: PracticaPendienteAgrupada) => (
              <Link
                key={grupo.obraSocialId}
                href={`/dashboard/facturador/liquidar/${grupo.obraSocialId}?nombre=${encodeURIComponent(grupo.nombre)}`}
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
                      <span className="truncate">{grupo.nombre}</span>
                      <Badge variant="secondary">{grupo.count} práct.</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold text-gray-900">{formatMoney(grupo.total)}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* DASH-03 + partial DASH-04: Límite mensual progress */}
      <section>
        <h2 className="text-lg font-medium text-gray-700 mb-3">Límite mensual</h2>
        <Card>
          <CardContent className="pt-6 space-y-4">
            {loadingLimite ? (
              <div className="h-16 bg-gray-100 animate-pulse rounded" />
            ) : (
              <>
                {overLimit && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Límite superado. Disponible: {formatMoney(disponible!)}
                    </AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Emitido: <strong>{formatMoney(emitido)}</strong></span>
                    <span>Límite: <strong>{limite !== null ? formatMoney(limite) : "Sin configurar"}</strong></span>
                  </div>
                  <Progress value={pct} className={overLimit ? "bg-red-100" : undefined} />
                  <div className="flex items-center gap-1.5 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className={disponible !== null && disponible >= 0 ? "text-green-700 font-medium" : "text-red-600 font-medium"}>
                      Disponible: {disponible !== null ? formatMoney(disponible) : "—"}
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {/* LMIT-01: Set monthly limit */}
      <section>
        <h2 className="text-lg font-medium text-gray-700 mb-3">Configurar límite del mes</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-3 items-center max-w-sm">
              <Input
                type="number"
                placeholder="Ingresá el límite (ARS)"
                value={limiteInput}
                onChange={(e) => setLimiteInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveLimite()}
                min={0}
              />
              <Button
                onClick={handleSaveLimite}
                disabled={setLimite.isPending || !limiteInput}
              >
                {setLimite.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Ingresá el valor que te indicó el contador para {mesActual}.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
