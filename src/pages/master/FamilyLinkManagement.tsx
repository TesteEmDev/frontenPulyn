import React, { useState, useEffect } from 'react';
import { Trash2, RefreshCw, Search } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

interface FamilyLink {
  id: string;
  pai_email: string;
  crianca_nome: string;
  status: 'approved' | 'pending' | 'inactive';
  created_at: string;
}

export default function FamilyLinkManagement() {
  const [links, setLinks] = useState<FamilyLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchEmail, setSearchEmail] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedLink, setSelectedLink] = useState<FamilyLink | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const API_URL = 'http://192.168.0.60:3001/api';

  const loadLinks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Sem autenticação');
      }

      const response = await fetch(`${API_URL}/family/links/all`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setLinks(data.links || []);
    } catch (err: any) {
      setError(`${err.message}`);
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLinks();
  }, []);

  const handleUnlink = async (link: FamilyLink) => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/family/links/${link.id}/unlink`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao desvincullar`);
      }
      
      setSuccess(`✅ ${link.crianca_nome} foi desvinculada de ${link.pai_email}`);
      setShowConfirm(false);
      setSelectedLink(null);
      loadLinks();
    } catch (err: any) {
      setError(err.message);
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkAll = async () => {
    if (!window.confirm('⚠️  Tem certeza? Isto é irreversível!')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/family/links/unlink-all`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Erro ao desvincullar todas');
      }
      
      setSuccess('✅ Todas as vinculações foram removidas!');
      loadLinks();
    } catch (err: any) {
      setError(err.message);
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtra as vinculações
  const filteredLinks = links.filter(link => {
    const matchStatus = filterStatus === '' || link.status === filterStatus;
    const matchEmail = link.pai_email.toLowerCase().includes(searchEmail.toLowerCase());
    return matchStatus && matchEmail;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-white">🔗 Gerenciar Vinculações</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded text-red-300">
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-500/20 border border-green-500 rounded text-green-300">
          {success}
        </div>
      )}

      <Card className="mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Input
              type="text"
              placeholder="Buscar email..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
          >
            <option value="">Todos</option>
            <option value="approved">Aprovadas</option>
            <option value="pending">Pendentes</option>
            <option value="inactive">Inativas</option>
          </select>
          <div className="flex gap-2">
            <Button onClick={loadLinks} disabled={loading}>
              Atualizar
            </Button>
            <Button onClick={handleUnlinkAll} disabled={loading} className="bg-red-600">
              Desvincullar Todos
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : filteredLinks.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nenhuma vinculação encontrada</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50 border-b border-gray-600">
                <tr>
                  <th className="px-4 py-2 text-left text-sm">Email</th>
                  <th className="px-4 py-2 text-left text-sm">Criança</th>
                  <th className="px-4 py-2 text-left text-sm">Status</th>
                  <th className="px-4 py-2 text-left text-sm">Data</th>
                  <th className="px-4 py-2 text-center text-sm">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filteredLinks.map((link) => (
                  <tr key={link.id} className="border-b border-gray-700 hover:bg-gray-700/20">
                    <td className="px-4 py-3 text-sm text-gray-300">{link.pai_email}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{link.crianca_nome}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        link.status === 'approved' ? 'bg-green-500/20 text-green-300' :
                        link.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-red-500/20 text-red-300'
                      }`}>
                        {link.status === 'approved' ? '✅ Aprovada' :
                         link.status === 'pending' ? '⏳ Pendente' :
                         '❌ Inativa'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {new Date(link.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {link.status !== 'inactive' && (
                        <button
                          onClick={() => {
                            setSelectedLink(link);
                            setShowConfirm(true);
                          }}
                          disabled={loading}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Desvincullar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showConfirm && selectedLink && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md">
            <h2 className="text-lg font-bold text-white mb-4">Desvincullar?</h2>
            <p className="text-gray-300 mb-6">
              Deseja desvincullar <strong>{selectedLink.crianca_nome}</strong> de <strong>{selectedLink.pai_email}</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <Button onClick={() => setShowConfirm(false)} className="bg-gray-600">
                Cancelar
              </Button>
              <Button onClick={() => handleUnlink(selectedLink)} disabled={loading} className="bg-red-600">
                Desvincullar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
