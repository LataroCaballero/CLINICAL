"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Filter, X } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Agrupacion } from "@/types/reportes";

export interface FiltrosValues {
  fechaDesde?: string;
  fechaHasta?: string;
  agrupacion?: Agrupacion;
}

interface FiltrosReporteProps {
  onFilterChange: (filters: FiltrosValues) => void;
  showAgrupacion?: boolean;
  defaultPeriodo?: string;
}

const PERIODOS_PRESET = [
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "90d", label: "Últimos 90 días" },
  { value: "mes_actual", label: "Mes actual" },
  { value: "mes_anterior", label: "Mes anterior" },
  { value: "custom", label: "Personalizado" },
];

export function FiltrosReporte({
  onFilterChange,
  showAgrupacion = false,
  defaultPeriodo = "30d",
}: FiltrosReporteProps) {
  const [periodo, setPeriodo] = useState(defaultPeriodo);
  const [agrupacion, setAgrupacion] = useState<Agrupacion>("dia");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const calcularFechas = (periodoValue: string): { desde: string; hasta: string } => {
    const hoy = new Date();
    let desde: Date;
    let hasta: Date = hoy;

    switch (periodoValue) {
      case "7d":
        desde = subDays(hoy, 7);
        break;
      case "30d":
        desde = subDays(hoy, 30);
        break;
      case "90d":
        desde = subDays(hoy, 90);
        break;
      case "mes_actual":
        desde = startOfMonth(hoy);
        hasta = endOfMonth(hoy);
        break;
      case "mes_anterior":
        const mesAnterior = subMonths(hoy, 1);
        desde = startOfMonth(mesAnterior);
        hasta = endOfMonth(mesAnterior);
        break;
      default:
        desde = subDays(hoy, 30);
    }

    return {
      desde: format(desde, "yyyy-MM-dd"),
      hasta: format(hasta, "yyyy-MM-dd"),
    };
  };

  const handlePeriodoChange = (value: string) => {
    setPeriodo(value);
    if (value !== "custom") {
      const { desde, hasta } = calcularFechas(value);
      setFechaDesde(desde);
      setFechaHasta(hasta);
      onFilterChange({
        fechaDesde: desde,
        fechaHasta: hasta,
        agrupacion: showAgrupacion ? agrupacion : undefined,
      });
    }
  };

  const handleAgrupacionChange = (value: Agrupacion) => {
    setAgrupacion(value);
    const { desde, hasta } = periodo !== "custom"
      ? calcularFechas(periodo)
      : { desde: fechaDesde, hasta: fechaHasta };

    onFilterChange({
      fechaDesde: desde,
      fechaHasta: hasta,
      agrupacion: value,
    });
  };

  const handleFechaChange = (tipo: "desde" | "hasta", value: string) => {
    if (tipo === "desde") {
      setFechaDesde(value);
    } else {
      setFechaHasta(value);
    }

    if (periodo === "custom") {
      const desde = tipo === "desde" ? value : fechaDesde;
      const hasta = tipo === "hasta" ? value : fechaHasta;

      if (desde && hasta) {
        onFilterChange({
          fechaDesde: desde,
          fechaHasta: hasta,
          agrupacion: showAgrupacion ? agrupacion : undefined,
        });
      }
    }
  };

  const handleLimpiar = () => {
    setPeriodo("30d");
    setAgrupacion("dia");
    const { desde, hasta } = calcularFechas("30d");
    setFechaDesde(desde);
    setFechaHasta(hasta);
    onFilterChange({
      fechaDesde: desde,
      fechaHasta: hasta,
      agrupacion: showAgrupacion ? "dia" : undefined,
    });
  };

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtros:</span>
          </div>

          {/* Selector de período */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <Select value={periodo} onValueChange={handlePeriodoChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Seleccionar período" />
              </SelectTrigger>
              <SelectContent>
                {PERIODOS_PRESET.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fechas personalizadas */}
          {periodo === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => handleFechaChange("desde", e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              />
              <span className="text-gray-400">-</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => handleFechaChange("hasta", e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              />
            </div>
          )}

          {/* Selector de agrupación */}
          {showAgrupacion && (
            <Select value={agrupacion} onValueChange={handleAgrupacionChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Agrupar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dia">Por día</SelectItem>
                <SelectItem value="semana">Por semana</SelectItem>
                <SelectItem value="mes">Por mes</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Botón limpiar */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLimpiar}
            className="text-gray-500"
          >
            <X className="w-4 h-4 mr-1" />
            Limpiar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
