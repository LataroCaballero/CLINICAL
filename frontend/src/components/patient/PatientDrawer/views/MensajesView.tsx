'use client';

import WAThreadView from '@/components/whatsapp/WAThreadView';

type Props = {
  pacienteId: string;
  pacienteNombre?: string;
  whatsappOptIn?: boolean;
  onBack: () => void;
};

export default function MensajesView({ pacienteId, pacienteNombre, whatsappOptIn = false, onBack }: Props) {
  return (
    <div className="h-[60vh] -mx-6 -mb-4">
      <WAThreadView
        pacienteId={pacienteId}
        pacienteNombre={pacienteNombre}
        whatsappOptIn={whatsappOptIn}
        onBack={onBack}
      />
    </div>
  );
}
