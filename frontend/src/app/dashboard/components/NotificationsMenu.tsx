"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, DollarSign, MessageSquare, Package, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface Notification {
  id: number;
  title: string;
  message: string;
  category: "financiero" | "comunicacion" | "stock" | "turnos";
  date: string;
}

const mockNotifications: Notification[] = [
  {
    id: 1,
    title: "Pago pendiente",
    message: "El paciente Juan Pérez tiene un saldo sin cancelar.",
    category: "financiero",
    date: "10:30 AM",
  },
  {
    id: 2,
    title: "Nuevo mensaje interno",
    message: "Sofía (Secretaría) te envió una nota sobre un turno reprogramado.",
    category: "comunicacion",
    date: "11:15 AM",
  },
  {
    id: 3,
    title: "Stock bajo",
    message: "Quedan menos de 5 unidades de Ácido Hialurónico.",
    category: "stock",
    date: "11:40 AM",
  },
  {
    id: 4,
    title: "Turno confirmado",
    message: "El paciente Ana Morales confirmó su asistencia para las 14:00.",
    category: "turnos",
    date: "11:50 AM",
  },
];

export default function NotificationsMenu() {
  const [notifications, setNotifications] = useState(mockNotifications);

  const unreadCount = notifications.length;

  const getCategoryIcon = (category: Notification["category"]) => {
    switch (category) {
      case "financiero":
        return <DollarSign className="w-4 h-4 text-green-600" />;
      case "comunicacion":
        return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case "stock":
        return <Package className="w-4 h-4 text-amber-600" />;
      case "turnos":
        return <CalendarDays className="w-4 h-4 text-purple-600" />;
      default:
        return null;
    }
  };

  const clearNotifications = () => setNotifications([]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-gray-100 rounded-full"
        >
          <Bell className="w-5 h-5 text-gray-700" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-80 bg-white shadow-md border border-gray-200 rounded-lg overflow-hidden"
      >
        <DropdownMenuLabel className="flex justify-between items-center px-3 py-2 text-sm font-medium text-gray-800">
          Notificaciones
          {notifications.length > 0 && (
            <button
              onClick={clearNotifications}
              className="text-xs text-indigo-500 hover:underline"
            >
              Marcar como leídas
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <p className="text-sm text-gray-500 px-3 py-4 text-center">
            No hay notificaciones pendientes 🎉
          </p>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="flex items-start gap-3 px-3 py-2 hover:bg-gray-50 cursor-default"
            >
              {getCategoryIcon(n.category)}
              <div className="flex flex-col text-sm">
                <span className="font-medium text-gray-800">{n.title}</span>
                <span className="text-gray-600 text-xs">{n.message}</span>
                <span className="text-gray-400 text-[11px] mt-1">
                  {n.date}
                </span>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
