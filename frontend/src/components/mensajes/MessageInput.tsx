'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Send, Loader2, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

type Prioridad = 'ALTA' | 'MEDIA' | 'BAJA';

interface MessageInputProps {
  onSend: (mensaje: string, prioridad: Prioridad) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

const prioridadOptions: { value: Prioridad; label: string; color: string }[] = [
  { value: 'ALTA', label: 'Alta', color: 'text-red-600' },
  { value: 'MEDIA', label: 'Media', color: 'text-yellow-600' },
  { value: 'BAJA', label: 'Baja', color: 'text-blue-600' },
];

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = 'Escribe un mensaje...',
}: MessageInputProps) {
  const [mensaje, setMensaje] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (prioridad: Prioridad) => {
    if (!mensaje.trim() || isLoading) return;

    setIsLoading(true);
    try {
      await onSend(mensaje.trim(), prioridad);
      setMensaje('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+Enter o Cmd+Enter para enviar con prioridad BAJA (default)
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend('BAJA');
    }
  };

  return (
    <div className="flex gap-2 p-3 border-t bg-background">
      <Textarea
        value={mensaje}
        onChange={(e) => setMensaje(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        className="min-h-[40px] max-h-[120px] resize-none"
        rows={1}
      />

      <div className="flex flex-shrink-0">
        {/* Botón principal - envía con prioridad BAJA por defecto */}
        <Button
          size="icon"
          disabled={disabled || isLoading || !mensaje.trim()}
          onClick={() => handleSend('BAJA')}
          className="rounded-r-none"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>

        {/* Dropdown para seleccionar otra prioridad */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="default"
              disabled={disabled || isLoading || !mensaje.trim()}
              className="rounded-l-none border-l border-primary-foreground/20 w-6 px-0"
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top">
            <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
              Cambiar prioridad
            </div>
            {prioridadOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleSend(option.value)}
                className={cn('cursor-pointer', option.color)}
              >
                <span
                  className={cn(
                    'w-2 h-2 rounded-full mr-2',
                    option.value === 'ALTA' && 'bg-red-500',
                    option.value === 'MEDIA' && 'bg-yellow-500',
                    option.value === 'BAJA' && 'bg-blue-500'
                  )}
                />
                {option.label}
                {option.value === 'BAJA' && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    (predeterminado)
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
