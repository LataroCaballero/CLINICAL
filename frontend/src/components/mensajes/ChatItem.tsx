'use client';

import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PriorityBadge } from './PriorityBadge';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ChatItem as ChatItemType } from '@/hooks/useMensajesChats';

interface ChatItemProps {
  chat: ChatItemType;
  isSelected: boolean;
  onClick: () => void;
}

export function ChatItem({ chat, isSelected, onClick }: ChatItemProps) {
  const initials = chat.nombreCompleto
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const tiempoRelativo = chat.ultimoMensaje
    ? formatDistanceToNow(new Date(chat.ultimoMensaje.createdAt), {
        addSuffix: true,
        locale: es,
      })
    : null;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 p-3 text-left transition-colors hover:bg-muted/50',
        isSelected && 'bg-muted',
        chat.unreadAlta > 0 && 'bg-red-50 hover:bg-red-100/80'
      )}
    >
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={chat.fotoUrl || undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        {chat.unreadCount > 0 && (
          <span
            className={cn(
              'absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white',
              chat.unreadAlta > 0 ? 'bg-red-500 animate-pulse' : 'bg-primary'
            )}
          >
            {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm truncate">{chat.nombreCompleto}</span>
          {tiempoRelativo && (
            <span className="text-[10px] text-muted-foreground flex-shrink-0">
              {tiempoRelativo}
            </span>
          )}
        </div>

        {chat.ultimoMensaje && (
          <div className="flex items-center gap-2 mt-0.5">
            <PriorityBadge
              prioridad={chat.ultimoMensaje.prioridad}
              size="sm"
              showLabel={false}
            />
            <p className="text-xs text-muted-foreground truncate">
              <span className="font-medium">
                {chat.ultimoMensaje.autor.nombre}:
              </span>{' '}
              {chat.ultimoMensaje.mensaje}
            </p>
          </div>
        )}
      </div>
    </button>
  );
}
