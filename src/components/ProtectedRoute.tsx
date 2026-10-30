import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[]; // Se não definido, qualquer usuário autenticado pode acessar
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();

  // ✅ Se não está autenticado, redireciona para login
  if (!isAuthenticated) {
    // Telão aberto por link: a sessão venceu, mas o código ficou guardado e entra de novo sozinho
    const codigoTelao = allowedRoles?.includes('display') ? localStorage.getItem('telaoCodigo') : null;
    if (codigoTelao) return <Navigate to={`/telao/${encodeURIComponent(codigoTelao)}`} replace />;
    return <Navigate to="/login" replace />;
  }

  // ✅ Se há restrição de roles e o usuário não tem permissão
  if (allowedRoles && allowedRoles.length > 0) {
    if (!user?.role || !allowedRoles.includes(user.role)) {
      console.warn(`⚠️ Acesso negado: usuário com role '${user?.role}' tentou acessar rota restrita a ${allowedRoles.join(', ')}`);
      
      // Redirecionar para a página inicial do seu role
      const roleRedirects: Record<string, string> = {
        'admin': '/admin',
        'reception': '/reception',
        'game_master': '/game-master',
        'display': '/display',
        'family': '/family',
        'master': '/master',
        'kiosk': '/reception/kiosk',
        'score_kiosk': '/score-kiosk'
      };
      
      const redirectPath = user?.role ? (roleRedirects[user.role] || '/login') : '/login';
      return <Navigate to={redirectPath} replace />;
    }
  }

  // ✅ Usuário autenticado e com permissão
  return <>{children}</>;
}
