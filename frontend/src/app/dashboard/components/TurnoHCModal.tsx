"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  AlertCircle,
  Loader2,
  Save,
  ChevronLeft,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { useHistoriaClinica } from "@/hooks/useHistoriaClinica";
import {
  useCreateHistoriaClinicaEntry,
  type TipoEntrada,
} from "@/hooks/useCreateHistoriaClinicaEntry";
import { usePaciente } from "@/hooks/usePaciente";
import PatientDrawer from "@/app/dashboard/pacientes/components/PatientDrawer";
import {
  PrimeraConsultaForm,
  type PrimeraConsultaFormState,
} from "@/components/live-turno/tabs/hc/PrimeraConsultaForm";

type TurnoAgenda = {
  id: string;
  inicio: string;
  estado: string;
  observaciones?: string | null;
  entradaHCId?: string | null;
  esCirugia?: boolean;
  paciente: { id: string; nombreCompleto: string };
  tipoTurno: { id: string; nombre: string; esCirugia?: boolean };
};

type Props = {
  turno: TurnoAgenda | null;
  open: boolean;
  onClose: () => void;
  selectedDate: Date;
};

function hhmm(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function yyyyMmDd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const TIPOS: { id: TipoEntrada; label: string }[] = [
  { id: "primera_vez", label: "Primera Consulta" },
  { id: "pre_quirurgico", label: "Pre Quirúrgico" },
  { id: "control", label: "Control" },
  { id: "practica", label: "Práctica" },
];

export default function TurnoHCModal({
  turno,
  open,
  onClose,
  selectedDate,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoEntrada | null>(
    null
  );
  const [pvState, setPvState] = useState<PrimeraConsultaFormState | null>(null);
  const [textoLibre, setTextoLibre] = useState("");
  const [saved, setSaved] = useState(false);
  const [patientDrawerOpen, setPatientDrawerOpen] = useState(false);

  const pacienteId = turno?.paciente.id ?? "";

  const { data: hcEntries, isLoading } = useHistoriaClinica(pacienteId);
  const { data: pacienteData } = usePaciente(pacienteId || null);
  const createEntry = useCreateHistoriaClinicaEntry();

  if (!turno) return null;

  const selectedDateStr = yyyyMmDd(selectedDate);
  const allEntries: any[] = (hcEntries as any[]) ?? [];

  const linkedById = turno.entradaHCId
    ? allEntries.find((e) => e.id === turno.entradaHCId)
    : null;

  const entriesByDate = allEntries.filter((e) => {
    const d = new Date(e.fecha);
    const entryDateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    return entryDateStr === selectedDateStr;
  });

  const dayEntries = linkedById ? [linkedById] : entriesByDate;

  const canSave =
    tipoSeleccionado !== null &&
    (tipoSeleccionado === "primera_vez"
      ? pvState !== null &&
        (pvState.diagnostico.zonas.length > 0 ||
          pvState.tratamientos.length > 0)
      : textoLibre.trim().length > 0);

  const handleSave = async () => {
    if (!tipoSeleccionado) return;
    try {
      const fecha = yyyyMmDd(selectedDate);
      if (tipoSeleccionado === "primera_vez") {
        if (!pvState) return;
        await createEntry.mutateAsync({
          pacienteId,
          dto: {
            tipo: "primera_vez",
            fecha,
            diagnostico: pvState.diagnostico,
            tratamientos: pvState.tratamientos,
            comentario: pvState.comentario,
            autorizaciones: pvState.autorizacion
              ? [
                  {
                    obraSocialId: pvState.autorizacion.obraSocialId,
                    codigos: pvState.autorizacion.codigos,
                  },
                ]
              : undefined,
          },
        });
      } else {
        await createEntry.mutateAsync({
          pacienteId,
          dto: { tipo: tipoSeleccionado, fecha, texto: textoLibre },
        });
      }
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setShowForm(false);
        setTipoSeleccionado(null);
        setPvState(null);
        setTextoLibre("");
      }, 1500);
    } catch {
      toast.error("No se pudo guardar la entrada");
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setTipoSeleccionado(null);
    setPvState(null);
    setTextoLibre("");
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            <button
              type="button"
              onClick={() => setPatientDrawerOpen(true)}
              className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors group"
            >
              HC — {turno.paciente.nombreCompleto}
              <ArrowUpRight className="w-4 h-4 text-indigo-400 opacity-60 group-hover:opacity-100 transition-opacity" />
            </button>
          </DialogTitle>
          <p className="text-sm text-gray-500">
            {turno.tipoTurno.nombre} · {hhmm(turno.inicio)} ·{" "}
            {format(selectedDate, "EEEE d 'de' MMMM yyyy", { locale: es })}
          </p>
        </DialogHeader>

        {showForm ? (
          /* ── FORM MODE ── */
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="flex-1 overflow-y-auto pr-1">
              <div className="space-y-4 py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 -ml-1"
                  onClick={handleCloseForm}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Volver al historial
                </Button>

                {/* Tipo selector */}
                <div className="flex gap-2 flex-wrap">
                  {TIPOS.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTipoSeleccionado(id)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                        tipoSeleccionado === id
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {tipoSeleccionado === "primera_vez" && (
                  <PrimeraConsultaForm
                    onChange={setPvState}
                    onGenerarPresupuesto={() => {}}
                    obraSocialId={pacienteData?.obraSocialId}
                  />
                )}

                {tipoSeleccionado && tipoSeleccionado !== "primera_vez" && (
                  <Textarea
                    value={textoLibre}
                    onChange={(e) => setTextoLibre(e.target.value)}
                    placeholder={`Notas de ${
                      TIPOS.find((t) => t.id === tipoSeleccionado)?.label ??
                      "consulta"
                    }...`}
                    rows={8}
                    className="resize-none"
                  />
                )}
              </div>
            </ScrollArea>

            {tipoSeleccionado && (
              <div className="border-t pt-3 flex justify-end gap-2 shrink-0">
                <Button
                  onClick={handleSave}
                  disabled={!canSave || createEntry.isPending || saved}
                  size="sm"
                >
                  {createEntry.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />{" "}
                      Guardando...
                    </>
                  ) : saved ? (
                    "✓ Guardado"
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-1" /> Guardar
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* ── LIST MODE ── */
          <ScrollArea className="flex-1 overflow-y-auto pr-1">
            <div className="space-y-4 py-2">
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Historial
                </h3>
                {isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cargando historia clínica...
                  </div>
                ) : dayEntries.length > 0 ? (
                  <div className="space-y-3">
                    {dayEntries.map((entrada: any) => (
                      <EntryCard key={entrada.id} entrada={entrada} />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-md p-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    No hay entradas HC registradas para este día.
                  </div>
                )}
              </div>

              <Separator />

              <div className="border border-dashed border-indigo-200 rounded-lg p-3 bg-indigo-50/40">
                <p className="text-sm text-indigo-700 font-medium mb-1">
                  Agregar información a este día
                </p>
                <p className="text-xs text-indigo-500 mb-3">
                  Las entradas ya registradas no se pueden modificar por razones
                  legales.
                </p>
                <Button
                  size="sm"
                  className="bg-indigo-500 hover:bg-indigo-600 text-white"
                  onClick={() => setShowForm(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Nueva entrada HC
                </Button>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>

      <PatientDrawer
        open={patientDrawerOpen}
        onOpenChange={setPatientDrawerOpen}
        pacienteId={pacienteId || null}
        initialView="historia"
      />
    </>
  );
}

function EntryCard({ entrada }: { entrada: any }) {
  const contenido = (entrada.contenido ?? null) as any;
  const isPrimeraVez = contenido?.tipo === "primera_vez";

  const tipoLabel =
    contenido?.tipo === "primera_vez"
      ? "Primera consulta"
      : contenido?.tipo === "pre_quirurgico"
      ? "Pre quirúrgico"
      : contenido?.tipo === "control"
      ? "Control"
      : contenido?.tipo === "practica"
      ? "Práctica"
      : "Libre";

  return (
    <div className="border rounded-lg p-3 bg-white shadow-sm space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {tipoLabel}
        </span>
        <span className="text-xs text-muted-foreground">
          {format(new Date(entrada.fecha), "d MMM yyyy", { locale: es })}
        </span>
      </div>

      {isPrimeraVez ? (
        <div className="space-y-1.5">
          {contenido.diagnostico?.zonas?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {contenido.diagnostico.zonas.map((z: string) => (
                <Badge key={z} variant="secondary" className="text-xs capitalize">
                  {z}
                </Badge>
              ))}
              {contenido.diagnostico.subzonas?.map((s: string) => (
                <Badge key={s} variant="outline" className="text-xs capitalize">
                  {s}
                </Badge>
              ))}
            </div>
          )}
          {contenido.tratamientos?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {contenido.tratamientos.map((t: any, i: number) => (
                <Badge
                  key={i}
                  className="text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50"
                >
                  {t.nombre}
                </Badge>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {contenido?.texto || "(sin contenido)"}
        </p>
      )}
    </div>
  );
}
