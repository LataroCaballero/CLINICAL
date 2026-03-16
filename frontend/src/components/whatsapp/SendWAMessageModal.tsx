'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { MessageSquare, Check } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import {
  useWATemplates,
  useSendWATemplate,
  WATemplate,
} from '@/hooks/useWAThread';

type Props = {
  pacienteId: string;
  open: boolean;
  onClose: () => void;
  pacienteEmail?: string;
};

function getTemplateBodyText(template: WATemplate): string {
  const bodyComponent = template.components.find((c) => c.type === 'BODY' || c.type === 'body');
  return bodyComponent?.text ?? '';
}

export default function SendWAMessageModal({ pacienteId, open, onClose }: Props) {
  const { data: templates = [], isLoading } = useWATemplates();
  const sendWA = useSendWATemplate();

  const [selected, setSelected] = useState<WATemplate | null>(null);

  function handleClose() {
    setSelected(null);
    onClose();
  }

  async function handleConfirm() {
    if (!selected) return;

    sendWA.mutate(
      {
        pacienteId,
        templateName: selected.name,
        tipo: 'SEGUIMIENTO',
        languageCode: selected.language,
      },
      {
        onSuccess: () => {
          toast.success('Mensaje enviado por WhatsApp');
          handleClose();
        },
        onError: (err: unknown) => {
          const message = (err as { message?: string })?.message ?? 'Error desconocido';
          toast.error(`Error al enviar: ${message}`);
        },
      },
    );
  }

  const isConfirming = sendWA.isPending;
  const canConfirm = !!selected && !isConfirming;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-green-600" />
            Enviar por WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {/* Template selection */}
          <div>
            <p className="text-sm font-medium mb-2">Seleccionar template</p>

            {isLoading && (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            )}

            {!isLoading && templates.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No hay templates aprobados disponibles
              </p>
            )}

            {!isLoading && templates.map((template) => {
              const isSelected = selected?.name === template.name;
              const bodyText = getTemplateBodyText(template);

              return (
                <button
                  key={`${template.name}-${template.language}`}
                  type="button"
                  onClick={() => setSelected(template)}
                  className={`
                    w-full text-left rounded-lg border px-3 py-2.5 mb-2 transition-colors
                    ${isSelected
                      ? 'border-green-500 bg-green-50'
                      : 'border-border hover:bg-accent'
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{template.name}</p>
                      <p className="text-xs text-muted-foreground">{template.language}</p>
                      {bodyText && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{bodyText}</p>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <DialogFooter className="border-t pt-3">
          <Button variant="outline" onClick={handleClose} disabled={isConfirming}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            {isConfirming ? 'Enviando...' : 'Enviar por WhatsApp'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
