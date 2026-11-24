import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Input from '../../components/ui/Input';
import Autocomplete from '../../components/ui/Autocomplete';
import { ESTADOS_BRASIL } from '../../utils/estadosBrasil';
import {
  buscarCep, buscarRuas, cepCompleto, cidadeOficial, maskCep, ufDoTexto,
  type EnderecoForm, type RuaEncontrada,
} from '../../utils/endereco';

export type ErrosEndereco = Partial<Record<keyof EnderecoForm, string>>;

interface Props {
  value: EnderecoForm;
  onChange: (parcial: Partial<EnderecoForm>) => void;
  // Cidades do estado escolhido (useCidadesDoEstado); null enquanto não há estado válido
  cidades: string[] | null;
  erros?: ErrosEndereco;
}

// Campos de endereço do buffet. Digitando o CEP, estado, cidade, rua e bairro vêm preenchidos (ViaCEP); sem CEP,
// escolhe-se estado, cidade e rua pela lista. Usado no cadastro e na edição do cliente.
export default function EnderecoFields({ value, onChange, cidades, erros = {} }: Props) {
  const ufEscolhida = ufDoTexto(value.estado);
  const cidadeEscolhida = cidades ? cidadeOficial(value.cidade, cidades) : null;

  // CEP completo: busca o endereço e preenche os campos de uma vez
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [avisoCep, setAvisoCep] = useState('');
  // Só o CEP digitado agora busca: o CEP que já veio salvo no cadastro não pode refazer o endereço ao abrir a edição
  const digitouCep = useRef(false);
  useEffect(() => {
    if (!digitouCep.current) return undefined;
    if (!cepCompleto(value.cep)) { setAvisoCep(''); setBuscandoCep(false); return undefined; }
    const controle = new AbortController();
    setBuscandoCep(true);
    setAvisoCep('');
    buscarCep(value.cep, controle.signal)
      .then((achado) => {
        if (controle.signal.aborted) return;
        if (!achado) { setAvisoCep('CEP não encontrado. Confira os números ou preencha o endereço abaixo.'); return; }
        // Só troca o que o CEP trouxe: um CEP geral de cidade pequena não traz rua nem bairro, e o que já foi digitado fica
        onChange({
          estado: achado.estado || value.estado,
          cidade: achado.cidade || value.cidade,
          ...(achado.rua ? { rua: achado.rua } : {}),
          ...(achado.bairro ? { bairro: achado.bairro } : {}),
        });
      })
      .catch(() => { if (!controle.signal.aborted) setAvisoCep('Não foi possível consultar o CEP agora. Preencha o endereço abaixo.'); })
      .finally(() => { if (!controle.signal.aborted) setBuscandoCep(false); });
    return () => controle.abort();
    // Só o CEP dispara a busca; o onChange novo a cada render não pode reiniciá-la
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.cep]);

  // Sugestões de rua da cidade já escolhida, buscadas enquanto se digita (com pausa para não consultar a cada letra)
  const [ruas, setRuas] = useState<RuaEncontrada[]>([]);
  const [buscandoRuas, setBuscandoRuas] = useState(false);
  useEffect(() => {
    const texto = value.rua.trim();
    if (!ufEscolhida || !cidadeEscolhida || texto.length < 3) { setRuas([]); setBuscandoRuas(false); return undefined; }
    const controle = new AbortController();
    setBuscandoRuas(true);
    const espera = window.setTimeout(() => {
      buscarRuas(ufEscolhida, cidadeEscolhida, texto, controle.signal)
        .then((lista) => { if (!controle.signal.aborted) setRuas(lista); })
        .catch(() => { if (!controle.signal.aborted) setRuas([]); })
        .finally(() => { if (!controle.signal.aborted) setBuscandoRuas(false); });
    }, 400);
    return () => { window.clearTimeout(espera); controle.abort(); };
  }, [value.rua, ufEscolhida, cidadeEscolhida]);

  const opcoesRua = useMemo(
    () => ruas.map((r) => ({ valor: r.logradouro, rotulo: r.bairro ? `${r.logradouro} - ${r.bairro}` : r.logradouro, bairro: r.bairro })),
    [ruas],
  );
  const opcoesUf = useMemo(() => ESTADOS_BRASIL.map((e) => ({ valor: e.uf, rotulo: `${e.uf} - ${e.nome}` })), []);
  const opcoesCidade = useMemo(() => (cidades ?? []).map((c) => ({ valor: c })), [cidades]);

  // Mudou de estado ou de cidade pela mão: o CEP, a rua, o número e o bairro de antes não valem mais
  const limparRua = { cep: '', rua: '', numero: '', bairro: '' };
  const trocarEstado = (texto: string) => {
    digitouCep.current = false;
    onChange(ufDoTexto(texto) !== ufEscolhida ? { estado: texto, cidade: '', ...limparRua } : { estado: texto });
  };
  const trocarCidade = (texto: string) => {
    const nova = cidades ? cidadeOficial(texto, cidades) : null;
    onChange(cidadeEscolhida && nova !== cidadeEscolhida ? { cidade: texto, ...limparRua } : { cidade: texto });
  };

  return (
    <>
      <div>
        <Input
          label="CEP"
          value={value.cep}
          onChange={(e) => { digitouCep.current = true; onChange({ cep: maskCep(e.target.value) }); }}
          placeholder="00000-000"
          inputMode="numeric"
          maxLength={9}
          error={erros.cep}
        />
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500" aria-live="polite">
          {buscandoCep ? (
            <><Loader2 size={12} className="animate-spin" /> Buscando o endereço...</>
          ) : avisoCep ? (
            <span className="text-warning">{avisoCep}</span>
          ) : (
            'Digite o CEP para preencher o endereço sozinho (opcional).'
          )}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[11rem_1fr]">
        <Autocomplete
          label="Estado (UF)"
          value={value.estado}
          onChange={trocarEstado}
          opcoes={opcoesUf}
          placeholder="SP"
          limite={10}
          error={erros.estado}
          semResultado="Estado não encontrado"
        />
        <Autocomplete
          label="Cidade"
          value={value.cidade}
          onChange={trocarCidade}
          opcoes={opcoesCidade}
          placeholder={ufEscolhida ? 'Comece a digitar a cidade' : 'Escolha o estado primeiro'}
          disabled={!ufEscolhida}
          error={erros.cidade}
          semResultado="Cidade não encontrada neste estado"
        />
      </div>
      <Autocomplete
        label="Rua"
        value={value.rua}
        onChange={(texto) => onChange({ rua: texto })}
        onSelect={(opcao) => {
          // Escolheu uma rua da lista: o bairro vem junto
          const escolhida = opcoesRua.find((o) => o.valor === opcao.valor);
          if (escolhida?.bairro) onChange({ bairro: escolhida.bairro });
        }}
        opcoes={opcoesRua}
        filtrar={false}
        carregando={buscandoRuas}
        limite={10}
        disabled={!cidadeEscolhida}
        placeholder={cidadeEscolhida ? 'Comece a digitar a rua (3 letras ou mais)' : 'Escolha a cidade primeiro'}
        maxLength={150}
        error={erros.rua}
        semResultado={value.rua.trim().length < 3 ? 'Digite pelo menos 3 letras' : 'Rua não encontrada: pode digitar à mão'}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[8rem_1fr]">
        <Input label="Número" value={value.numero} onChange={(e) => onChange({ numero: e.target.value })} placeholder="120" maxLength={20} disabled={!cidadeEscolhida} error={erros.numero} />
        <Input label="Bairro" value={value.bairro} onChange={(e) => onChange({ bairro: e.target.value })} placeholder="Centro" maxLength={80} disabled={!cidadeEscolhida} error={erros.bairro} />
      </div>
    </>
  );
}
