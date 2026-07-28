import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, KeyRound, Loader2, Mail, UserRound } from 'lucide-react';
import { api } from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

interface InviteData {
  event: { name: string; date: string };
  child: { id: string; name: string } | null;
  email?: string | null;
  expiresAt: string;
}

export default function FamilyInviteRegister() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ parentName: '', email: '', password: '', confirmPassword: '', childName: '', childNickname: '', childAge: '' });

  useEffect(() => {
    api.getFamilyInvite(token)
      .then((data) => {
        setInvite(data);
        setForm((current) => ({ ...current, email: data.email || '', childName: data.child?.name || '' }));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const update = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setError('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.password !== form.confirmPassword) return setError('As senhas não conferem.');
    setSaving(true);
    try {
      await api.registerFamily(token, {
        parentName: form.parentName,
        email: form.email,
        password: form.password,
        child: invite?.child ? undefined : { name: form.childName, nickname: form.childNickname, age: form.childAge },
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Não foi possível concluir o cadastro.');
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return <div className="min-h-screen bg-dark flex items-center justify-center text-gray-300">Validando convite...</div>;
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4 py-8">
      <Card variant="glow" className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            {success ? <CheckCircle className="text-success" /> : <UserRound className="text-primary" />}
          </div>
          <h1 className="text-2xl font-display font-bold text-white">Cadastro da família</h1>
          {invite && <p className="text-sm text-gray-400 mt-2">Convite para <strong className="text-white">{invite.event.name}</strong></p>}
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <p className="text-gray-300">Cadastro realizado. A recepção precisa aprovar o vínculo antes do primeiro acesso.</p>
            <Button className="w-full" onClick={() => navigate('/login')}>Ir para o login</Button>
          </div>
        ) : error && !invite ? (
          <div className="space-y-4 text-center">
            <p className="text-danger-500">{error}</p>
            <Link to="/login" className="text-primary hover:underline text-sm">Voltar para o login</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {error && <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-red-300">{error}</div>}
            <Input label="Nome do responsável" value={form.parentName} onChange={update('parentName')} required icon={<UserRound size={16} />} />
            <Input label="E-mail" type="email" value={form.email} onChange={update('email')} required icon={<Mail size={16} />} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Senha" type="password" value={form.password} onChange={update('password')} minLength={6} required icon={<KeyRound size={16} />} />
              <Input label="Confirmar senha" type="password" value={form.confirmPassword} onChange={update('confirmPassword')} minLength={6} required icon={<KeyRound size={16} />} />
            </div>
            {!invite?.child && (
              <div className="border-t border-border pt-4 space-y-4">
                <h2 className="text-white font-semibold">Dados da criança</h2>
                <Input label="Nome da criança" value={form.childName} onChange={update('childName')} required />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Apelido (opcional)" value={form.childNickname} onChange={update('childNickname')} />
                  <Input label="Idade (opcional)" type="number" min={0} max={18} value={form.childAge} onChange={update('childAge')} />
                </div>
                <p className="text-xs text-gray-500">A recepção definirá o time e a pulseira após a aprovação.</p>
              </div>
            )}
            {invite?.child && <p className="text-sm text-gray-400">Criança vinculada ao convite: <strong className="text-white">{invite.child.name}</strong></p>}
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? <><Loader2 size={18} className="mr-2 animate-spin" /> Cadastrando...</> : 'Criar cadastro familiar'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
