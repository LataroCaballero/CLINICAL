'use client';

import { cn } from '@/lib/utils';
import { PriorityBadge } from './PriorityBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bot } from 'lucide-react';

interface MessageBubbleProps {
  mensaje: string;
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
  autor: {
    nombre: string;
    apellido: string;
    fotoUrl: string | null;
    rol: string;
  };
  createdAt: string;
  esPropio: boolean;
  esSistema: boolean;
  leido: boolean;
}

export function MessageBubble({
  mensaje,
  prioridad,
  autor,
  createdAt,
  esPropio,
  esSistema,
  leido,
}: MessageBubbleProps) {
  const fecha = new Date(createdAt);
  const horaFormateada = format(fecha, 'HH:mm', { locale: es });
  const fechaFormateada = format(fecha, 'd MMM', { locale: es });

  // Mensaje del sistema: centrado, sin avatar, estilo de notificación
  if (esSistema) {
    return (
      <div className="flex flex-col items-center gap-1 my-2">
        <div
          className={cn(
            'flex items-start gap-2 max-w-[90%] rounded-xl px-3 py-2 text-xs',
            prioridad === 'ALTA'
              ? 'bg-red-50 border border-red-200 text-red-800'
              : prioridad === 'MEDIA'
                ? 'bg-amber-50 border border-amber-200 text-amber-800'
                : 'bg-blue-50 border border-blue-200 text-blue-800'
          )}
        >
          <Bot className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <p className="whitespace-pre-wrap break-words">{mensaje}</p>
        </div>
        <span className="text-[10px] text-muted-foreground">
          Sistema · {fechaFormateada} {horaFormateada}
        </span>
      </div>
    );
  }

  const initials = `${autor.nombre[0]}${autor.apellido[0]}`.toUpperCase();

  return (
    <div
      className={cn(
        'flex gap-2 max-w-[85%]',
        esPropio ? 'ml-auto flex-row-reverse' : 'mr-auto'
      )}
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={autor.fotoUrl || undefined} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>

      <div className={cn('flex flex-col', esPropio ? 'items-end' : 'items-start')}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-muted-foreground">
            {autor.nombre} {autor.apellido}
          </span>
          <PriorityBadge prioridad={prioridad} size="sm" showLabel={false} />
        </div>

        <div
          className={cn(
            'rounded-2xl px-3 py-2 text-sm',
            esPropio
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted rounded-tl-sm',
            prioridad === 'ALTA' && !esPropio && 'border-l-2 border-red-500'
          )}
        >
          <p className="whitespace-pre-wrap break-words">{mensaje}</p>
        </div>

        <div className="flex items-center gap-1 mt-1">
          <span className="text-[10px] text-muted-foreground">
            {fechaFormateada} {horaFormateada}
          </span>
          {esPropio && (
            <span className="text-[10px] text-muted-foreground">
              {leido ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
