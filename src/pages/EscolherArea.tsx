import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth, roleLabels } from '../hooks/useAuth';
import Button from '../components/ui/Button';

// Conta com mais de uma área (recepção, recreação, gestão): escolhe em qual trabalhar agora.
// Depois, pode trocar pelo menu lateral.
export default function EscolherArea() {
  const navigate = useNavigate();
  const { user, trocarArea } = useAuth();
  const [erro, setErro] = useState<string | null>(null);
  const [trocando, setTrocando] = useState<string | null>(null);

  const papeis = user?.papeis ?? [];

  const escolher = async (role: string) => {
    setErro(null);
    setTrocando(role);
    const resultado = await trocarArea(role);
    setTrocando(null);
    if (!resultado.success) {
      setErro(resultado.error || 'Não foi possível entrar nessa área');
      return;
    }
    navigate(resultado.redirect || '/login', { replace: true });
  };

  if (papeis.length === 0) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-dark text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-dark-border bg-surface p-6 space-y-5">
        <div>
          <h1 className="text-xl font-display font-semibold">Escolha a área</h1>
          <p className="text-sm text-gray-400 mt-1">
            {user?.name ? `Olá, ${user.name}. ` : ''}Em que você vai trabalhar agora?
          </p>
        </div>

        <div className="space-y-3">
          {papeis.map((role) => (
            <Button
              key={role}
              variant="secondary"
              className="w-full justify-center"
              onClick={() => escolher(role)}
              disabled={trocando !== null}
            >
              {trocando === role ? 'Entrando...' : (roleLabels[role] || role)}
            </Button>
          ))}
        </div>

        {erro && <p className="text-sm text-danger">{erro}</p>}
      </div>
    </div>
  );
}
