import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, KeyRound, Loader2, Mail, Phone, UserRound, Plus, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { maskPhone, validatePhone, countPhoneDigits } from '../../utils/phone';
import { erroNascimento, hojeIso } from '../../utils/nascimento';

interface InviteData {
  event: { name: string; date: string };
  child: { id: string; name: string } | null;
  email?: string | null;
  expiresAt: string;
}

interface ChildForm {
  name: string;
  nickname: string;
  nascimento: string;   // AAAA-MM-DD
}

const emptyChild = (): ChildForm => ({ name: '', nickname: '', nascimento: '' });

export default function FamilyInviteRegister() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ parentName: '', phone: '', email: '', password: '', confirmPassword: '' });
  const [children, setChildren] = useState<ChildForm[]>([emptyChild()]);

  useEffect(() => {
    console.log('🔍 FamilyInviteRegister - Token recebido:', token);
    
    // Se o token é uma URL completa, extrair apenas o token final
    let cleanToken = token;
    if (token && token.includes('/')) {
      cleanToken = token.split('/').pop() || token;
      console.log('✂️ Token extraído de URL completa:', cleanToken);
    }
    
    api.getFamilyInvite(cleanToken)
      .then((data) => {
        setInvite(data);
        setForm((current) => ({ ...current, email: data.email || '' }));
        if (!data.child) setChildren([emptyChild()]);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const update = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const valor = field === 'phone' ? maskPhone(event.target.value) : event.target.value;
    setForm((current) => ({ ...current, [field]: valor }));
    setError('');
  };

  const updateChild = (index: number, field: keyof ChildForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setChildren((current) => current.map((child, childIndex) => (
      childIndex === index ? { ...child, [field]: event.target.value } : child
    )));
    setError('');
  };

  const addChild = () => {
    if (children.length >= 10) return setError('É possível cadastrar até 10 crianças por convite.');
    setChildren((current) => [...current, emptyChild()]);
    setError('');
  };

  const removeChild = (index: number) => {
    if (children.length === 1) return;
    setChildren((current) => current.filter((_, childIndex) => childIndex !== index));
    setError('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.password !== form.confirmPassword) return setError('As senhas não conferem.');
    // Telefone do responsável: obrigatório, para a equipe poder falar com a família
    if (countPhoneDigits(form.phone) === 0) return setError('Informe o telefone do responsável.');
    const erroDoTelefone = validatePhone(form.phone);
    if (erroDoTelefone) return setError(erroDoTelefone);
    if (!invite?.child) {
      if (children.some((child) => !child.name.trim())) return setError('Informe o nome de todas as crianças.');
      for (const [indice, child] of children.entries()) {
        const erroDaData = erroNascimento(child.nascimento || null);
        if (erroDaData) return setError(`Criança ${indice + 1}: ${erroDaData}`);
      }
    }
    setSaving(true);
    try {
      await api.registerFamily(token, {
        parentNome: form.parentName,
        telefone: form.phone,
        email: form.email,
        senha: form.password,
        children: invite?.child ? undefined : children.map((child) => ({
          name: child.name.trim(),
          nickname: child.nickname.trim(),
          dataNascimento: child.nascimento,
        })),
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
            <Input label="Telefone do responsável" type="tel" inputMode="tel" placeholder="(11) 91234-5678" value={form.phone} onChange={update('phone')} required icon={<Phone size={16} />} />
            <Input label="E-mail" type="email" value={form.email} onChange={update('email')} required icon={<Mail size={16} />} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Senha" type="password" value={form.password} onChange={update('password')} minLength={6} required icon={<KeyRound size={16} />} />
              <Input label="Confirmar senha" type="password" value={form.confirmPassword} onChange={update('confirmPassword')} minLength={6} required icon={<KeyRound size={16} />} />
            </div>
            {!invite?.child && (
              <div className="border-t border-border pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-white font-semibold">Dados das crianças</h2>
                    <p className="text-xs text-gray-500 mt-1">Cadastre os irmãos neste mesmo convite.</p>
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={addChild} disabled={children.length >= 10}>
                    <Plus size={16} className="mr-1" /> Adicionar
                  </Button>
                </div>
                {children.map((child, index) => (
                  <div key={index} className="rounded-lg border border-border bg-dark-surface/50 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-200">Criança {index + 1}</h3>
                      {children.length > 1 && (
                        <button type="button" onClick={() => removeChild(index)} className="text-gray-500 hover:text-danger-500" aria-label={`Remover criança ${index + 1}`}>
                          <Trash2 size={17} />
                        </button>
                      )}
                    </div>
                    <Input label="Nome da criança" value={child.name} onChange={updateChild(index, 'name')} required />
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Apelido (opcional)" value={child.nickname} onChange={updateChild(index, 'nickname')} />
                      <Input label="Data de nascimento" type="date" max={hojeIso()} value={child.nascimento} onChange={updateChild(index, 'nascimento')} required />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-gray-500">A recepção definirá o time e a pulseira de cada criança após a aprovação.</p>
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
