// src/contexts/EventoContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePulynStore, type Event } from '../store/mockData';
import { useAuth } from '../hooks/useAuth';

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
  const { user } = useAuth();
  const [eventoAtual, setEventoAtualState] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const isSelfServiceRole = user?.role === 'kiosk' || user?.role === 'score_kiosk';

  const refreshEvento = async () => {
    if (!eventoAtualId) {
      setEventoAtualState(null);
      setLoading(false);
      return;
    }

    // Totens recebem apenas o ID pelo EventControlBridge e usam suas APIs
    // dedicadas. Nunca consultar /api/eventos/:id com esses perfis.
    if (isSelfServiceRole) {
      setEventoAtualState(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const evento = await loadEventoAtual();
    setEventoAtualState(evento);
    setLoading(false);
  };

  useEffect(() => {
    refreshEvento();
  }, [eventoAtualId, isSelfServiceRole]);

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