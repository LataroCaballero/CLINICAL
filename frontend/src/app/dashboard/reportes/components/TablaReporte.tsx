"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ColumnDef<T> {
  key: keyof T | string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}

interface TablaReporteProps<T> {
  titulo?: string;
  subtitulo?: string;
  columnas: ColumnDef<T>[];
  datos: T[];
  loading?: boolean;
  emptyMessage?: string;
  maxRows?: number;
}

export function TablaReporte<T extends Record<string, any>>({
  titulo,
  subtitulo,
  columnas,
  datos,
  loading = false,
  emptyMessage = "No hay datos disponibles",
  maxRows,
}: TablaReporteProps<T>) {
  const datosLimitados = maxRows ? datos.slice(0, maxRows) : datos;

  const getNestedValue = (obj: T, path: string): any => {
    return path.split(".").reduce((acc, part) => acc?.[part], obj);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-2 p-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      );
    }

    if (datos.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          {emptyMessage}
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            {columnas.map((col) => (
              <TableHead
                key={col.key.toString()}
                className={cn(
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center",
                  col.className
                )}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {datosLimitados.map((row, index) => (
            <TableRow key={index}>
              {columnas.map((col) => {
                const value = getNestedValue(row, col.key.toString());
                return (
                  <TableCell
                    key={col.key.toString()}
                    className={cn(
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      col.className
                    )}
                  >
                    {col.render ? col.render(value, row) : value}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  if (!titulo) {
    return (
      <div className="border rounded-lg overflow-hidden">
        {renderContent()}
      </div>
    );
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium">{titulo}</CardTitle>
            {subtitulo && (
              <p className="text-sm text-gray-500 mt-1">{subtitulo}</p>
            )}
          </div>
          {maxRows && datos.length > maxRows && (
            <Badge variant="secondary">
              Mostrando {maxRows} de {datos.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {renderContent()}
      </CardContent>
    </Card>
  );
}

// Helpers para formateo común en tablas
export const formatters = {
  currency: (value: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value),

  percent: (value: number) => `${value.toFixed(1)}%`,

  number: (value: number) =>
    new Intl.NumberFormat("es-AR").format(value),

  date: (value: string | Date) => {
    if (!value) return "-";
    const date = typeof value === "string" ? new Date(value) : value;
    return date.toLocaleDateString("es-AR");
  },

  truncate: (value: string, length: number = 30) => {
    if (!value) return "-";
    return value.length > length ? `${value.slice(0, length)}...` : value;
  },
};

// Componentes de celda reutilizables
export function CurrencyCell({ value }: { value: number }) {
  return (
    <span className={cn("font-medium", value < 0 ? "text-red-600" : "text-emerald-600")}>
      {formatters.currency(value)}
    </span>
  );
}

export function PercentCell({ value, threshold = 50 }: { value: number; threshold?: number }) {
  return (
    <span className={cn("font-medium", value >= threshold ? "text-emerald-600" : "text-amber-600")}>
      {formatters.percent(value)}
    </span>
  );
}

export function BadgeCell({ value, variant }: { value: string; variant?: "default" | "success" | "warning" | "danger" }) {
  const variantClasses = {
    default: "bg-gray-100 text-gray-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
  };

  return (
    <Badge variant="outline" className={variantClasses[variant || "default"]}>
      {value}
    </Badge>
  );
}
