import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[]; // Se não definido, qualquer usuário autenticado pode acessar
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user, trocarArea } = useAuth();

  // Conta com mais de uma área: a tela pode ser de outra área da conta (o token carrega uma área por vez).
  const areasDaTela = allowedRoles?.filter((role) => user?.papeis?.includes(role)) ?? [];
  const deOutraArea = Boolean(allowedRoles?.length) && Boolean(user?.role) && !allowedRoles!.includes(user!.role) && areasDaTela.length > 0;

  // Abriu a tela direto (link, aba nova) com o token de outra área: pede o acesso da área da tela antes de mostrá-la.
  const abriuEmOutraArea = useRef(deOutraArea);
  const [pronto, setPronto] = useState(!abriuEmOutraArea.current);
  useEffect(() => {
    if (!abriuEmOutraArea.current) return undefined;
    let vivo = true;
    trocarArea(areasDaTela[0]).finally(() => { if (vivo) setPronto(true); });
    return () => { vivo = false; };
    // só na primeira vez que a tela abre
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (abriuEmOutraArea.current && !pronto) {
    return <div className="flex min-h-screen items-center justify-center bg-dark"><Loader2 className="animate-spin text-primary-300" size={32} /></div>;
  }

  // ✅ Se não está autenticado, redireciona para login
  if (!isAuthenticated) {
    // Telão aberto por link: a sessão venceu, mas o código ficou guardado e entra de novo sozinho
    const codigoTelao = allowedRoles?.includes('display') ? localStorage.getItem('telaoCodigo') : null;
    if (codigoTelao) return <Navigate to={`/telao/${encodeURIComponent(codigoTelao)}`} replace />;
    return <Navigate to="/login" replace />;
  }

  // ✅ Se há restrição de roles e o usuário não tem permissão
  if (allowedRoles && allowedRoles.length > 0) {
    // Troca de área pelo menu (o token muda para a outra área e a navegação vem em seguida): esta tela, que já estava
    // aberta, fica como está em vez de pular para o início da outra área.
    if (deOutraArea && !abriuEmOutraArea.current) return <>{children}</>;

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
