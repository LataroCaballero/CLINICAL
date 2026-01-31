'use client';

import { useEffect, useRef, useLayoutEffect } from 'react';
import {
  useMensajesPaciente,
  useCreateMensaje,
  useMarcarTodosLeidos,
} from '@/hooks/useMensajesPaciente';
import { useMensajesStore } from '@/store/mensajes-internos.store';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, MessageSquare, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatViewProps {
  pacienteId: string;
  pacienteNombre?: string;
  embedded?: boolean;
  onBack?: () => void;
}

export function ChatView({
  pacienteId,
  pacienteNombre,
  embedded = false,
  onBack,
}: ChatViewProps) {
  const { data: mensajes, isLoading, error } = useMensajesPaciente(pacienteId);
  const createMensaje = useCreateMensaje();
  const marcarTodosLeidos = useMarcarTodosLeidos();
  const clearSelection = useMensajesStore((s) => s.clearSelection);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Marcar todos como leidos cuando se abre el chat
  useEffect(() => {
    if (pacienteId && mensajes && mensajes.length > 0) {
      const hayNoLeidos = mensajes.some((m) => !m.leido && !m.esPropio);
      if (hayNoLeidos) {
        marcarTodosLeidos.mutate(pacienteId);
      }
    }
  }, [pacienteId, mensajes]);

  // Scroll al final cuando hay nuevos mensajes
  useLayoutEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'instant' });
    }
  }, [mensajes]);

  const handleSend = async (mensaje: string, prioridad: 'ALTA' | 'MEDIA' | 'BAJA') => {
    await createMensaje.mutateAsync({
      pacienteId,
      mensaje,
      prioridad,
    });
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      clearSelection();
    }
  };

  return (
    <div className={cn('flex flex-col h-full overflow-hidden', !embedded && 'bg-background')}>
      {/* Header - fixed */}
      <div className="flex-shrink-0 flex items-center gap-2 p-3 border-b bg-muted/30">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {pacienteNombre || 'Paciente'}
            </p>
            <p className="text-xs text-muted-foreground">Chat interno</p>
          </div>
        </div>
      </div>

      {/* Mensajes - scrollable */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto min-h-0 p-3"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-destructive">Error al cargar mensajes</p>
          </div>
        ) : !mensajes || mensajes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No hay mensajes</p>
            <p className="text-xs text-muted-foreground mt-1">
              Inicia la conversacion enviando un mensaje
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {mensajes.map((mensaje) => (
              <MessageBubble
                key={mensaje.id}
                mensaje={mensaje.mensaje}
                prioridad={mensaje.prioridad}
                autor={mensaje.autor}
                createdAt={mensaje.createdAt}
                esPropio={mensaje.esPropio}
                leido={mensaje.leido}
              />
            ))}
            {/* Anchor para scroll al final */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input - fixed */}
      <div className="flex-shrink-0">
        <MessageInput onSend={handleSend} disabled={createMensaje.isPending} />
      </div>
    </div>
  );
}
