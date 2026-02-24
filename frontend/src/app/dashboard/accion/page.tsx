"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Flame, Thermometer, Snowflake, CheckCircle2 } from "lucide-react";
import { useListaAccion, ListaAccionItem } from "@/hooks/useListaAccion";
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";
import { ContactoSheet } from "@/components/crm/ContactoSheet";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

const TEMPERATURA_CONFIG = {
  CALIENTE: { icon: Flame, label: "Caliente", className: "text-red-500 bg-red-50" },
  TIBIO: { icon: Thermometer, label: "Tibio", className: "text-amber-500 bg-amber-50" },
  FRIO: { icon: Snowflake, label: "Frío", className: "text-blue-400 bg-blue-50" },
} as const;

const ETAPA_LABELS: Record<string, string> = {
  NUEVO_LEAD: "Nuevo Lead",
  TURNO_AGENDADO: "Turno Agendado",
  CONSULTADO: "Consultado",
  PRESUPUESTO_ENVIADO: "Presupuesto Enviado",
  SEGUIMIENTO_ACTIVO: "Seguimiento Activo",
  CALIENTE: "Caliente",
  CONFIRMADO: "Confirmado",
  PERDIDO: "Perdido",
};

function PatientActionCard({
  item,
  onContactRegistered,
}: {
  item: ListaAccionItem;
  onContactRegistered: (id: string) => void;
}) {
  const [justContacted, setJustContacted] = useState(false);
  const tempConfig = item.temperatura
    ? TEMPERATURA_CONFIG[item.temperatura as keyof typeof TEMPERATURA_CONFIG]
    : null;
  const TempIcon = tempConfig?.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`bg-card border rounded-xl p-4 flex items-center gap-4 ${
        justContacted ? "border-green-400 bg-green-50/50" : "border-border"
      }`}
    >
      {justContacted ? (
        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
      ) : null}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm">{item.nombreCompleto}</p>
          {tempConfig && TempIcon && (
            <span
              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${tempConfig.className}`}
            >
              <TempIcon className="w-3 h-3" />
              {tempConfig.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span
            className={`text-xs font-medium ${
              item.diasSinContacto > 14
                ? "text-red-600"
                : item.diasSinContacto > 7
                  ? "text-amber-600"
                  : "text-muted-foreground"
            }`}
          >
            {item.diasSinContacto === 0
              ? "Contactado hoy"
              : `${item.diasSinContacto} días sin contacto`}
          </span>
          {item.etapaCRM && (
            <span className="text-xs text-muted-foreground">
              {ETAPA_LABELS[item.etapaCRM] ?? item.etapaCRM}
            </span>
          )}
        </div>
      </div>

      <ContactoSheet
        pacienteId={item.id}
        pacienteNombre={item.nombreCompleto}
        modalMode={true}
        trigger={
          <Button variant="outline" size="sm" disabled={justContacted}>
            {justContacted ? "Registrado" : "Registrar"}
          </Button>
        }
        onSuccess={() => {
          setJustContacted(true);
          // Breve delay visual antes de que desaparezca la card
          setTimeout(() => onContactRegistered(item.id), 800);
        }}
      />
    </motion.div>
  );
}

export default function ListaAccionPage() {
  const effectiveProfessionalId = useEffectiveProfessionalId();
  const { data, isLoading, isError } = useListaAccion(effectiveProfessionalId);
  const queryClient = useQueryClient();
  // IDs de pacientes que ya fueron contactados (para optimistic removal antes del refetch)
  const [contactadosIds, setContactadosIds] = useState<Set<string>>(new Set());

  const handleContactRegistered = (id: string) => {
    setContactadosIds((prev) => new Set([...prev, id]));
    // Refrescar la query para sincronizar con el servidor
    queryClient.invalidateQueries({ queryKey: ["lista-accion"] });
  };

  const items = (data?.items ?? []).filter((item) => !contactadosIds.has(item.id));
  const contactadosHoy = (data?.contactadosHoy ?? 0) + contactadosIds.size;

  if (!effectiveProfessionalId) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">
          Seleccioná un profesional para ver la lista de acción.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Lista de Acción</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Pacientes que requieren seguimiento hoy, ordenados por prioridad
        </p>
      </div>

      {/* Contador contactados hoy */}
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <CheckCircle2 className="w-5 h-5 text-green-500" />
        <div>
          <p className="text-sm font-medium">
            {contactadosHoy === 0
              ? "Ningún paciente contactado hoy todavía"
              : `${contactadosHoy} ${contactadosHoy === 1 ? "paciente contactado" : "pacientes contactados"} hoy`}
          </p>
          {items.length > 0 && (
            <p className="text-xs text-muted-foreground">{items.length} pendientes</p>
          )}
        </div>
      </div>

      {/* Lista de cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-destructive text-sm">Error al cargar la lista. Intentá de nuevo.</p>
      ) : items.length === 0 && contactadosHoy === 0 ? (
        <div className="text-center py-12">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="font-medium">No hay pacientes pendientes hoy</p>
          <p className="text-sm text-muted-foreground mt-1">
            Todos los pacientes activos están al día
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="font-medium">¡Completaste la lista de hoy!</p>
          <p className="text-sm text-muted-foreground mt-1">
            {contactadosHoy}{" "}
            {contactadosHoy === 1 ? "paciente contactado" : "pacientes contactados"} hoy
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <PatientActionCard
                key={item.id}
                item={item}
                onContactRegistered={handleContactRegistered}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
