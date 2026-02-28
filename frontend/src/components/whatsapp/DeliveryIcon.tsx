import { Check, CheckCheck, XCircle, Clock } from 'lucide-react';
import { EstadoMensajeWA } from '@/hooks/useWAThread';

export function DeliveryIcon({ estado }: { estado: EstadoMensajeWA }) {
  if (estado === 'PENDIENTE') return <Clock className="h-3 w-3 text-gray-400" />;
  if (estado === 'ENVIADO')   return <Check className="h-3 w-3 text-gray-400" />;
  if (estado === 'ENTREGADO') return <CheckCheck className="h-3 w-3 text-gray-500" />;
  if (estado === 'LEIDO')     return <CheckCheck className="h-3 w-3 text-blue-500" />;
  if (estado === 'FALLIDO')   return <XCircle className="h-3 w-3 text-red-500" />;
  return null;
}
