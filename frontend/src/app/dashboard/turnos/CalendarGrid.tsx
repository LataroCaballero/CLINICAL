"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import moment from "moment";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { AgendaConfig } from "@/hooks/useProfesionalMe";

// ── Types ──────────────────────────────────────────────────────────────

interface CalendarEvent {
  id: string;
  title: string;
  paciente: string;
  start: Date;
  end: Date;
  tipo: string;
  tipoTurnoId: string;
  estado: "PENDIENTE" | "CONFIRMADO" | "CANCELADO" | "AUSENTE" | "FINALIZADO";
  observaciones?: string;
}

interface CalendarGridProps {
  view: "day" | "week";
  date: Date;
  events: CalendarEvent[];
  agenda: AgendaConfig | null;
  timeRange: { min: Date; max: Date };
  colorMap?: Record<string, string>;
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectSlot: (info: { start: Date }) => void;
  onEventMove: (info: { event: CalendarEvent; start: Date; end: Date }) => void;
  onEventResize: (info: { event: CalendarEvent; start: Date; end: Date }) => void;
  className?: string;
}

// ── Constants ──────────────────────────────────────────────────────────

const HOUR_HEIGHT = 96; // px per hour
const SLOT_SNAP = 15; // minutes snap for drag/resize
const TIME_COL_WIDTH = 56; // px
const MIN_EVENT_HEIGHT = 20; // px

// ── Helpers ────────────────────────────────────────────────────────────

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isSurgeryDay(date: Date, agenda: AgendaConfig | null): boolean {
  if (!agenda?.diasCirugia) return false;
  const dateStr = formatLocalDate(date);
  return agenda.diasCirugia.some((d) => d.fecha === dateStr);
}

function isDayBlocked(date: Date, agenda: AgendaConfig | null): boolean {
  if (!agenda) return false;
  const dateStr = formatLocalDate(date);
  const dow = date.getDay();
  if (isSurgeryDay(date, agenda)) return false;

  const bloqueado = agenda.diasBloqueados?.some((d) => {
    if (d.fechaFin) return dateStr >= d.fecha && dateStr <= d.fechaFin;
    return d.fecha === dateStr;
  });
  if (bloqueado) return true;

  if (agenda.horariosTrabajo) {
    const cfg = agenda.horariosTrabajo[dow];
    if (!cfg || !cfg.activo) return true;
  }
  return false;
}

/** Color scheme by appointment type (bg + left border accent) */
function getEventStyle(
  event: CalendarEvent,
  colorMap?: Record<string, string>
): { bg: string; border: string; text: string } {
  // Check per-professional custom color first
  const customColor = colorMap?.[event.tipoTurnoId];
  if (customColor) {
    return { bg: customColor + "1A", border: customColor, text: customColor };
  }

  // Fallback to hardcoded color scheme
  const tipo = event.tipo.toLowerCase();

  if (tipo.includes("consulta inicial"))
    return { bg: "#EEF2FF", border: "#6366F1", text: "#3730A3" }; // indigo
  if (tipo.includes("consulta") || tipo.includes("control"))
    return { bg: "#F0F9FF", border: "#0EA5E9", text: "#0C4A6E" }; // sky
  if (tipo.includes("cirug"))
    return { bg: "#FFF1F2", border: "#F43F5E", text: "#881337" }; // rose
  if (tipo.includes("procedimiento") || tipo.includes("tratamiento"))
    return { bg: "#F5F3FF", border: "#8B5CF6", text: "#4C1D95" }; // violet
  if (tipo.includes("emergencia") || tipo.includes("urgencia"))
    return { bg: "#FEF2F2", border: "#EF4444", text: "#7F1D1D" }; // red

  return { bg: "#F0FDF4", border: "#22C55E", text: "#14532D" }; // green (default)
}

/** Status indicator dot color */
function getStatusDotColor(estado: CalendarEvent["estado"]): string {
  switch (estado) {
    case "PENDIENTE":  return "#F97316"; // orange
    case "CONFIRMADO": return "#22C55E"; // green
    case "CANCELADO":  return "#EF4444"; // red
    case "AUSENTE":    return "#9CA3AF"; // gray
    case "FINALIZADO": return "#3B82F6"; // blue
    default:           return "#9CA3AF";
  }
}

/** Group overlapping events into columns */
function layoutOverlapping(
  evts: { event: CalendarEvent; top: number; height: number }[]
): { event: CalendarEvent; top: number; height: number; col: number; totalCols: number }[] {
  if (evts.length === 0) return [];

  // sort by top then by height (longer first)
  const sorted = [...evts].sort((a, b) => a.top - b.top || b.height - a.height);

  // build overlap groups
  const groups: (typeof sorted)[] = [];
  let currentGroup = [sorted[0]];
  let groupEnd = sorted[0].top + sorted[0].height;

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    if (item.top < groupEnd) {
      currentGroup.push(item);
      groupEnd = Math.max(groupEnd, item.top + item.height);
    } else {
      groups.push(currentGroup);
      currentGroup = [item];
      groupEnd = item.top + item.height;
    }
  }
  groups.push(currentGroup);

  const result: { event: CalendarEvent; top: number; height: number; col: number; totalCols: number }[] = [];

  for (const group of groups) {
    // assign columns greedily
    const columns: { endTop: number }[] = [];
    for (const item of group) {
      let placed = false;
      for (let c = 0; c < columns.length; c++) {
        if (item.top >= columns[c].endTop) {
          columns[c].endTop = item.top + item.height;
          result.push({ ...item, col: c, totalCols: 0 });
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push({ endTop: item.top + item.height });
        result.push({ ...item, col: columns.length - 1, totalCols: 0 });
      }
    }
    const totalCols = columns.length;
    // update totalCols for all items in this group
    for (let i = result.length - group.length; i < result.length; i++) {
      result[i].totalCols = totalCols;
    }
  }

  return result;
}

function snapToMinutes(minutes: number, snap: number): number {
  return Math.round(minutes / snap) * snap;
}

// ── Component ──────────────────────────────────────────────────────────

export default function CalendarGrid({
  view,
  date,
  events,
  agenda,
  timeRange,
  colorMap,
  onSelectEvent,
  onSelectSlot,
  onEventMove,
  onEventResize,
  className,
}: CalendarGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Compute days to show ─────────────────────────────────────────

  const days = useMemo(() => {
    if (view === "day") return [new Date(date)];
    // week: lunes a domingo
    const start = moment(date).startOf("week");
    return Array.from({ length: 7 }, (_, i) =>
      start.clone().add(i, "day").toDate()
    );
  }, [view, date]);

  // ── Time grid range ──────────────────────────────────────────────

  const startHour = timeRange.min.getHours();
  const startMinute = timeRange.min.getMinutes();
  const endHour = timeRange.max.getHours();
  const endMinute = timeRange.max.getMinutes();

  const totalMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
  const totalHeight = (totalMinutes / 60) * HOUR_HEIGHT;

  // generate hour labels
  const hours = useMemo(() => {
    const result: { hour: number; minute: number; label: string }[] = [];
    let h = startHour;
    let m = startMinute;
    const endM = endHour * 60 + endMinute;
    while (h * 60 + m < endM) {
      result.push({
        hour: h,
        minute: m,
        label: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      });
      m += 30;
      if (m >= 60) { h++; m = 0; }
    }
    return result;
  }, [startHour, startMinute, endHour, endMinute]);

  // ── Scroll to current time on mount ──────────────────────────────

  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const minsFromStart = (now.getHours() * 60 + now.getMinutes()) - (startHour * 60 + startMinute);
      if (minsFromStart > 0) {
        const scrollTo = (minsFromStart / 60) * HOUR_HEIGHT - 100;
        scrollRef.current.scrollTop = Math.max(0, scrollTo);
      }
    }
  }, [startHour, startMinute]);

  // ── Current time indicator ───────────────────────────────────────

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const gridStartMinutes = startHour * 60 + startMinute;
  const gridEndMinutes = endHour * 60 + endMinute;
  const nowInRange = nowMinutes >= gridStartMinutes && nowMinutes <= gridEndMinutes;
  const nowTop = ((nowMinutes - gridStartMinutes) / 60) * HOUR_HEIGHT;

  // ── Drag & Drop state ────────────────────────────────────────────

  const DRAG_THRESHOLD = 5; // px of movement before it counts as a drag
  // px per snap unit (SLOT_SNAP minutes)
  const SNAP_PX = (SLOT_SNAP / 60) * HOUR_HEIGHT;

  const [dragState, setDragState] = useState<{
    eventId: string;
    mode: "move" | "resize";
    startY: number;
    startX: number;
    origTop: number;
    origHeight: number;
    origDayIndex: number;
    currentDeltaY: number;
    currentDayIndex: number;
    didDrag: boolean; // true once pointer moved past threshold
  } | null>(null);

  const dragStateRef = useRef(dragState);
  dragStateRef.current = dragState;

  // global pointer handlers for drag
  useEffect(() => {
    if (!dragState) return;

    const onPointerMove = (e: PointerEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;

      const rawDeltaY = e.clientY - ds.startY;
      const rawDeltaX = e.clientX - ds.startX;

      // Check if we've passed the drag threshold
      const hasMoved = Math.abs(rawDeltaY) > DRAG_THRESHOLD || Math.abs(rawDeltaX) > DRAG_THRESHOLD;
      const didDrag = ds.didDrag || hasMoved;

      // Snap deltaY to grid increments
      const snappedDeltaY = Math.round(rawDeltaY / SNAP_PX) * SNAP_PX;

      let newDayIndex = ds.origDayIndex;
      if (ds.mode === "move" && view === "week" && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const dayAreaWidth = rect.width - TIME_COL_WIDTH;
        const colWidth = dayAreaWidth / days.length;
        const relX = e.clientX - rect.left - TIME_COL_WIDTH;
        newDayIndex = Math.max(0, Math.min(days.length - 1, Math.floor(relX / colWidth)));
      }

      setDragState((prev) => prev ? {
        ...prev,
        currentDeltaY: didDrag ? snappedDeltaY : 0,
        currentDayIndex: didDrag ? newDayIndex : ds.origDayIndex,
        didDrag,
      } : null);
    };

    const onPointerUp = () => {
      const ds = dragStateRef.current;
      if (!ds) return;

      // If the pointer never moved past threshold, it was a click → do nothing
      if (!ds.didDrag) {
        setDragState(null);
        return;
      }

      const draggedEvent = events.find((e) => e.id === ds.eventId);
      if (!draggedEvent) { setDragState(null); return; }

      // Convert snapped pixel delta back to minutes
      const minutesDelta = (ds.currentDeltaY / HOUR_HEIGHT) * 60;
      const snappedDelta = snapToMinutes(minutesDelta, SLOT_SNAP);

      // Skip if nothing actually changed
      const dayDiff = ds.currentDayIndex - ds.origDayIndex;
      if (snappedDelta === 0 && dayDiff === 0) {
        setDragState(null);
        return;
      }

      if (ds.mode === "move") {
        const newStart = new Date(draggedEvent.start);
        newStart.setMinutes(newStart.getMinutes() + snappedDelta);
        if (dayDiff !== 0) newStart.setDate(newStart.getDate() + dayDiff);

        const duration = draggedEvent.end.getTime() - draggedEvent.start.getTime();
        const newEnd = new Date(newStart.getTime() + duration);

        onEventMove({ event: draggedEvent, start: newStart, end: newEnd });
      } else {
        const newEnd = new Date(draggedEvent.end);
        newEnd.setMinutes(newEnd.getMinutes() + snappedDelta);
        if (newEnd <= draggedEvent.start) {
          newEnd.setTime(draggedEvent.start.getTime() + SLOT_SNAP * 60_000);
        }
        onEventResize({ event: draggedEvent, start: draggedEvent.start, end: newEnd });
      }

      setDragState(null);
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    };
  }, [dragState, events, days.length, view, onEventMove, onEventResize]);

  // ── Slot click handler ───────────────────────────────────────────

  const handleSlotClick = useCallback(
    (dayDate: Date, clientY: number, colEl: HTMLElement) => {
      const rect = colEl.getBoundingClientRect();
      const relY = clientY - rect.top;
      const minutesFromStart = (relY / HOUR_HEIGHT) * 60;
      const snapped = snapToMinutes(minutesFromStart, SLOT_SNAP);

      const clickDate = new Date(dayDate);
      clickDate.setHours(startHour, startMinute, 0, 0);
      clickDate.setMinutes(clickDate.getMinutes() + snapped);

      onSelectSlot({ start: clickDate });
    },
    [onSelectSlot, startHour, startMinute]
  );

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className={`rounded-md border border-gray-200 overflow-hidden select-none flex flex-col ${className ?? ""}`}>
      {/* Header row */}
      <div className="flex border-b border-gray-200">
        <div
          className="shrink-0 border-r border-gray-200 bg-gray-50"
          style={{ width: TIME_COL_WIDTH }}
        />
        <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
          {days.map((day, i) => {
            const surgery = isSurgeryDay(day, agenda);
            const blocked = isDayBlocked(day, agenda);
            const isToday = formatLocalDate(day) === formatLocalDate(new Date());

            let bg = "bg-gray-50";
            if (surgery) bg = "bg-yellow-50";
            else if (blocked) bg = "bg-gray-200";

            return (
              <div
                key={i}
                className={`text-center py-2 text-sm font-medium border-r border-gray-200 last:border-r-0 ${bg}`}
              >
                <span className={`${isToday ? "text-indigo-600 font-bold" : "text-gray-700"}`}>
                  {moment(day).format(view === "day" ? "dddd D [de] MMMM" : "ddd D")}
                </span>
                {surgery && (
                  <span className="ml-1 text-xs text-yellow-700 font-medium">
                    (Cirugía)
                  </span>
                )}
                {blocked && (
                  <span className="ml-1 text-xs text-gray-400">
                    (No disponible)
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Scrollable body */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex relative" style={{ height: totalHeight }}>
          {/* Time column */}
          <div
            className="shrink-0 border-r border-gray-200 relative bg-gray-50"
            style={{ width: TIME_COL_WIDTH }}
          >
            {hours.map((h, i) => (
              <div
                key={i}
                className="absolute right-2 text-xs text-gray-500 -translate-y-1/2"
                style={{ top: ((h.hour * 60 + h.minute - gridStartMinutes) / 60) * HOUR_HEIGHT }}
              >
                {h.label}
              </div>
            ))}
          </div>

          {/* Day columns grid */}
          <div className="flex-1 grid relative" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
            {days.map((day, dayIdx) => {
              const surgery = isSurgeryDay(day, agenda);
              const blocked = isDayBlocked(day, agenda);
              const isToday = formatLocalDate(day) === formatLocalDate(now);
              const dayStr = formatLocalDate(day);

              let slotBg = "";
              if (surgery) slotBg = "bg-yellow-50/50";
              else if (blocked) slotBg = "bg-gray-100/50";

              // events for this day
              const dayEvents = events.filter(
                (e) => formatLocalDate(e.start) === dayStr
              );

              // compute positions
              const positioned = dayEvents.map((evt) => {
                const evtMinStart = evt.start.getHours() * 60 + evt.start.getMinutes();
                const evtMinEnd = evt.end.getHours() * 60 + evt.end.getMinutes();
                const top = ((evtMinStart - gridStartMinutes) / 60) * HOUR_HEIGHT;
                const height = Math.max(MIN_EVENT_HEIGHT, ((evtMinEnd - evtMinStart) / 60) * HOUR_HEIGHT);
                return { event: evt, top, height };
              });

              const laidOut = layoutOverlapping(positioned);

              return (
                <div
                  key={dayIdx}
                  className={`relative border-r border-gray-200 last:border-r-0 ${slotBg}`}
                  onClick={(e) => {
                    // only fire if clicking on the column background, not on an event
                    if ((e.target as HTMLElement).closest("[data-event]")) return;
                    handleSlotClick(day, e.clientY, e.currentTarget);
                  }}
                >
                  {/* Half-hour grid lines */}
                  {hours.map((h, i) => (
                    <div
                      key={i}
                      className="absolute w-full border-t border-gray-100"
                      style={{ top: ((h.hour * 60 + h.minute - gridStartMinutes) / 60) * HOUR_HEIGHT }}
                    />
                  ))}

                  {/* Current time indicator */}
                  {isToday && nowInRange && (
                    <div
                      className="absolute w-full z-20 pointer-events-none"
                      style={{ top: nowTop }}
                    >
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                        <div className="flex-1 h-[2px] bg-red-500" />
                      </div>
                    </div>
                  )}

                  {/* Events */}
                  {laidOut.map((item) => {
                    const style = getEventStyle(item.event, colorMap);
                    const dotColor = getStatusDotColor(item.event.estado);
                    const isDragging = dragState?.eventId === item.event.id;
                    const isDraggable =
                      item.event.estado !== "CANCELADO" && item.event.estado !== "FINALIZADO";
                    const isCancelled = item.event.estado === "CANCELADO";

                    // compute visual offsets when dragging
                    let visualTop = item.top;
                    let visualHeight = item.height;
                    let visualDayIdx = dayIdx;

                    if (isDragging && dragState) {
                      if (dragState.mode === "move") {
                        visualTop = dragState.origTop + dragState.currentDeltaY;
                        visualDayIdx = dragState.currentDayIndex;
                      } else {
                        visualHeight = dragState.origHeight + dragState.currentDeltaY;
                        visualHeight = Math.max(MIN_EVENT_HEIGHT, visualHeight);
                      }
                    }

                    // Don't render here if being dragged to another day
                    if (isDragging && dragState?.mode === "move" && visualDayIdx !== dayIdx) {
                      return null;
                    }

                    return (
                      <TooltipProvider key={item.event.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              data-event
                              className={`absolute rounded-md overflow-hidden cursor-pointer transition-shadow ${
                                isDragging
                                  ? "shadow-lg ring-2 ring-indigo-400 z-30 opacity-90"
                                  : "z-10 hover:shadow-md hover:brightness-[0.97]"
                              } ${isCancelled ? "opacity-50" : ""}`}
                              style={{
                                top: visualTop,
                                height: visualHeight,
                                left: `${(item.col / item.totalCols) * 100}%`,
                                width: `${(1 / item.totalCols) * 100 - 2}%`,
                                backgroundColor: style.bg,
                                borderLeft: `3px solid ${style.border}`,
                                userSelect: "none",
                                touchAction: "none",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!dragState) onSelectEvent(item.event);
                              }}
                              onPointerDown={(e) => {
                                if (!isDraggable) return;
                                e.stopPropagation();
                                e.preventDefault();
                                (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

                                setDragState({
                                  eventId: item.event.id,
                                  mode: "move",
                                  startY: e.clientY,
                                  startX: e.clientX,
                                  origTop: item.top,
                                  origHeight: item.height,
                                  origDayIndex: dayIdx,
                                  currentDeltaY: 0,
                                  currentDayIndex: dayIdx,
                                  didDrag: false,
                                });
                              }}
                            >
                              {/* Status dot */}
                              <div
                                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-1 ring-white"
                                style={{ backgroundColor: dotColor }}
                              />

                              <div className="px-2 py-1 h-full flex flex-col justify-start gap-0.5">
                                <div
                                  className="font-semibold truncate text-[11px] leading-tight pr-3"
                                  style={{ color: style.text }}
                                >
                                  {item.event.tipo}
                                </div>
                                <div className="truncate text-[11px] leading-tight text-gray-600">
                                  {item.event.paciente}
                                </div>
                                {visualHeight > 48 && (
                                  <div className="text-[10px] leading-tight text-gray-400 mt-auto">
                                    {moment(item.event.start).format("HH:mm")} - {moment(item.event.end).format("HH:mm")}
                                  </div>
                                )}
                              </div>

                              {/* Resize handle */}
                              {isDraggable && (
                                <div
                                  className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-black/10 rounded-b"
                                  onPointerDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();

                                    setDragState({
                                      eventId: item.event.id,
                                      mode: "resize",
                                      startY: e.clientY,
                                      startX: e.clientX,
                                      origTop: item.top,
                                      origHeight: item.height,
                                      origDayIndex: dayIdx,
                                      currentDeltaY: 0,
                                      currentDayIndex: dayIdx,
                                      didDrag: false,
                                    });
                                  }}
                                />
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-white border border-gray-100 text-gray-700 shadow-lg text-xs p-2.5 rounded-lg space-y-1">
                            <p className="font-semibold" style={{ color: style.text }}>{item.event.tipo}</p>
                            <p><span className="text-gray-400">Paciente:</span> {item.event.paciente}</p>
                            <p>
                              <span className="text-gray-400">Hora:</span>{" "}
                              {moment(item.event.start).format("HH:mm")} - {moment(item.event.end).format("HH:mm")}
                            </p>
                            <p className="flex items-center gap-1.5">
                              <span
                                className="inline-block w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: dotColor }}
                              />
                              {item.event.estado}
                            </p>
                            {item.event.observaciones && (
                              <p className="text-gray-400 italic">{item.event.observaciones}</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}

                  {/* Render dragged event ghost in target day column */}
                  {dragState?.mode === "move" && dragState.currentDayIndex === dayIdx && (() => {
                    const draggedEvt = events.find((e) => e.id === dragState.eventId);
                    if (!draggedEvt) return null;
                    const origDayStr = formatLocalDate(draggedEvt.start);
                    if (origDayStr === dayStr) return null;

                    const evtMinStart = draggedEvt.start.getHours() * 60 + draggedEvt.start.getMinutes();
                    const evtMinEnd = draggedEvt.end.getHours() * 60 + draggedEvt.end.getMinutes();
                    const origTop = ((evtMinStart - gridStartMinutes) / 60) * HOUR_HEIGHT;
                    const origHeight = Math.max(MIN_EVENT_HEIGHT, ((evtMinEnd - evtMinStart) / 60) * HOUR_HEIGHT);
                    const ghostStyle = getEventStyle(draggedEvt, colorMap);

                    return (
                      <div
                        data-event
                        className="absolute rounded-md overflow-hidden shadow-lg ring-2 ring-indigo-400 z-30 opacity-90"
                        style={{
                          top: origTop + dragState.currentDeltaY,
                          height: origHeight,
                          left: 0,
                          width: "96%",
                          backgroundColor: ghostStyle.bg,
                          borderLeft: `3px solid ${ghostStyle.border}`,
                          pointerEvents: "none",
                        }}
                      >
                        <div className="px-2 py-1">
                          <div className="font-semibold truncate text-[11px] leading-tight" style={{ color: ghostStyle.text }}>
                            {draggedEvt.tipo}
                          </div>
                          <div className="truncate text-gray-600 text-[11px] leading-tight">
                            {draggedEvt.paciente}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
