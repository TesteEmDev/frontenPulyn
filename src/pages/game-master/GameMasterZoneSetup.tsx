import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Settings, Save, X } from 'lucide-react';

interface Checkpoint {
  id: string;
  name: string;
  zone?: string;
  location?: string;
  points?: number;
  status: string;
}

interface Evento {
  id: string;
  name: string;
}

interface GameMasterZoneSetupState {
  eventos: Evento[];
  eventoId: string;
  selectedCheckpoints: Map<string, number>;
  checkpoints: Checkpoint[];
  loading: boolean;
  saving: boolean;
  message: string;
}

export default function GameMasterZoneSetup() {
  const navigate = useNavigate();
  const [state, setState] = useState<GameMasterZoneSetupState>({
    eventos: [],
    eventoId: '',
    selectedCheckpoints: new Map(),
    checkpoints: [],
    loading: true,
    saving: false,
    message: ''
  });

  // Carregar eventos ao montar
  useEffect(() => {
    loadEvents();
  }, []);

  // Quando evento mudar, carregar checkpoints
  useEffect(() => {
    if (state.eventoId) {
      loadCheckpoints();
    }
  }, [state.eventoId]);

  const loadEvents = async () => {
    try {
      const response = await api.getEventos();
      const eventos = response || [];
      const firstEventId = eventos.length > 0 ? eventos[0].id : '';
      setState(prev => ({ 
        ...prev, 
        eventos,
        eventoId: firstEventId,
        loading: false
      }));
    } catch (error) {
      console.error('❌ Erro ao carregar eventos:', error);
      setState(prev => ({ ...prev, loading: false, message: 'Erro ao carregar eventos' }));
    }
  };

  const loadCheckpoints = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const response = await api.getCheckpoints(state.eventoId);
      setState(prev => ({
        ...prev,
        checkpoints: response || [],
        loading: false,
        selectedCheckpoints: new Map() // Limpar seleção ao mudar evento
      }));
    } catch (error) {
      console.error('❌ Erro ao carregar checkpoints:', error);
      setState(prev => ({ ...prev, loading: false, message: 'Erro ao carregar checkpoints' }));
    }
  };

  const handlePointsChange = (checkpointId: string, points: number) => {
    setState(prev => {
      const updated = new Map(prev.selectedCheckpoints);
      if (points > 0) {
        updated.set(checkpointId, points);
      } else {
        updated.delete(checkpointId);
      }
      return { ...prev, selectedCheckpoints: updated };
    });
  };

  const handleSaveConfiguration = async () => {
    if (state.selectedCheckpoints.size === 0) {
      setState(prev => ({ ...prev, message: '⚠️ Selecione pelo menos um checkpoint' }));
      return;
    }

    setState(prev => ({ ...prev, saving: true }));

    try {
      // Atualizar cada checkpoint com os pontos configurados
      const updates = Array.from(state.selectedCheckpoints.entries()).map(([checkpointId, points]) =>
        api.saveCheckpointConfig(checkpointId, { points }, state.eventoId)
      );

      await Promise.all(updates);

      setState(prev => ({
        ...prev,
        saving: false,
        message: '✅ Configuração salva com sucesso!'
      }));

      // Limpar mensagem após 3s
      setTimeout(() => {
        setState(prev => ({ ...prev, message: '' }));
      }, 3000);
    } catch (error) {
      console.error('❌ Erro ao salvar configuração:', error);
      setState(prev => ({
        ...prev,
        saving: false,
        message: '❌ Erro ao salvar configuração'
      }));
    }
  };

  const handleSelectAll = () => {
    const newSelected = new Map();
    state.checkpoints.forEach(cp => {
      newSelected.set(cp.id, cp.points || 10);
    });
    setState(prev => ({ ...prev, selectedCheckpoints: newSelected }));
  };

  const handleClearAll = () => {
    setState(prev => ({ ...prev, selectedCheckpoints: new Map() }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-800">Configurar Jogo de Zona</h1>
          </div>
          <button
            onClick={() => navigate('/game-master/dashboard')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
            Voltar
          </button>
        </div>

        {/* Mensagem */}
        {state.message && (
          <div className={`mb-6 p-4 rounded-lg ${
            state.message.includes('✅') ? 'bg-green-100 text-green-800' :
            state.message.includes('⚠️') ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {state.message}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Seletor de Evento */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📅 Evento
            </label>
            <select
              value={state.eventoId}
              onChange={(e) => setState(prev => ({ ...prev, eventoId: e.target.value }))}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 font-medium"
            >
              <option value="">Selecionar Evento</option>
              {state.eventos.map(evento => (
                <option key={evento.id} value={evento.id}>
                  {evento.name}
                </option>
              ))}
            </select>
          </div>

          {state.loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin">⏳</div>
              <p className="text-gray-600 mt-4">Carregando checkpoints...</p>
            </div>
          ) : state.checkpoints.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Nenhum checkpoint encontrado neste evento</p>
            </div>
          ) : (
            <>
              {/* Controles */}
              <div className="flex gap-4 mb-6">
                <button
                  onClick={handleSelectAll}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold"
                >
                  ✓ Selecionar Tudo
                </button>
                <button
                  onClick={handleClearAll}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 font-semibold"
                >
                  ✗ Desselecionar Tudo
                </button>
              </div>

              {/* Grade de Checkpoints */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {state.checkpoints.map((checkpoint) => {
                  const isSelected = state.selectedCheckpoints.has(checkpoint.id);
                  const points = state.selectedCheckpoints.get(checkpoint.id) || 10;

                  return (
                    <div
                      key={checkpoint.id}
                      className={`p-6 rounded-lg border-2 cursor-pointer transition ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 bg-white hover:border-blue-300'
                      }`}
                      onClick={() => {
                        if (isSelected) {
                          handlePointsChange(checkpoint.id, 0);
                        } else {
                          handlePointsChange(checkpoint.id, checkpoint.points || 10);
                        }
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                          isSelected
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : 'border-gray-400'
                        }`}>
                          {isSelected && '✓'}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-800">{checkpoint.name}</h3>
                          {checkpoint.location && (
                            <p className="text-sm text-gray-600">📍 {checkpoint.location}</p>
                          )}
                          {checkpoint.zone && (
                            <p className="text-sm text-gray-600">🗺️ {checkpoint.zone}</p>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="mt-4 pt-4 border-t border-blue-200">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            🎯 Pontos para conquistar:
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={points}
                            onChange={(e) =>
                              handlePointsChange(checkpoint.id, parseInt(e.target.value) || 0)
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-3 py-2 border-2 border-blue-300 rounded bg-white text-gray-800 font-bold text-lg"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Resumo */}
              {state.selectedCheckpoints.size > 0 && (
                <div className="mb-8 p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <h3 className="font-bold text-lg text-gray-800 mb-4">
                    📊 Resumo da Configuração
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Checkpoints Configurados</p>
                      <p className="text-3xl font-bold text-blue-600">{state.selectedCheckpoints.size}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Pontos Totais Possíveis</p>
                      <p className="text-3xl font-bold text-green-600">
                        {Array.from(state.selectedCheckpoints.values()).reduce((a, b) => a + b, 0)}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Status</p>
                      <p className="text-lg font-bold text-purple-600">Pronto para Ativar</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Botão de Salvar */}
              <button
                onClick={handleSaveConfiguration}
                disabled={state.saving || state.selectedCheckpoints.size === 0}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-green-500 text-white text-lg font-bold rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                <Save className="w-6 h-6" />
                {state.saving ? 'Salvando...' : 'Salvar Configuração'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
