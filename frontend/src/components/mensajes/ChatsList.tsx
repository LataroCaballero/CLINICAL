'use client';

import { useMensajesChats } from '@/hooks/useMensajesChats';
import { useMensajesStore } from '@/store/mensajes-internos.store';
import { ChatItem } from './ChatItem';
import { Loader2, MessageSquare, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ChatsList() {
  const { data: chats, isLoading, error } = useMensajesChats();
  const selectedPacienteId = useMensajesStore((s) => s.selectedPacienteId);
  const selectChat = useMensajesStore((s) => s.selectChat);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredChats = useMemo(() => {
    if (!chats) return [];
    if (!searchTerm.trim()) return chats;

    const term = searchTerm.toLowerCase();
    return chats.filter((chat) =>
      chat.nombreCompleto.toLowerCase().includes(term)
    );
  }, [chats, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <p className="text-sm text-destructive">Error al cargar los chats</p>
        <p className="text-xs text-muted-foreground mt-1">
          Intenta de nuevo mas tarde
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar paciente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
            <MessageSquare className="h-10 w-10 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              {searchTerm ? 'No se encontraron chats' : 'No hay conversaciones'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {!searchTerm && 'Envia un mensaje desde la ficha de un paciente'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredChats.map((chat) => (
              <ChatItem
                key={chat.id}
                chat={chat}
                isSelected={selectedPacienteId === chat.id}
                onClick={() => selectChat(chat.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
