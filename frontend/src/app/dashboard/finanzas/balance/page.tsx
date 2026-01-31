"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, FileText } from "lucide-react";
import IngresosTab from "./components/IngresosTab";
import CuentasPorCobrarTab from "./components/CuentasPorCobrarTab";

function BalanceContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const estadoParam = searchParams.get("estado");

  const defaultTab = tabParam === "cuentas" ? "cuentas" : "ingresos";

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">Balance</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestión de ingresos y cuentas por cobrar
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="ingresos" className="flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Ingresos / Pagos
          </TabsTrigger>
          <TabsTrigger value="cuentas" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Cuentas por Cobrar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ingresos">
          <IngresosTab />
        </TabsContent>

        <TabsContent value="cuentas">
          <CuentasPorCobrarTab
            initialEstado={estadoParam as "AL_DIA" | "MOROSO" | "TODOS" | undefined}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function BalancePage() {
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
      <BalanceContent />
    </Suspense>
  );
}
