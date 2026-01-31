'use client';

import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { useMensajesStore } from '@/store/mensajes-internos.store';
import { cn } from '@/lib/utils';

export function MensajesWidgetTrigger() {
  const toggleWidget = useMensajesStore((s) => s.toggleWidget);
  const isWidgetOpen = useMensajesStore((s) => s.isWidgetOpen);
  const unreadTotal = useMensajesStore((s) => s.unreadTotal);
  const unreadAlta = useMensajesStore((s) => s.unreadAlta);

  if (isWidgetOpen) return null;

  return (
    <Button
      onClick={toggleWidget}
      size="icon"
      className={cn(
        'fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50',
        'hover:scale-105 transition-transform',
        unreadAlta > 0 && 'bg-red-500 hover:bg-red-600'
      )}
    >
      <MessageCircle className="h-6 w-6" />
      {unreadTotal > 0 && (
        <span
          className={cn(
            'absolute -top-1 -right-1 min-w-[22px] h-[22px] flex items-center justify-center rounded-full text-xs font-bold',
            unreadAlta > 0
              ? 'bg-white text-red-600 animate-pulse'
              : 'bg-destructive text-destructive-foreground'
          )}
        >
          {unreadTotal > 99 ? '99+' : unreadTotal}
        </span>
      )}
    </Button>
  );
}
