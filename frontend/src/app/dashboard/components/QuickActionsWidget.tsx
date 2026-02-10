"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CalendarPlus, UserPlus, DollarSign, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";

const actions = [
  {
    label: "Agendar Turno",
    icon: CalendarPlus,
    href: "/dashboard/turnos",
    color: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100",
  },
  {
    label: "Nuevo Paciente",
    icon: UserPlus,
    href: "/dashboard/pacientes?nuevo=true",
    color: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
  },
  {
    label: "Registrar Cobro",
    icon: DollarSign,
    href: "/dashboard/finanzas",
    color: "bg-amber-50 text-amber-600 hover:bg-amber-100",
  },
  {
    label: "Registrar Venta",
    icon: ShoppingCart,
    href: "/dashboard/stock/ventas",
    color: "bg-violet-50 text-violet-600 hover:bg-violet-100",
  },
];

export default function QuickActionsWidget() {
  const router = useRouter();

  return (
    <Card className="bg-white border border-gray-200 shadow-sm rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-gray-800">
          Acciones rápidas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={() => router.push(action.href)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-colors ${action.color}`}
            >
              <action.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
