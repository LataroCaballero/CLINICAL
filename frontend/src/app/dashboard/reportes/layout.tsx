"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, BarChart3 } from "lucide-react";

const breadcrumbLabels: Record<string, string> = {
  reportes: "Reportes",
  operativos: "Operativos",
  financieros: "Financieros",
  turnos: "Turnos",
  ausentismo: "Ausentismo",
  ocupacion: "Ocupación",
  procedimientos: "Procedimientos",
  ventas: "Ventas",
  ingresos: "Ingresos",
  cuentas: "Cuentas por Cobrar",
};

export default function ReportesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const pathSegments = pathname.split("/").filter(Boolean);

  // Don't show breadcrumbs on main reportes page
  const isMainPage = pathname === "/dashboard/reportes";

  const breadcrumbs = pathSegments
    .slice(1) // Remove "dashboard"
    .map((segment, index) => {
      const path = "/dashboard/" + pathSegments.slice(1, index + 2).join("/");
      const label = breadcrumbLabels[segment] || segment;
      const isLast = index === pathSegments.length - 2;

      return { path, label, isLast };
    });

  return (
    <div className="flex flex-col h-full">
      {!isMainPage && breadcrumbs.length > 0 && (
        <div className="bg-white border-b px-6 py-3">
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/dashboard/reportes"
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Reportes</span>
            </Link>
            {breadcrumbs.slice(1).map((crumb, index) => (
              <div key={crumb.path} className="flex items-center gap-1">
                <ChevronRight className="w-4 h-4 text-gray-400" />
                {crumb.isLast ? (
                  <span className="font-medium text-gray-900">{crumb.label}</span>
                ) : (
                  <Link
                    href={crumb.path}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {crumb.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </div>
      )}
      <div className="flex-1 overflow-auto p-6">{children}</div>
    </div>
  );
}
