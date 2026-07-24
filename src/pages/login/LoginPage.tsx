import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useAuth, USERS, roleLabels } from '../../hooks/useAuth';
import PulynLogo from '../../components/ui/PulynLogo';

function FloatingShapes() {
  const shapes = useMemo(() => {
    const colors = ['#1E9BD7', '#29B6F6', '#4CAF50', '#F5A623', '#E91E8C'];
    return Array.from({ length: 12 }, (_, i) => {
      const isStar = i % 3 === 0;
      const size = Math.random() * 40 + 20;
      return {
        id: i,
        left: `${Math.random() * 80 + 10}%`,
        top: `${Math.random() * 80 + 10}%`,
        size,
        color: colors[i % colors.length],
        delay: Math.random() * 5,
        duration: Math.random() * 6 + 8,
        isStar,
        rotation: Math.random() * 360,
      };
    });
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {shapes.map((s) => (
        <div
          key={s.id}
          className="absolute animate-float"
          style={{
            left: s.left,
            top: s.top,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
            opacity: 0.25,
          }}
        >
          {s.isStar ? (
            <svg
              viewBox="0 0 24 24"
              fill={s.color}
              style={{ width: '100%', height: '100%', transform: `rotate(${s.rotation}deg)` }}
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          ) : (
            <div
              className="rounded-full"
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: s.color,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    try {
      // Autenticar com API
      const result = await login(email, password);
      setLoading(false);

      if (result.success) {
        const user = useAuth.getState().user;
        if (user?.redirect) {
          navigate(user.redirect);
        }
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Erro:', err);
      setError(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - hidden on mobile */}
      <div className="hidden md:flex md:w-[40%] relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E9BD7, #29B6F6, #4CAF50, #F5A623, #E91E8C)' }}>
        <FloatingShapes />

        <div className="relative z-10 flex flex-col items-center justify-center w-full px-8">
          <div className="mb-6">
            <PulynLogo size="xl" clickable={false} />
          </div>
          <p className="text-white font-display text-2xl md:text-3xl font-bold tracking-wide text-center">
            Diversão em Movimento!
          </p>
        </div>

        <div className="absolute bottom-6 left-0 right-0 text-center">
          <p className="text-white/50 text-sm">
            Plataforma Pulyn &copy; 2026
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full md:w-[60%] bg-[#0D1B2A] flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-slide-up">
          {/* Header */}
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">
            Bem-vindo de volta
          </h1>
          <p className="text-[#6B8BA4] mb-8">
            Faça login para acessar a plataforma
          </p>

          {/* Error message */}
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm animate-fade-in">
              E-mail ou senha incorretos. Tente novamente.
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email field */}
            <div>
              <label className="block text-white text-sm font-medium mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B8BA4]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(false); }}
                  placeholder="seu@email.com.br"
                  className="input-dark w-full pl-11 pr-4 py-3 rounded-lg text-white placeholder-[#6B8BA4]/60 outline-none transition-all duration-200"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-white text-sm font-medium mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B8BA4]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(false); }}
                  placeholder="••••••••"
                  className="input-dark w-full pl-11 pr-12 py-3 rounded-lg text-white placeholder-[#6B8BA4]/60 outline-none transition-all duration-200"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B8BA4] hover:text-white transition-colors duration-200"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-white font-semibold text-base transition-all duration-200 hover:shadow-lg hover:shadow-[#1E9BD7]/25 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #1E9BD7, #29B6F6)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Entrando...
                </span>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-8">
            <button
              type="button"
              onClick={() => setShowDemo(!showDemo)}
              className="flex items-center gap-2 text-[#6B8BA4] hover:text-white transition-colors duration-200 text-sm font-medium"
            >
              Ver acessos de demonstração
              {showDemo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showDemo && (
              <div className="mt-3 bg-[#0D1B2A]/80 border border-[#1E9BD7]/20 rounded-lg overflow-hidden animate-fade-in">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1E9BD7]/20 text-[#6B8BA4]">
                      <th className="text-left px-4 py-2 font-medium">E-mail</th>
                      <th className="text-left px-4 py-2 font-medium">Senha</th>
                      <th className="text-left px-4 py-2 font-medium">Perfil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {USERS.map((u) => (
                      <tr
                        key={u.id}
                        className="border-b border-[#1E9BD7]/10 last:border-0 hover:bg-[#1E9BD7]/5 cursor-pointer transition-colors duration-150"
                        onClick={() => {
                          setEmail(u.email);
                          setPassword(u.password);
                          setError(false);
                        }}
                      >
                        <td className="px-4 py-2.5 text-white/80">{u.email}</td>
                        <td className="px-4 py-2.5 text-white/80">{u.password}</td>
                        <td className="px-4 py-2.5 text-[#29B6F6]">{roleLabels[u.role] || u.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
