import { useState } from 'react';
import { Building2, MapPin, KeyRound, Layers, Eye, EyeOff, Wand2, Copy, Check, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';
import { maskCnpj, isValidCnpj } from '../../utils/cnpj';
import { maskPhone, validatePhone } from '../../utils/phone';
import { PLANOS_SELECIONAVEIS } from '../../utils/planos';
import type { PlanoId } from '../../utils/planos';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MINIMO_SENHA = 6;
// Sem caracteres que se confundem (0/O, 1/l/I) para a senha poder ser ditada ou digitada sem erro
const ALFABETO_SENHA = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function gerarSenha(tamanho = 10): string {
  const sorteio = new Uint32Array(tamanho);
  crypto.getRandomValues(sorteio);
  return Array.from(sorteio, (n) => ALFABETO_SENHA[n % ALFABETO_SENHA.length]).join('');
}

// api.createCliente lança "Erro 400: {"error":"..."}": mostra só a mensagem do servidor
function mensagemDoErro(erro: unknown): string {
  const texto = erro instanceof Error ? erro.message : '';
  const json = texto.slice(texto.indexOf('{'));
  try {
    const dados = JSON.parse(json);
    if (dados?.error) return String(dados.error);
  } catch {
    // não era JSON
  }
  return texto && !/^Erro \d+:/.test(texto) ? texto : 'Não foi possível criar o cliente. Confira os dados e tente de novo.';
}

type Campo = 'nome' | 'cnpj' | 'telefone' | 'endereco' | 'cidade' | 'estado' | 'email' | 'senha';
type Erros = Partial<Record<Campo, string>>;

const FORM_VAZIO = { nome: '', cnpj: '', telefone: '', endereco: '', cidade: '', estado: '', email: '', senha: '' };

function validar(form: typeof FORM_VAZIO): Erros {
  const erros: Erros = {};
  if (!form.nome.trim()) erros.nome = 'Informe o nome do buffet';
  if (!form.cnpj.trim()) erros.cnpj = 'Informe o CNPJ';
  else if (!isValidCnpj(form.cnpj)) erros.cnpj = 'CNPJ inválido. Confira os 14 dígitos.';
  if (!form.telefone.trim()) erros.telefone = 'Informe o telefone';
  else {
    const problema = validatePhone(form.telefone);
    if (problema) erros.telefone = problema;
  }
  if (!form.endereco.trim()) erros.endereco = 'Informe o endereço';
  if (!form.cidade.trim()) erros.cidade = 'Informe a cidade';
  if (!/^[A-Za-z]{2}$/.test(form.estado.trim())) erros.estado = 'Use a sigla, ex.: SP';
  if (!form.email.trim()) erros.email = 'Informe o e-mail';
  else if (!EMAIL_PATTERN.test(form.email.trim())) erros.email = 'E-mail inválido';
  if (!form.senha) erros.senha = 'Informe ou gere a senha provisória';
  else if (form.senha.length < MINIMO_SENHA) erros.senha = `Pelo menos ${MINIMO_SENHA} caracteres`;
  return erros;
}

function Secao({ icone, titulo, children }: { icone: React.ReactNode; titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <legend className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wider text-primary-300">
        {icone}
        {titulo}
      </legend>
      {children}
    </fieldset>
  );
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  // Recebe o cliente criado (a lista da tela o inclui)
  onCreated: (cliente: any) => void;
}

export default function NovoClienteModal({ isOpen, onClose, onCreated }: Props) {
  const [form, setForm] = useState(FORM_VAZIO);
  const [plano, setPlano] = useState<PlanoId>('starter');
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);
  // Depois de criar: mostra o acesso para o master passar ao cliente
  const [criado, setCriado] = useState<{ nome: string; email: string; senha: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  const mudar = (campo: Campo, valor: string) => {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
    setErroGeral('');
  };

  const fechar = () => {
    onClose();
    // Limpa só depois de fechado, para não piscar o formulário vazio durante a animação
    window.setTimeout(() => {
      setForm(FORM_VAZIO);
      setPlano('starter');
      setErros({});
      setErroGeral('');
      setMostrarSenha(false);
      setCriado(null);
      setCopiado(false);
    }, 200);
  };

  const criar = async () => {
    const encontrados = validar(form);
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) {
      setErroGeral('Corrija os campos destacados.');
      return;
    }
    setEnviando(true);
    setErroGeral('');
    try {
      const cliente = await api.createCliente({
        nome: form.nome.trim(),
        cnpj: form.cnpj,
        endereco: form.endereco.trim(),
        cidade: form.cidade.trim(),
        estado: form.estado.trim().toUpperCase(),
        telefone: form.telefone.trim(),
        email: form.email.trim(),
        senha: form.senha,
        plan: plano,
      });
      if (!cliente) {
        setErroGeral('Não foi possível criar o cliente.');
        return;
      }
      onCreated(cliente);
      setCriado({ nome: form.nome.trim(), email: form.email.trim(), senha: form.senha });
    } catch (erro) {
      setErroGeral(mensagemDoErro(erro));
    } finally {
      setEnviando(false);
    }
  };

  const copiarAcesso = async () => {
    if (!criado) return;
    const texto = `Acesso ao Pulyn - ${criado.nome}\nE-mail: ${criado.email}\nSenha provisória: ${criado.senha}\nNo primeiro acesso você será levado a criar uma senha só sua.`;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      setErroGeral('Não foi possível copiar. Anote o acesso manualmente.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={fechar} title={criado ? 'Cliente criado' : 'Novo cliente'} size={criado ? 'lg' : '2xl'}>
      {criado ? (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4">
            <CheckCircle2 className="mt-0.5 shrink-0 text-success" size={22} />
            <div>
              <p className="font-semibold text-white">{criado.nome} foi cadastrado</p>
              <p className="text-sm text-gray-300">Passe o acesso abaixo ao cliente. No primeiro acesso ele será levado a criar uma senha só dele.</p>
            </div>
          </div>
          <dl className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
            <div>
              <dt className="text-xs uppercase tracking-wider text-gray-500">E-mail (login)</dt>
              <dd className="font-mono text-white">{criado.email}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-gray-500">Senha provisória</dt>
              <dd className="font-mono text-lg text-white">{criado.senha}</dd>
            </div>
          </dl>
          <p className="text-xs text-gray-500">Esta senha não será mostrada de novo depois que você fechar esta janela.</p>
          {erroGeral && <p role="alert" className="text-sm text-danger">{erroGeral}</p>}
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1 border border-border" onClick={copiarAcesso}>
              {copiado ? <Check size={16} className="mr-2 text-success" /> : <Copy size={16} className="mr-2" />}
              {copiado ? 'Copiado' : 'Copiar acesso'}
            </Button>
            <Button variant="primary" className="flex-1" onClick={fechar}>Concluir</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Todos os campos são obrigatórios. Estes dados ficam fixos no cadastro: o buffet os vê em Configurações, mas não consegue alterá-los.
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
          <Secao icone={<Building2 size={14} />} titulo="Dados do buffet">
            <Input label="Nome do buffet" value={form.nome} onChange={(e) => mudar('nome', e.target.value)} placeholder="Ex.: Buffet Feliz" maxLength={100} error={erros.nome} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label="CNPJ" value={form.cnpj} onChange={(e) => mudar('cnpj', maskCnpj(e.target.value))} placeholder="00.000.000/0000-00" inputMode="numeric" maxLength={18} error={erros.cnpj} />
              <Input label="Telefone" value={form.telefone} onChange={(e) => mudar('telefone', maskPhone(e.target.value))} placeholder="(11) 98765-4321" type="tel" inputMode="numeric" maxLength={15} error={erros.telefone} />
            </div>
          </Secao>

          <Secao icone={<MapPin size={14} />} titulo="Endereço">
            <Input label="Rua, número e bairro" value={form.endereco} onChange={(e) => mudar('endereco', e.target.value)} placeholder="Rua das Flores, 120 - Centro" maxLength={255} error={erros.endereco} />
            <div className="grid grid-cols-[1fr_6rem] gap-3">
              <Input label="Cidade" value={form.cidade} onChange={(e) => mudar('cidade', e.target.value)} placeholder="São Paulo" error={erros.cidade} />
              <Input label="UF" value={form.estado} onChange={(e) => mudar('estado', e.target.value.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase())} placeholder="SP" maxLength={2} error={erros.estado} />
            </div>
          </Secao>
          </div>

          <div className="space-y-4">
          <Secao icone={<Layers size={14} />} titulo="Plano">
            <div role="radiogroup" aria-label="Plano" className="grid grid-cols-2 gap-2">
              {PLANOS_SELECIONAVEIS.map((opcao) => {
                const ativo = plano === opcao.value;
                return (
                  <button
                    key={opcao.value}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    onClick={() => setPlano(opcao.value)}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${ativo ? 'border-primary bg-primary/15 text-white' : 'border-white/10 bg-white/[0.03] text-gray-400 hover:border-white/25 hover:text-white'}`}
                  >
                    {opcao.label}
                  </button>
                );
              })}
            </div>
          </Secao>

          <Secao icone={<KeyRound size={14} />} titulo="Acesso do cliente">
            <Input label="E-mail (login)" type="email" value={form.email} onChange={(e) => mudar('email', e.target.value)} placeholder="contato@buffet.com.br" maxLength={100} error={erros.email} />
            <div>
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <Input
                    label="Senha provisória"
                    type={mostrarSenha ? 'text' : 'password'}
                    value={form.senha}
                    onChange={(e) => mudar('senha', e.target.value)}
                    placeholder="Digite ou gere uma senha"
                    autoComplete="new-password"
                    error={erros.senha}
                  />
                </div>
                <Button type="button" variant="ghost" className="mb-0.5 border border-border" onClick={() => setMostrarSenha((atual) => !atual)} title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'} aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}>
                  {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
                <Button type="button" variant="ghost" className="mb-0.5 border border-border" onClick={() => { mudar('senha', gerarSenha()); setMostrarSenha(true); }}>
                  <Wand2 size={16} className="mr-1.5" />
                  Gerar
                </Button>
              </div>
              <p className="mt-1.5 text-xs text-gray-500">O cliente é obrigado a trocar esta senha no primeiro acesso.</p>
            </div>
          </Secao>
          </div>
          </div>

          {erroGeral && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erroGeral}</p>}

          <div className="flex gap-3 pt-1">
            <Button variant="ghost" className="flex-1" onClick={fechar} disabled={enviando}>Cancelar</Button>
            <Button variant="primary" className="flex-1" onClick={criar} disabled={enviando}>
              {enviando && <Loader2 size={16} className="mr-2 animate-spin" />}
              {enviando ? 'Criando...' : 'Criar cliente'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
