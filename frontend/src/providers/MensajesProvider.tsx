'use client';

import { ReactNode } from 'react';
import { useMensajesNotifications } from '@/hooks/useMensajesNotifications';
import { MensajesWidget, MensajesWidgetTrigger } from '@/components/mensajes';

interface MensajesProviderProps {
  children: ReactNode;
}

function MensajesNotificationsHandler() {
  // Este hook activa el polling y las notificaciones
  useMensajesNotifications();
  return null;
}

export function MensajesProvider({ children }: MensajesProviderProps) {
  return (
    <>
      <MensajesNotificationsHandler />
      {children}
      <MensajesWidgetTrigger />
      <MensajesWidget />
    </>
  );
}
