'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HCCreatorForm } from '@/components/live-turno/tabs/hc/HCCreatorForm';

export interface HCCreatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pacienteId: string;
  profesionalId: string;
  obraSocialId?: string;
  /** Called after the HC entry is saved (in addition to closing the dialog). */
  onSaved?: () => void;
}

export function HCCreatorDialog({
  open,
  onOpenChange,
  pacienteId,
  profesionalId,
  obraSocialId,
  onSaved,
}: HCCreatorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva entrada de Historia Clínica</DialogTitle>
        </DialogHeader>
        <HCCreatorForm
          pacienteId={pacienteId}
          profesionalId={profesionalId}
          obraSocialId={obraSocialId}
          showDatePicker={true}
          onSaved={() => {
            onOpenChange(false);
            onSaved?.();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
