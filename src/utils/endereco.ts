// Endereço do buffet: CEP (ViaCEP, serviço público e gratuito dos Correios), estado, cidade, rua, número e bairro.
import { useEffect, useState } from 'react';
import { ESTADOS_BRASIL } from './estadosBrasil';
import { semAcento } from '../components/ui/Autocomplete';

export interface EnderecoForm {
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export const ENDERECO_VAZIO: EnderecoForm = { cep: '', rua: '', numero: '', bairro: '', cidade: '', estado: '' };

// Formata enquanto digita: 00000-000
export function maskCep(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export const cepCompleto = (valor: string) => valor.replace(/\D/g, '').length === 8;

// "sp", "SP" ou "São Paulo" -> "SP"; texto que não é um estado -> null
export function ufDoTexto(texto: string): string | null {
  const busca = semAcento(texto);
  if (!busca) return null;
  const achado = ESTADOS_BRASIL.find((e) => semAcento(e.uf) === busca || semAcento(e.nome) === busca);
  return achado?.uf ?? null;
}

// Grafia oficial da cidade digitada (sem diferença de acento ou maiúscula); null se não existe no estado
export function cidadeOficial(texto: string, cidades: string[]): string | null {
  const busca = semAcento(texto);
  return busca ? cidades.find((c) => semAcento(c) === busca) ?? null : null;
}

// Cidades do estado escolhido (carregadas sob demanda: a lista de municípios é grande); null = ainda sem estado válido
export function useCidadesDoEstado(uf: string | null): string[] | null {
  const [cidades, setCidades] = useState<string[] | null>(null);
  useEffect(() => {
    if (!uf) { setCidades(null); return undefined; }
    let vivo = true;
    import('./municipiosBrasil')
      .then((m) => { if (vivo) setCidades(m.MUNICIPIOS_POR_UF[uf] ?? []); })
      .catch(() => { if (vivo) setCidades(null); });
    return () => { vivo = false; };
  }, [uf]);
  return cidades;
}

export interface RuaEncontrada { logradouro: string; bairro: string }

// Ruas da cidade que combinam com o texto digitado (ViaCEP). Precisa de internet; sem ela a lista fica vazia
// e a rua continua podendo ser digitada à mão.
export async function buscarRuas(uf: string, cidade: string, texto: string, sinal: AbortSignal): Promise<RuaEncontrada[]> {
  const url = `https://viacep.com.br/ws/${uf}/${encodeURIComponent(cidade)}/${encodeURIComponent(texto)}/json/`;
  const resposta = await fetch(url, { signal: sinal });
  if (!resposta.ok) return [];
  const dados = await resposta.json();
  if (!Array.isArray(dados)) return [];
  const vistos = new Set<string>();
  const ruas: RuaEncontrada[] = [];
  for (const item of dados) {
    const logradouro = String(item?.logradouro ?? '').trim();
    if (!logradouro) continue;
    const bairro = String(item?.bairro ?? '').trim();
    const chave = `${logradouro}|${bairro}`.toLowerCase();
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    ruas.push({ logradouro, bairro });
  }
  return ruas;
}

export interface CepEncontrado { rua: string; bairro: string; cidade: string; estado: string }

// Endereço de um CEP completo. null = o CEP não existe; lança erro se o ViaCEP não respondeu (sem internet, por exemplo).
export async function buscarCep(cep: string, sinal?: AbortSignal): Promise<CepEncontrado | null> {
  const digitos = cep.replace(/\D/g, '');
  const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`, { signal: sinal });
  if (!resposta.ok) {
    // 400 = formato de CEP inválido: para o usuário é o mesmo que "não encontrado"
    if (resposta.status === 400) return null;
    throw new Error(`ViaCEP respondeu ${resposta.status}`);
  }
  const dados = await resposta.json();
  if (!dados || dados.erro) return null;
  return {
    rua: String(dados.logradouro ?? '').trim(),
    bairro: String(dados.bairro ?? '').trim(),
    cidade: String(dados.localidade ?? '').trim(),
    estado: String(dados.uf ?? '').trim().toUpperCase(),
  };
}

// O cadastro guarda o endereço em um texto só: "Rua A, 120 - Centro" (e " - CEP 01234-567" quando o CEP foi informado)
export function formatarEndereco(f: Pick<EnderecoForm, 'rua' | 'numero' | 'bairro' | 'cep'>): string {
  const base = `${f.rua.trim()}, ${f.numero.trim()} - ${f.bairro.trim()}`;
  return cepCompleto(f.cep) ? `${base} - CEP ${maskCep(f.cep)}` : base;
}

// Faz o caminho de volta, para editar um cadastro. Texto fora desse formato (cadastros antigos) vai inteiro na rua.
export function lerEndereco(texto: string): Pick<EnderecoForm, 'cep' | 'rua' | 'numero' | 'bairro'> {
  const original = (texto || '').trim();
  let resto = original;
  let cep = '';
  const comCep = /\s-\sCEP\s(\d{5}-?\d{3})$/.exec(resto);
  if (comCep) {
    cep = maskCep(comCep[1]);
    resto = resto.slice(0, comCep.index);
  }
  const partes = /^(.*?),\s*(.*?)\s-\s(.+)$/.exec(resto);
  if (!partes) return { cep, rua: resto, numero: '', bairro: '' };
  return { cep, rua: partes[1].trim(), numero: partes[2].trim(), bairro: partes[3].trim() };
}
