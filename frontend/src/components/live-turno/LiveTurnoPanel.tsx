'use client';

import { useLiveTurnoStore } from '@/store/live-turno.store';
import { LiveTurnoHeader } from './LiveTurnoHeader';
import { LiveTurnoFooter } from './LiveTurnoFooter';
import { LiveTurnoTabs } from './LiveTurnoTabs';
import { HistoriaClinicaTab } from './tabs/HistoriaClinicaTab';
import { DatosPacienteTab } from './tabs/DatosPacienteTab';
import { NuevoTurnoTab } from './tabs/NuevoTurnoTab';
import { CobrarConsultaTab } from './tabs/CobrarConsultaTab';

export function LiveTurnoPanel() {
  const { isPanelOpen, session, activeTab } = useLiveTurnoStore();

  if (!isPanelOpen || !session) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-100">
      <div className="flex flex-col h-full">
        {/* Header */}
        <LiveTurnoHeader />

        {/* Tabs Navigation */}
        <LiveTurnoTabs />

        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'hc' && <HistoriaClinicaTab />}
          {activeTab === 'datos' && <DatosPacienteTab />}
          {activeTab === 'turno' && <NuevoTurnoTab />}
          {activeTab === 'cobro' && <CobrarConsultaTab />}
        </div>

        {/* Footer */}
        <LiveTurnoFooter />
      </div>
    </div>
  );
}
