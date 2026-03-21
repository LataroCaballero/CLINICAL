'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { useMensajesStore } from '@/store/mensajes-internos.store';
import { cn } from '@/lib/utils';

const BUTTON_SIZE = 56; // 14 * 4 = h-14 / w-14
const DRAG_THRESHOLD = 5; // px de movimiento para considerar que es drag

export function MensajesWidgetTrigger() {
  const toggleWidget = useMensajesStore((s) => s.toggleWidget);
  const isWidgetOpen = useMensajesStore((s) => s.isWidgetOpen);
  const unreadTotal = useMensajesStore((s) => s.unreadTotal);
  const unreadAlta = useMensajesStore((s) => s.unreadAlta);
  const triggerPosition = useMensajesStore((s) => s.triggerPosition);
  const setTriggerPosition = useMensajesStore((s) => s.setTriggerPosition);

  // Posición local durante el drag (evita escrituras al store en cada frame)
  const [localPos, setLocalPos] = useState<{ x: number; y: number } | null>(null);
  const localPosRef = useRef<{ x: number; y: number } | null>(null); // ref para leer en mouseup sin closures
  const isDragging = useRef(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, btnX: 0, btnY: 0 });
  const totalMovement = useRef(0);

  // Inicializar localPos desde el store o calcular posición por defecto (bottom-right)
  useEffect(() => {
    const pos = triggerPosition ?? {
      x: window.innerWidth - BUTTON_SIZE - 24,
      y: window.innerHeight - BUTTON_SIZE - 24,
    };
    localPosRef.current = pos;
    setLocalPos(pos);
  }, []); // solo en mount

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const current = localPos ?? {
      x: window.innerWidth - BUTTON_SIZE - 24,
      y: window.innerHeight - BUTTON_SIZE - 24,
    };
    isDragging.current = true;
    totalMovement.current = 0;
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      btnX: current.x,
      btnY: current.y,
    };
  }, [localPos]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - dragStart.current.mouseX;
      const dy = e.clientY - dragStart.current.mouseY;
      totalMovement.current += Math.abs(dx) + Math.abs(dy);

      const newX = Math.max(0, Math.min(window.innerWidth - BUTTON_SIZE, dragStart.current.btnX + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - BUTTON_SIZE, dragStart.current.btnY + dy));
      const newPos = { x: newX, y: newY };
      localPosRef.current = newPos;
      setLocalPos(newPos);
    };

    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;

      // Solo guardar si realmente se arrastró
      if (totalMovement.current > DRAG_THRESHOLD) {
        if (localPosRef.current) setTriggerPosition(localPosRef.current);
      } else {
        // Era un click
        toggleWidget();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [toggleWidget, setTriggerPosition]);

  if (isWidgetOpen) return null;
  if (!localPos) return null; // esperar a que se calcule la posición en cliente

  return (
    <div
      className="fixed z-50"
      style={{ left: localPos.x, top: localPos.y }}
    >
      <Button
        onMouseDown={handleMouseDown}
        size="icon"
        className={cn(
          'h-14 w-14 rounded-full shadow-lg',
          'hover:scale-105 transition-transform cursor-grab active:cursor-grabbing',
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
    </div>
  );
}
