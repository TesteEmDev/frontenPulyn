import { useState } from 'react';
import { MessageSquare, Send, Eye, Gamepad2, Users, Play, MapPin, Trophy } from 'lucide-react';
import { usePulynStore } from '../../store/mockData';
import Sidebar from '../../components/layout/Sidebar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const sidebarItems = [
  { icon: <Gamepad2 size={20} />, label: 'Painel', path: '/game-master' },
  { icon: <Users size={20} />, label: 'Times', path: '/game-master/teams' },
  { icon: <Play size={20} />, label: 'Controle', path: '/game-master/control' },
  { icon: <MapPin size={20} />, label: 'Mensagens', path: '/game-master/messages' },
  { icon: <Trophy size={20} />, label: 'Ranking', path: '/game-master/ranking' },
];

const presetMessages = [
  { text: 'Preparem-se!', color: '#F59E0B', bg: 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40' },
  { text: 'Jogo iniciado!', color: '#22C55E', bg: 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/40' },
  { text: 'Faltam 5 minutos!', color: '#E53935', bg: 'bg-red-500/20 hover:bg-red-500/30 border-red-500/40' },
  { text: 'Equipe vencedora!', color: '#E91E8C', bg: 'bg-pink-500/20 hover:bg-pink-500/30 border-pink-500/40' },
  { text: 'Parabens a todos!', color: '#1E9BD7', bg: 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/40' },
  { text: 'Atencao ao proximo desafio!', color: '#29B6F6', bg: 'bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-500/40' },
];

export default function GameMasterMessages() {
  // CORREÇÃO: Adicionar valor padrão = [] para displayMessages
  const { displayMessages = [], addDisplayMessage } = usePulynStore();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);

  // Garantir que displayMessages é um array
  const safeDisplayMessages = Array.isArray(displayMessages) ? displayMessages : [];

  const handleSendPreset = (text: string) => {
    if (addDisplayMessage) {
      addDisplayMessage(text, 'preset');
    }
    setPreviewMessage(text);
    // Limpar preview após 3 segundos
    setTimeout(() => {
      if (previewMessage === text) {
        setPreviewMessage(null);
      }
    }, 5000);
  };

  const handleSendCustom = () => {
    if (!customMessage.trim()) return;
    if (addDisplayMessage) {
      addDisplayMessage(customMessage.trim(), 'custom');
    }
    setPreviewMessage(customMessage.trim());
    setCustomMessage('');
    // Limpar preview após 5 segundos
    setTimeout(() => {
      if (previewMessage === customMessage.trim()) {
        setPreviewMessage(null);
      }
    }, 5000);
  };

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <Sidebar
        items={sidebarItems}
        activePath="/game-master/messages"
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        title="Pulyn GM"
      />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          <PageHeader
            title="Mensagens no Display"
            description="Envie mensagens para o painel de exibicao em tempo real"
            icon={<MessageSquare size={28} />}
          />

          {/* Preset Messages Grid */}
          <Card variant="glow" className="mb-6">
            <h3 className="font-display text-lg text-white mb-4">Mensagens Rápidas</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {presetMessages.map(msg => (
                <button
                  key={msg.text}
                  onClick={() => handleSendPreset(msg.text)}
                  className={`
                    p-4 rounded-xl border text-center transition-all duration-200
                    hover:scale-[1.02] hover:shadow-lg
                    ${msg.bg}
                  `}
                >
                  <span
                    className="text-lg font-display font-bold"
                    style={{ color: msg.color }}
                  >
                    {msg.text}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          {/* Custom Message Input */}
          <Card className="mb-6">
            <h3 className="font-display text-lg text-white mb-4">Mensagem Personalizada</h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Digite sua mensagem..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendCustom();
                  }}
                />
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={handleSendCustom}
                disabled={!customMessage.trim()}
              >
                <Send size={18} className="mr-2" />
                Enviar
              </Button>
            </div>
          </Card>

          {/* Preview */}
          <Card variant="secondary" className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye size={20} className="text-secondary" />
              <h3 className="font-display text-lg text-white">Preview do Display</h3>
            </div>
            <div className="rounded-xl bg-dark/80 border-2 border-secondary/30 p-8 text-center min-h-[120px] flex items-center justify-center">
              {previewMessage ? (
                <div className="animate-pulse">
                  <p className="font-display text-3xl md:text-4xl font-bold text-white tracking-wide">
                    {previewMessage}
                  </p>
                </div>
              ) : (
                <p className="text-gray-600 text-lg">
                  Envie uma mensagem para ver o preview aqui
                </p>
              )}
            </div>
          </Card>

          {/* Message History - CORRIGIDO */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg text-white">Historico de Mensagens</h3>
              <Badge variant="muted">{safeDisplayMessages.length} enviadas</Badge>
            </div>
            {safeDisplayMessages.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {safeDisplayMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-surface/30 hover:bg-surface/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {msg.text}
                      </p>
                    </div>
                    <Badge variant={msg.type === 'preset' ? 'primary' : 'secondary'}>
                      {msg.type === 'preset' ? 'Rápida' : 'Custom'}
                    </Badge>
                    <span className="font-mono text-xs text-gray-500 shrink-0">
                      {msg.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-8">
                Nenhuma mensagem enviada ainda
              </p>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}