import { useNavigate } from 'react-router-dom';
import PulynLogo from '../components/ui/PulynLogo';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-dark flex flex-col items-center justify-center gap-6 p-4">
      <PulynLogo size="xl" clickable={false} />
      <h1 className="text-6xl font-bold text-white font-display">404</h1>
      <p className="text-dark-hover text-lg">Página não encontrada</p>
      <button
        onClick={() => navigate('/login')}
        className="btn-primary px-8 py-3 text-base"
      >
        Voltar ao início
      </button>
    </div>
  );
}
