'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useMensajesStore } from '@/store/mensajes-internos.store';
import { useMensajesChats } from '@/hooks/useMensajesChats';
import { ChatsList } from './ChatsList';
import { ChatView } from './ChatView';
import { Button } from '@/components/ui/button';
import { X, GripHorizontal, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MensajesWidget() {
  const isWidgetOpen = useMensajesStore((s) => s.isWidgetOpen);
  const closeWidget = useMensajesStore((s) => s.closeWidget);
  const selectedPacienteId = useMensajesStore((s) => s.selectedPacienteId);
  const widgetPosition = useMensajesStore((s) => s.widgetPosition);
  const setWidgetPosition = useMensajesStore((s) => s.setWidgetPosition);
  const unreadTotal = useMensajesStore((s) => s.unreadTotal);

  const { data: chats } = useMensajesChats();
  const selectedChat = chats?.find((c) => c.id === selectedPacienteId);

  const widgetRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (widgetRef.current) {
        const rect = widgetRef.current.getBoundingClientRect();
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
        setIsDragging(true);
      }
    },
    []
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = Math.max(0, Math.min(window.innerWidth - 380, e.clientX - dragOffset.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 500, e.clientY - dragOffset.y));
      setWidgetPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, setWidgetPosition]);

  if (!isWidgetOpen) return null;

  return (
    <div
      ref={widgetRef}
      className={cn(
        'fixed z-50 w-[380px] h-[500px] bg-background rounded-lg shadow-2xl border flex flex-col overflow-hidden',
        isDragging && 'cursor-grabbing select-none'
      )}
      style={{
        left: widgetPosition.x,
        top: widgetPosition.y,
      }}
    >
      {/* Header draggable */}
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2 border-b bg-muted/50 cursor-grab',
          isDragging && 'cursor-grabbing'
        )}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="h-4 w-4 text-muted-foreground" />
          <MessageCircle className="h-4 w-4" />
          <span className="font-medium text-sm">Mensajes Internos</span>
          {unreadTotal > 0 && (
            <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
              {unreadTotal}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={closeWidget}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {selectedPacienteId ? (
          <ChatView
            pacienteId={selectedPacienteId}
            pacienteNombre={selectedChat?.nombreCompleto}
          />
        ) : (
          <ChatsList />
        )}
      </div>
    </div>
  );
}
