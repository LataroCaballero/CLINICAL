'use client';

import { useState, useRef, useEffect } from 'react';
import { RefreshCw, ArrowLeft, Send, RotateCcw, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

import {
  useWAThread,
  useSendWAFreeText,
  useRetryWAMessage,
  WAMessage,
} from '@/hooks/useWAThread';
import { DeliveryIcon } from './DeliveryIcon';
import SendWAMessageModal from './SendWAMessageModal';

type Props = {
  pacienteId: string;
  pacienteNombre?: string;
  whatsappOptIn: boolean;
  onBack: () => void;
  pacienteEmail?: string;
};

function formatTime(dateStr: string): string {
  return format(new Date(dateStr), 'HH:mm');
}

function formatDateGroup(dateStr: string): string {
  return format(new Date(dateStr), "d 'de' MMMM yyyy", { locale: es });
}

function groupMessagesByDate(messages: WAMessage[]): Array<{ date: string; messages: WAMessage[] }> {
  const groups: Record<string, WAMessage[]> = {};
  for (const msg of messages) {
    const key = format(new Date(msg.createdAt), 'yyyy-MM-dd');
    if (!groups[key]) groups[key] = [];
    groups[key].push(msg);
  }
  return Object.entries(groups).map(([date, messages]) => ({ date, messages }));
}

function isWithin24h(messages: WAMessage[]): boolean {
  const lastInbound = [...messages].reverse().find((m) => m.direccion === 'INBOUND');
  if (!lastInbound) return false;
  const diff = Date.now() - new Date(lastInbound.createdAt).getTime();
  return diff < 24 * 60 * 60 * 1000;
}

export default function WAThreadView({
  pacienteId,
  pacienteNombre,
  whatsappOptIn,
  onBack,
  pacienteEmail,
}: Props) {
  const { data: messages = [], isLoading, refetch } = useWAThread(pacienteId);
  const sendFreeText = useSendWAFreeText();
  const retryMessage = useRetryWAMessage();

  const [freeText, setFreeText] = useState('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const canSendFreeText = isWithin24h(messages);
  const groups = groupMessagesByDate(messages);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSendFreeText() {
    const text = freeText.trim();
    if (!text) return;
    sendFreeText.mutate({ pacienteId, texto: text });
    setFreeText('');
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="font-medium text-sm leading-tight">
              {pacienteNombre ?? 'Paciente'}
            </p>
            <p className="text-xs text-muted-foreground">Mensajes WhatsApp</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => refetch()}
          className="h-8 w-8"
          title="Actualizar mensajes"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-10 w-2/3 ml-auto rounded-2xl" />
            <Skeleton className="h-10 w-1/2 rounded-2xl" />
            <Skeleton className="h-10 w-3/4 ml-auto rounded-2xl" />
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No hay mensajes aun</p>
          </div>
        )}

        {!isLoading && groups.map(({ date, messages: dayMessages }) => (
          <div key={date} className="space-y-2">
            {/* Date separator */}
            <div className="flex items-center gap-2 py-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground px-2 whitespace-nowrap">
                {formatDateGroup(dayMessages[0].createdAt)}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Messages for this day */}
            {dayMessages.map((msg) => {
              const isOutbound = msg.direccion === 'OUTBOUND';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`
                      px-3 py-2 text-sm shadow-sm max-w-[80%]
                      ${isOutbound
                        ? 'bg-green-100 text-gray-800 rounded-tl-2xl rounded-tr-sm rounded-b-2xl'
                        : 'bg-white border text-gray-800 rounded-tr-2xl rounded-tl-sm rounded-b-2xl'
                      }
                    `}
                  >
                    {/* Message content */}
                    <p className="whitespace-pre-wrap break-words">
                      {msg.contenido ?? <span className="italic text-muted-foreground">[mensaje sin contenido]</span>}
                    </p>

                    {/* Error message */}
                    {msg.errorMsg && (
                      <p className="text-xs text-red-500 mt-1">{msg.errorMsg}</p>
                    )}

                    {/* Footer: time + delivery + retry */}
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {formatTime(msg.createdAt)}
                      </span>
                      {isOutbound && <DeliveryIcon estado={msg.estado} />}
                      {isOutbound && msg.estado === 'FALLIDO' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-red-500 hover:text-red-700 ml-1"
                          title="Reintentar"
                          onClick={() =>
                            retryMessage.mutate({ mensajeId: msg.id, pacienteId })
                          }
                          disabled={retryMessage.isPending}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Bottom input area */}
      <div className="shrink-0 bg-white border-t px-4 py-3 space-y-2">
        {/* Send template button */}
        <div className="flex items-center gap-2">
          {whatsappOptIn ? (
            <Button
              variant="outline"
              size="sm"
              className="text-green-700 border-green-300 hover:bg-green-50"
              onClick={() => setShowTemplateModal(true)}
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Enviar mensaje
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-muted-foreground border-dashed"
                    disabled
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Enviar mensaje
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                El paciente no tiene opt-in para WhatsApp
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Free-text reply area */}
        <div className="space-y-1">
          {!canSendFreeText && messages.some((m) => m.direccion === 'INBOUND') && (
            <p className="text-xs text-amber-600">
              Ventana de 24h cerrada. Solo podras enviar templates.
            </p>
          )}
          <div className="flex items-end gap-2">
            <Textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder={
                canSendFreeText
                  ? 'Responder directamente...'
                  : 'Sin ventana de 24h activa'
              }
              className="resize-none min-h-[40px] max-h-[100px] text-sm"
              disabled={!canSendFreeText || !whatsappOptIn}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendFreeText();
                }
              }}
            />
            <Button
              size="icon"
              className="h-9 w-9 shrink-0"
              disabled={
                !freeText.trim() ||
                !canSendFreeText ||
                !whatsappOptIn ||
                sendFreeText.isPending
              }
              onClick={handleSendFreeText}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Template send modal */}
      <SendWAMessageModal
        pacienteId={pacienteId}
        open={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        pacienteEmail={pacienteEmail}
      />
    </div>
  );
}
