'use client';

import { useState, useEffect } from 'react';
import { Calendar, Check, Loader2 } from 'lucide-react';
import { format, addMinutes, setHours, setMinutes, isBefore, isAfter, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLiveTurnoStore } from '@/store/live-turno.store';
import { useTiposTurno } from '@/hooks/useTipoTurnos';
import { useAgenda } from '@/hooks/useAgenda';
import { useTurnosRango, TurnoRango } from '@/hooks/useTurnosRangos';
import type { AgendaConfig } from '@/hooks/useProfesionalMe';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// Helpers para validar disponibilidad (copiados de QuickAppointment)
function isDayBlocked(date: Date, agenda: AgendaConfig | null): boolean {
  if (!agenda?.diasBloqueados) return false;
  const dateStr = format(date, 'yyyy-MM-dd');
  return agenda.diasBloqueados.some((d) => {
    if (d.fechaFin) {
      return dateStr >= d.fecha && dateStr <= d.fechaFin;
    }
    return d.fecha === dateStr;
  });
}

function isSurgeryDay(date: Date, agenda: AgendaConfig | null): boolean {
  if (!agenda?.diasCirugia) return false;
  const dateStr = format(date, 'yyyy-MM-dd');
  return agenda.diasCirugia.some((d) => d.fecha === dateStr);
}

function isWorkingDay(date: Date, agenda: AgendaConfig | null): boolean {
  if (isSurgeryDay(date, agenda)) return true;
  if (!agenda?.horariosTrabajo) return true;
  const dayOfWeek = date.getDay();
  const dayConfig = agenda.horariosTrabajo[dayOfWeek];
  return dayConfig?.activo ?? false;
}

function generateTimeSlots(
  date: Date | undefined,
  agenda: AgendaConfig | null,
  interval: number = 30
): string[] {
  if (!date) return [];

  const dateStr = format(date, 'yyyy-MM-dd');

  // Si es dia de cirugia, usar los horarios de cirugia
  const surgeryConfig = agenda?.diasCirugia?.find((d) => d.fecha === dateStr);
  if (surgeryConfig) {
    const slots: string[] = [];
    const [startH, startM] = surgeryConfig.inicio.split(':').map(Number);
    const [endH, endM] = surgeryConfig.fin.split(':').map(Number);

    let current = setMinutes(setHours(new Date(), startH), startM);
    const end = setMinutes(setHours(new Date(), endH), endM);

    while (current < end) {
      slots.push(format(current, 'HH:mm'));
      current = addMinutes(current, interval);
    }
    return slots;
  }

  if (!agenda?.horariosTrabajo) return [];

  const dayOfWeek = date.getDay();
  const dayConfig = agenda.horariosTrabajo[dayOfWeek];

  if (!dayConfig?.activo || !dayConfig.bloques?.length) return [];

  const slots: string[] = [];

  for (const bloque of dayConfig.bloques) {
    const [startH, startM] = bloque.inicio.split(':').map(Number);
    const [endH, endM] = bloque.fin.split(':').map(Number);

    let current = setMinutes(setHours(new Date(), startH), startM);
    const end = setMinutes(setHours(new Date(), endH), endM);

    while (current < end) {
      slots.push(format(current, 'HH:mm'));
      current = addMinutes(current, interval);
    }
  }

  return slots;
}

function filterAvailableSlots(
  slots: string[],
  turnos: TurnoRango[],
  selectedDate: Date,
  duracionMinutos: number = 30
): string[] {
  if (!turnos.length) return slots;

  const turnosActivos = turnos.filter(
    (t) => t.estado !== 'CANCELADO' && t.estado !== 'AUSENTE'
  );

  return slots.filter((slotTime) => {
    const [slotH, slotM] = slotTime.split(':').map(Number);
    const slotStart = setMinutes(
      setHours(new Date(selectedDate), slotH),
      slotM
    );
    const slotEnd = addMinutes(slotStart, duracionMinutos);

    const hasOverlap = turnosActivos.some((turno) => {
      const turnoStart = new Date(turno.inicio);
      const turnoEnd = new Date(turno.fin);
      return isBefore(slotStart, turnoEnd) && isAfter(slotEnd, turnoStart);
    });

    return !hasOverlap;
  });
}

export function NuevoTurnoTab() {
  const qc = useQueryClient();
  const { session, draftData, setDraftData } = useLiveTurnoStore();
  const { data: tiposTurno } = useTiposTurno();
  const { data: agenda } = useAgenda(session?.profesionalId || null);
  const [turnoCreated, setTurnoCreated] = useState(false);

  const scheduledData = draftData.scheduledTurnoData || {};

  // Estado local para fecha y hora seleccionadas
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    scheduledData.fecha ? new Date(scheduledData.fecha) : undefined
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(
    scheduledData.hora || null
  );
  const [duracionMinutos, setDuracionMinutos] = useState<number>(30);

  // Obtener turnos del dia seleccionado
  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined;
  const { data: turnosDelDia = [], isLoading: loadingTurnos } = useTurnosRango(
    session?.profesionalId,
    selectedDateStr,
    selectedDateStr
  );

  // Actualizar duracion cuando cambia el tipo de turno
  const tipoTurnoSeleccionado = tiposTurno?.find((t) => t.id === scheduledData.tipoTurnoId);
  useEffect(() => {
    if (tipoTurnoSeleccionado) {
      setDuracionMinutos(tipoTurnoSeleccionado.duracionDefault || 30);
    }
  }, [tipoTurnoSeleccionado]);

  // Generar slots y filtrar los ocupados
  const allSlots = generateTimeSlots(selectedDate, agenda ?? null);
  const availableSlots = selectedDate
    ? filterAvailableSlots(allSlots, turnosDelDia, selectedDate, duracionMinutos)
    : [];

  const isSurgeryDaySelected = selectedDate ? isSurgeryDay(selectedDate, agenda ?? null) : false;

  const createTurno = useMutation({
    mutationFn: async () => {
      if (!session || !selectedDate || !selectedTime || !scheduledData.tipoTurnoId) {
        throw new Error('Datos incompletos');
      }

      const inicio = parse(
        `${format(selectedDate, 'yyyy-MM-dd')} ${selectedTime}`,
        'yyyy-MM-dd HH:mm',
        new Date()
      );

      const { data } = await api.post('/turnos', {
        pacienteId: session.pacienteId,
        profesionalId: session.profesionalId,
        tipoTurnoId: scheduledData.tipoTurnoId,
        inicio: inicio.toISOString(),
        duracionMinutos,
        observaciones: scheduledData.observaciones,
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Turno agendado correctamente');
      setTurnoCreated(true);
      qc.invalidateQueries({ queryKey: ['turnos'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al agendar turno');
    },
  });

  if (!session) return null;

  const updateDraft = (field: string, value: string) => {
    setDraftData('scheduledTurnoData', {
      ...scheduledData,
      [field]: value,
    });
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime(null);
    if (date) {
      updateDraft('fecha', format(date, 'yyyy-MM-dd'));
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    updateDraft('hora', time);
  };

  const isFormValid = selectedDate && selectedTime && scheduledData.tipoTurnoId;

  if (turnoCreated) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Turno agendado</h3>
            <p className="text-gray-500 mb-4">
              El proximo turno para {session.pacienteNombre} ha sido agendado correctamente.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setTurnoCreated(false);
                setSelectedDate(undefined);
                setSelectedTime(null);
                setDraftData('scheduledTurnoData', {});
              }}
            >
              Agendar otro turno
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Agendar Proximo Turno
          </CardTitle>
          <CardDescription>
            Programa el proximo turno para {session.pacienteNombre}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tipo de turno primero para determinar duracion */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de turno</label>
            <Select
              value={scheduledData.tipoTurnoId || ''}
              onValueChange={(value) => updateDraft('tipoTurnoId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                {tiposTurno?.map((tipo) => (
                  <SelectItem key={tipo.id} value={tipo.id}>
                    {tipo.nombre} ({tipo.duracionDefault || 30} min)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Calendario y horarios */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Calendario */}
            <div className="flex-1 flex justify-center">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                locale={es}
                disabled={(d) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  if (d < today) return true;
                  if (!isWorkingDay(d, agenda ?? null)) return true;
                  if (isDayBlocked(d, agenda ?? null)) return true;
                  return false;
                }}
                modifiers={{
                  cirugia: (d) => isSurgeryDay(d, agenda ?? null),
                  bloqueado: (d) => isDayBlocked(d, agenda ?? null),
                }}
                modifiersStyles={{
                  cirugia: {
                    backgroundColor: '#FEF9C3',
                    color: '#854D0E',
                    fontWeight: 'bold',
                  },
                  bloqueado: {
                    backgroundColor: '#FEE2E2',
                    color: '#991B1B',
                    fontWeight: 'bold',
                  },
                }}
                className="rounded-md border"
              />
            </div>

            {/* Horarios disponibles */}
            <div className="flex-1 flex flex-col gap-2 max-h-[300px] overflow-y-auto">
              {!selectedDate ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Selecciona una fecha para ver horarios disponibles
                </p>
              ) : loadingTurnos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : availableSlots.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No hay horarios disponibles para este dia
                </p>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Horarios disponibles ({availableSlots.length})
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((time) => (
                      <Button
                        key={time}
                        variant={selectedTime === time ? 'default' : 'outline'}
                        size="sm"
                        className={selectedTime === time ? 'bg-indigo-500 text-white' : ''}
                        onClick={() => handleTimeSelect(time)}
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Indicador de dia de cirugia */}
          {isSurgeryDaySelected && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              Este es un dia de cirugia - Los horarios corresponden al bloque quirurgico
            </div>
          )}

          {/* Observaciones */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Observaciones (opcional)</label>
            <Textarea
              placeholder="Notas adicionales para el turno..."
              value={scheduledData.observaciones || ''}
              onChange={(e) => updateDraft('observaciones', e.target.value)}
              rows={2}
            />
          </div>

          {/* Resumen */}
          {selectedDate && selectedTime && (
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <strong>Resumen:</strong> {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })} a las {selectedTime}
              {tipoTurnoSeleccionado && ` - ${tipoTurnoSeleccionado.nombre} (${duracionMinutos} min)`}
            </div>
          )}

          <Button
            onClick={() => createTurno.mutate()}
            disabled={!isFormValid || createTurno.isPending}
            className="w-full"
          >
            {createTurno.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Calendar className="w-4 h-4 mr-2" />
            )}
            Agendar turno
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
