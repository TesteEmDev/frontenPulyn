// pages/AdminCheckpointConfig.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Save, Plus, Trash2, Wifi, WifiOff, CheckCircle, XCircle } from 'lucide-react';
// No topo do arquivo AdminCheckpointConfig.tsx
import { usePulynStore } from '../../store/mockData'; // Note: são 2 níveis: ../../store/mockData
import { API_URL } from '../../services/api';

export default function AdminCheckpointConfig() {
  const { id } = useParams<{ id: string }>();
  const { checkpoints, updateCheckpoint } = usePulynStore();
  const checkpoint = checkpoints.find(cp => cp.id === id);
  
  const [formData, setFormData] = useState({
    name: checkpoint?.name || '',
    type: checkpoint?.type || 'NFC',
    ip: checkpoint?.ip || '',
    zone: checkpoint?.zone || '',
    ledColor: checkpoint?.led || '#00FF00',
    defaultSound: 'beep_1',
    uhfPower: '30',
    authorizedTags: checkpoint?.authorizedTags || [] as string[],
  });
  
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  
  // Verifica status do servidor
  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await fetch(`${API_URL}/checkpoints`);
        if (res.ok) setServerStatus('online');
        else setServerStatus('offline');
      } catch {
        setServerStatus('offline');
      }
    };
    checkServer();
    const interval = setInterval(checkServer, 5000);
    return () => clearInterval(interval);
  }, []);
  
  const addTag = () => {
    const tag = newTag.trim().toUpperCase();
    if (!tag || formData.authorizedTags.includes(tag)) return;
    setFormData(prev => ({ 
      ...prev, 
      authorizedTags: [...prev.authorizedTags, tag] 
    }));
    setNewTag('');
  };
  
  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      authorizedTags: prev.authorizedTags.filter(t => t !== tag),
    }));
  };
  
  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('idle');
    
    try {
      const res = await fetch(`${API_URL}/checkpoints/${id}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!res.ok) throw new Error();
      
      // Atualiza no store local
      updateCheckpoint(id!, {
        ...formData,
        id: id!,
        status: 'configured'
      });
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header com status do servidor */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-2xl text-white">
          Configurar Checkpoint: {checkpoint?.name || id}
        </h1>
        
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface">
          {serverStatus === 'online' ? (
            <>
              <Wifi size={16} className="text-success" />
              <span className="text-sm text-success">Servidor Online</span>
            </>
          ) : serverStatus === 'offline' ? (
            <>
              <WifiOff size={16} className="text-danger" />
              <span className="text-sm text-danger">Servidor Offline</span>
            </>
          ) : (
            <span className="text-sm text-gray-500">Verificando...</span>
          )}
        </div>
      </div>
      
      {/* Formulário */}
      <div className="space-y-6">
        {/* Informações Básicas */}
        <div className="bg-surface rounded-xl p-6 border border-border">
          <h2 className="font-display text-lg text-white mb-4">Informações Básicas</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nome do Checkpoint</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-white"
                placeholder="Ex: Entrada Principal"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Tipo de Leitor</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-white"
              >
                <option value="NFC">NFC/RFID</option>
                <option value="UHF">UHF Longa Distância</option>
                <option value="QRCode">QR Code</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Endereço IP</label>
              <input
                type="text"
                value={formData.ip}
                onChange={e => setFormData({ ...formData, ip: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-white font-mono"
                placeholder="192.168.1.100"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Zona/Localização</label>
              <input
                type="text"
                value={formData.zone}
                onChange={e => setFormData({ ...formData, zone: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-white"
                placeholder="Área 1, Setor A"
              />
            </div>
          </div>
        </div>
        
        {/* Tags Autorizadas */}
        <div className="bg-surface rounded-xl p-6 border border-border">
          <h2 className="font-display text-lg text-white mb-4">
            Tags Autorizadas ({formData.authorizedTags.length})
          </h2>
          
          {/* Lista de tags */}
          <div className="flex flex-wrap gap-2 mb-4 min-h-[60px] max-h-[200px] overflow-y-auto p-2 bg-background rounded-lg">
            {formData.authorizedTags.length === 0 && (
              <p className="text-sm text-gray-500 text-center w-full py-4">
                Nenhuma tag cadastrada. Aproxime uma pulseira ou digite o UID manualmente.
              </p>
            )}
            {formData.authorizedTags.map(tag => (
              <div key={tag} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface border border-border">
                <span className="text-sm font-mono text-white">{tag}</span>
                <button
                  onClick={() => removeTag(tag)}
                  className="text-gray-500 hover:text-danger ml-1 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          
          {/* Adicionar tag */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="UID ex: 23:46:83:14 ou 04:5A:2C:91:00:00:81"
              value={newTag}
              onChange={e => setNewTag(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && addTag()}
              className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-white font-mono"
            />
            <button
              onClick={addTag}
              className="px-4 py-2 bg-secondary rounded-lg text-white hover:bg-secondary/80 transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              Adicionar
            </button>
          </div>
          
          <p className="text-xs text-gray-500 mt-3">
            💡 Dica: Aproxime a pulseira do leitor e o UID aparecerá no monitor serial do Arduino.
            Formato: 23:46:83:14 (MIFARE) ou 04:5A:2C:91:00:00:81 (UID longo)
          </p>
        </div>
        
        {/* Configurações Visuais */}
        <div className="bg-surface rounded-xl p-6 border border-border">
          <h2 className="font-display text-lg text-white mb-4">Configurações Visuais</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Cor do LED (Autorizado)</label>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  value={formData.ledColor}
                  onChange={e => setFormData({ ...formData, ledColor: e.target.value })}
                  className="w-12 h-10 rounded border border-border cursor-pointer"
                />
                <span className="text-sm text-gray-400">{formData.ledColor}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Som de Autorização</label>
              <select
                value={formData.defaultSound}
                onChange={e => setFormData({ ...formData, defaultSound: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-white"
              >
                <option value="beep_1">Beep 1</option>
                <option value="beep_2">Beep 2</option>
                <option value="melody">Melodia</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Botão Salvar */}
        <div className="flex items-center justify-end gap-3 pt-4">
          {saveStatus === 'success' && (
            <div className="flex items-center gap-2 text-success">
              <CheckCircle size={18} />
              <span className="text-sm">Configurações salvas com sucesso!</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-danger">
              <XCircle size={18} />
              <span className="text-sm">Erro ao salvar. Verifique o servidor.</span>
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving || serverStatus !== 'online'}
            className="px-6 py-2 bg-primary rounded-lg text-white hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save size={18} />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </div>
    </div>
  );
}