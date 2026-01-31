'use client';

import { ChatView } from '@/components/mensajes';

type Props = {
  pacienteId: string;
  pacienteNombre?: string;
  onBack: () => void;
};

export default function MensajesView({ pacienteId, pacienteNombre, onBack }: Props) {
  return (
    <div className="h-[60vh] -mx-6 -mb-4">
      <ChatView
        pacienteId={pacienteId}
        pacienteNombre={pacienteNombre}
        embedded
        onBack={onBack}
      />
    </div>
  );
}
