'use client';

import WAThreadView from '@/components/whatsapp/WAThreadView';

type Props = {
  pacienteId: string;
  pacienteNombre?: string;
  whatsappOptIn?: boolean;
  pacienteTelefono?: string | null;
  onBack: () => void;
};

export default function MensajesView({ pacienteId, pacienteNombre, whatsappOptIn = false, pacienteTelefono = null, onBack }: Props) {
  return (
    <div className="h-[60vh] -mx-6 -mb-4">
      <WAThreadView
        pacienteId={pacienteId}
        pacienteNombre={pacienteNombre}
        whatsappOptIn={whatsappOptIn}
        pacienteTelefono={pacienteTelefono}
        onBack={onBack}
      />
    </div>
  );
}
