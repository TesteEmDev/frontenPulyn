import { useEffect, useState } from 'react';
import { Building2, MapPin, Mail, Layers, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { maskCnpj, isValidCnpj } from '../../utils/cnpj';
import { maskPhone, validatePhone } from '../../utils/phone';
import { PLANOS_SELECIONAVEIS, planoRotulo } from '../../utils/planos';
import {
  ENDERECO_VAZIO, cidadeOficial, formatarEndereco, lerEndereco, ufDoTexto, useCidadesDoEstado,
  type EnderecoForm,
} from '../../utils/endereco';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import EnderecoFields, { type ErrosEndereco } from './EnderecoFields';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// O servidor responde "Erro 400: {"error":"..."}": mostra só a mensagem dele
function mensagemDoErro(erro: unknown): string {
  const texto = erro instanceof Error ? erro.message : '';
  const json = texto.slice(texto.indexOf('{'));
  try {
    const dados = JSON.parse(json);
    if (dados?.error) return String(dados.error);
  } catch {
    // não era JSON
  }
  return texto && !/^Erro \d+:/.test(texto) ? texto : 'Não foi possível salvar. Confira os dados e tente de novo.';
}

// Dados que a lista já tem; o resto (CNPJ, endereço) vem dos detalhes
interface ResumoCliente {
  id: string;
  name: string;
  city: string;
  state: string;
  plan: string;
  status: string;
  email: string;
  phone: string;
}

interface DadosForm extends EnderecoForm {
  nome: string;
  cnpj: string;
  telefone: string;
  email: string;
  plano: string;
  status: string;
}

type Erros = Partial<Record<keyof DadosForm, string>>;

const STATUS_OPCOES = [
  { value: 'active', label: 'Ativo' },
  { value: 'trial', label: 'Trial' },
  { value: 'blocked', label: 'Bloqueado' },
];

interface Props {
  // Cliente a editar; null mantém a janela fechada
  client: ResumoCliente | null;
  onClose: () => void;
  // Chamado depois de salvar, para a lista reler os dados
  onSaved: (nome: string) => void;
}

export default function EditarClienteModal({ client, onClose, onSaved }: Props) {
  const clientId = client?.id ?? null;
  const [form, setForm] = useState<DadosForm | null>(null);
  // Cadastro antigo (sem empresa) não tem CNPJ para editar
  const [semEmpresa, setSemEmpresa] = useState(false);
  const [original, setOriginal] = useState<DadosForm | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erroCarga, setErroCarga] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Abre com os dados atuais do cliente: a lista dá o básico na hora e os detalhes trazem CNPJ e endereço
  useEffect(() => {
    if (!clientId || !client) { setForm(null); return undefined; }
    let vivo = true;
    setCarregando(true);
    setErroCarga('');
    setErros({});
    setErroGeral('');
    api.getClienteDetalhes(clientId)
      .then((d) => {
        if (!vivo) return;
        const endereco = lerEndereco(d.address || '');
        const inicial: DadosForm = {
          nome: d.name ?? client.name ?? '',
          cnpj: d.cnpj ? maskCnpj(d.cnpj) : '',
          telefone: maskPhone(d.phone ?? client.phone ?? ''),
          email: d.email ?? client.email ?? '',
          plano: d.plan ?? client.plan ?? 'starter',
          status: d.status ?? client.status ?? 'active',
          ...ENDERECO_VAZIO,
          ...endereco,
          cidade: d.city ?? client.city ?? '',
          estado: d.state ?? client.state ?? '',
        };
        setForm(inicial);
        setOriginal(inicial);
        setSemEmpresa(!d.empresaId);
      })
      .catch((erro) => { if (vivo) setErroCarga(mensagemDoErro(erro)); })
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
    // Recarrega só ao abrir outro cliente (a lista se atualiza sozinha e não pode apagar o que está sendo digitado)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const cidades = useCidadesDoEstado(form ? ufDoTexto(form.estado) : null);

  const mudar = (parcial: Partial<DadosForm>) => {
    setForm((atual) => (atual ? { ...atual, ...parcial } : atual));
    setErros((atual) => ({ ...atual, ...Object.fromEntries(Object.keys(parcial).map((c) => [c, undefined])) }));
    setErroGeral('');
  };

  const validar = (f: DadosForm): Erros => {
    const e: Erros = {};
    if (!f.nome.trim()) e.nome = 'Informe o nome do buffet';
    if (!semEmpresa) {
      if (!f.cnpj.trim()) e.cnpj = 'Informe o CNPJ';
      else if (!isValidCnpj(f.cnpj)) e.cnpj = 'CNPJ inválido. Confira os 14 dígitos.';
    }
    if (!f.telefone.trim()) e.telefone = 'Informe o telefone';
    else {
      const problema = validatePhone(f.telefone);
      if (problema) e.telefone = problema;
    }
    if (!f.email.trim()) e.email = 'Informe o e-mail';
    else if (!EMAIL_PATTERN.test(f.email.trim())) e.email = 'E-mail inválido';
    if (!f.rua.trim()) e.rua = 'Informe a rua';
    if (!f.numero.trim()) e.numero = 'Informe o número';
    if (!f.bairro.trim()) e.bairro = 'Informe o bairro';
    if (!ufDoTexto(f.estado)) e.estado = 'Escolha um estado da lista';
    if (!f.cidade.trim()) e.cidade = 'Informe a cidade';
    else if (cidades !== null && !cidadeOficial(f.cidade, cidades)) e.cidade = 'Escolha uma cidade da lista';
    return e;
  };

  const salvar = async () => {
    if (!form || !clientId) return;
    const encontrados = validar(form);
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) {
      setErroGeral('Corrija os campos destacados.');
      return;
    }
    setSalvando(true);
    setErroGeral('');
    try {
      await api.updateCliente(clientId, {
        nome: form.nome.trim(),
        ...(semEmpresa ? {} : { cnpj: form.cnpj }),
        telefone: form.telefone.trim(),
        email: form.email.trim(),
        endereco: formatarEndereco(form),
        cidade: (cidades && cidadeOficial(form.cidade, cidades)) || form.cidade.trim(),
        estado: ufDoTexto(form.estado) ?? form.estado.trim().toUpperCase(),
        plan: form.plano,
        status: form.status,
      });
      onSaved(form.nome.trim());
      onClose();
    } catch (erro) {
      setErroGeral(mensagemDoErro(erro));
    } finally {
      setSalvando(false);
    }
  };

  const emailMudou = Boolean(original && form && original.email.trim().toLowerCase() !== form.email.trim().toLowerCase());
  // O plano atual pode ser um que não está na lista de escolha (plano antigo): continua aparecendo
  const opcoesPlano = form && !PLANOS_SELECIONAVEIS.some((p) => p.value === form.plano)
    ? [{ value: form.plano, label: planoRotulo(form.plano) }, ...PLANOS_SELECIONAVEIS]
    : PLANOS_SELECIONAVEIS;

  const secao = (icone: React.ReactNode, titulo: string, filhos: React.ReactNode) => (
    <fieldset className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <legend className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wider text-primary-300">
        {icone}
        {titulo}
      </legend>
      {filhos}
    </fieldset>
  );

  return (
    <Modal
      isOpen={Boolean(client)}
      onClose={() => { if (!salvando) onClose(); }}
      title={client ? `Editar ${client.name}` : 'Editar cliente'}
      size="2xl"
      className="max-h-[90vh] overflow-y-auto"
    >
      {carregando || (!form && !erroCarga) ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      ) : erroCarga || !form ? (
        <div className="space-y-4">
          <p role="alert" className="flex items-center gap-2 text-sm text-danger"><AlertCircle size={16} /> {erroCarga || 'Não foi possível carregar o cliente.'}</p>
          <div className="flex justify-end"><Button variant="ghost" onClick={onClose}>Fechar</Button></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              {secao(<Building2 size={14} />, 'Dados do buffet', (
                <>
                  <Input label="Nome do buffet" value={form.nome} onChange={(e) => mudar({ nome: e.target.value })} maxLength={100} error={erros.nome} />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Input
                        label="CNPJ"
                        value={form.cnpj}
                        onChange={(e) => mudar({ cnpj: maskCnpj(e.target.value) })}
                        placeholder="00.000.000/0000-00"
                        inputMode="numeric"
                        maxLength={18}
                        disabled={semEmpresa}
                        error={erros.cnpj}
                      />
                      {semEmpresa && <p className="mt-1.5 text-xs text-gray-500">Cadastro antigo, sem empresa: não tem CNPJ.</p>}
                    </div>
                    <Input label="Telefone" value={form.telefone} onChange={(e) => mudar({ telefone: maskPhone(e.target.value) })} placeholder="(11) 98765-4321" type="tel" inputMode="numeric" maxLength={15} error={erros.telefone} />
                  </div>
                </>
              ))}
              {secao(<MapPin size={14} />, 'Endereço', (
                <EnderecoFields value={form} onChange={(parcial) => mudar(parcial)} cidades={cidades} erros={erros as ErrosEndereco} />
              ))}
            </div>
            <div className="space-y-4">
              {secao(<Layers size={14} />, 'Plano e situação', (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Select label="Plano" options={opcoesPlano} value={form.plano} onChange={(e) => mudar({ plano: e.target.value })} />
                  <Select label="Status" options={STATUS_OPCOES} value={form.status} onChange={(e) => mudar({ status: e.target.value })} />
                </div>
              ))}
              {secao(<Mail size={14} />, 'Acesso do cliente', (
                <>
                  <Input label="E-mail (login)" type="email" value={form.email} onChange={(e) => mudar({ email: e.target.value })} maxLength={100} error={erros.email} />
                  {emailMudou && (
                    <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-gray-200">
                      <AlertCircle size={14} className="mt-0.5 shrink-0 text-warning" />
                      Este é o e-mail que o administrador do buffet usa para entrar. Avise o cliente da mudança. A senha não é alterada.
                    </p>
                  )}
                </>
              ))}
            </div>
          </div>

          {erroGeral && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erroGeral}</p>}

          <div className="flex gap-3 pt-1">
            <Button variant="ghost" className="flex-1" onClick={onClose} disabled={salvando}>Cancelar</Button>
            <Button variant="primary" className="flex-1" onClick={salvar} disabled={salvando}>
              {salvando && <Loader2 size={16} className="mr-2 animate-spin" />}
              {salvando ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
