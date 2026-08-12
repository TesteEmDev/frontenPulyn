// src/contexts/EventoContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePulynStore, type Event } from '../store/mockData';

interface EventoContextType {
  eventoAtualId: string | null;
  setEventoAtualId: (id: string | null) => void;
  eventoAtual: Event | null;
  loading: boolean;
  refreshEvento: () => Promise<void>;
}

const EventoContext = createContext<EventoContextType>({} as EventoContextType);

export function EventoProvider({ children }: { children: React.ReactNode }) {
  const { eventoAtualId, setEventoAtual, loadEventoAtual } = usePulynStore();
  const [eventoAtual, setEventoAtualState] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshEvento = async () => {
    if (eventoAtualId) {
      setLoading(true);
      const evento = await loadEventoAtual();
      setEventoAtualState(evento);
      setLoading(false);
    } else {
      setEventoAtualState(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshEvento();
  }, [eventoAtualId]);

  return (
    <EventoContext.Provider
      value={{
        eventoAtualId,
        setEventoAtualId: setEventoAtual,
        eventoAtual,
        loading,
        refreshEvento,
      }}
    >
      {children}
    </EventoContext.Provider>
  );
}

export const useEvento = () => useContext(EventoContext);