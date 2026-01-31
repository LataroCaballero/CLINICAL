'use client';

import { FileText, User, Calendar, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLiveTurnoStore, LiveTurnoTab } from '@/store/live-turno.store';

const tabs: { id: LiveTurnoTab; label: string; icon: typeof FileText }[] = [
  { id: 'hc', label: 'Historia Clinica', icon: FileText },
  { id: 'datos', label: 'Datos Paciente', icon: User },
  { id: 'turno', label: 'Nuevo Turno', icon: Calendar },
  { id: 'cobro', label: 'Cobrar Consulta', icon: DollarSign },
];

export function LiveTurnoTabs() {
  const { activeTab, setActiveTab, draftData } = useLiveTurnoStore();

  return (
    <div className="flex border-b bg-white">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        // Show indicator if there's draft data for this tab
        const hasDraft =
          (tab.id === 'hc' && draftData.hcEntryId) ||
          (tab.id === 'turno' && draftData.scheduledTurnoData?.fecha) ||
          (tab.id === 'cobro' && draftData.pagoData?.monto);

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors relative',
              'border-b-2 -mb-px',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
            {hasDraft && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}
