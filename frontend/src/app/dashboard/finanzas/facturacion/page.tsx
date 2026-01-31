"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, BarChart3, FileText } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import ComprobantesTab from "./components/ComprobantesTab";
import ReportesTab from "./components/ReportesTab";
import LiquidacionesTab from "./components/LiquidacionesTab";

function FacturacionContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const { data: user } = useCurrentUser();

  // Verificar permisos para liquidaciones
  const canViewLiquidaciones =
    user?.rol === "FACTURADOR" ||
    user?.rol === "ADMIN" ||
    user?.rol === "PROFESIONAL";

  // Determinar tab por defecto
  const getDefaultTab = () => {
    if (tabParam === "reportes") return "reportes";
    if (tabParam === "liquidaciones" && canViewLiquidaciones) return "liquidaciones";
    return "comprobantes";
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">Facturación</h1>
        <p className="text-sm text-gray-500 mt-1">
          Comprobantes, reportes y liquidaciones
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={getDefaultTab()} className="w-full">
        <TabsList
          className={`grid w-full ${
            canViewLiquidaciones ? "grid-cols-3" : "grid-cols-2"
          } mb-4`}
        >
          <TabsTrigger value="comprobantes" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Comprobantes
          </TabsTrigger>
          <TabsTrigger value="reportes" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Reportes
          </TabsTrigger>
          {canViewLiquidaciones && (
            <TabsTrigger value="liquidaciones" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Liquidaciones
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="comprobantes">
          <ComprobantesTab />
        </TabsContent>

        <TabsContent value="reportes">
          <ReportesTab />
        </TabsContent>

        {canViewLiquidaciones && (
          <TabsContent value="liquidaciones">
            <LiquidacionesTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

export default function FacturacionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6 p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <FacturacionContent />
    </Suspense>
  );
}
