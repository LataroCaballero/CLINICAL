"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, AlertTriangle, Clock, Building2 } from "lucide-react";
import { ResumenDeudasProveedores } from "@/types/proveedores-financiero";

interface ResumenDeudasCardProps {
  resumen?: ResumenDeudasProveedores;
  isLoading: boolean;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ResumenDeudasCard({
  resumen,
  isLoading,
}: ResumenDeudasCardProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <DollarSign className="w-4 h-4" />
            Total Deuda
          </div>
          <div className="text-2xl font-bold text-gray-800">
            {formatMoney(resumen?.totalDeuda || 0)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-500 text-sm mb-1">
            <AlertTriangle className="w-4 h-4" />
            Deuda Vencida
          </div>
          <div className="text-2xl font-bold text-red-600">
            {formatMoney(resumen?.totalVencido || 0)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-amber-500 text-sm mb-1">
            <Clock className="w-4 h-4" />
            Por Vencer
          </div>
          <div className="text-2xl font-bold text-amber-600">
            {formatMoney(resumen?.totalPorVencer || 0)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Building2 className="w-4 h-4" />
            Proveedores con Deuda
          </div>
          <div className="text-2xl font-bold text-gray-800">
            {resumen?.cantidadProveedoresConDeuda || 0}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
