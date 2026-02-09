"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2 } from "lucide-react";
import { useMensajesChats, ChatItem } from "@/hooks/useMensajesChats";
import { useMensajesStore } from "@/store/mensajes-internos.store";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function MensajesDashboard() {
  const { data: chats, isLoading } = useMensajesChats();
  const { selectChat, openWidget } = useMensajesStore();

  const unreadChats = (chats ?? [])
    .filter((c) => c.unreadCount > 0)
    .slice(0, 4);

  const hasUrgent = unreadChats.some((c) => c.unreadAlta > 0);

  return (
    <Card className={cn(
      "bg-white shadow-sm rounded-xl",
      hasUrgent ? "border-2 border-red-400" : "border border-gray-200"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-800">
            Mensajes
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-indigo-600 hover:text-indigo-700"
            onClick={() => openWidget()}
          >
            Ver todos
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-56 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : unreadChats.length === 0 ? (
          <div className="flex items-center gap-3 py-4 text-gray-500">
            <MessageSquare className="w-5 h-5" />
            <span className="text-sm">Sin mensajes nuevos</span>
          </div>
        ) : (
          unreadChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => selectChat(chat.id)}
              className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                {chat.nombreCompleto
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {chat.nombreCompleto}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                      chat.unreadAlta > 0
                        ? "bg-red-100 text-red-700"
                        : "bg-indigo-100 text-indigo-700"
                    )}
                  >
                    {chat.unreadCount}
                  </span>
                </div>
                {chat.ultimoMensaje && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {chat.ultimoMensaje.mensaje}
                  </p>
                )}
                {chat.ultimoMensaje && (
                  <span className="text-[10px] text-gray-400 mt-0.5">
                    {formatDistanceToNow(
                      new Date(chat.ultimoMensaje.createdAt),
                      { addSuffix: true, locale: es }
                    )}
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}
