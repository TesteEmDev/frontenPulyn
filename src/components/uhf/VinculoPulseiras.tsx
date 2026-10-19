import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link2, Loader2, Search, Tag, Unlink } from 'lucide-react';
import { api, type UhfPulseira, type UhfTagVista } from '../../services/api';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

const campo = 'w-full rounded-lg border border-dark-border bg-dark-surface px-3 py-2 text-sm text-white focus:border-primary focus:outline-none';
const hexDe = (valor: string) => valor.toUpperCase().replace(/[^0-9A-F]/g, '');
const haQuanto = (data: string) => {
  const segundos = Math.max(0, Math.round((Date.now() - new Date(data).getTime()) / 1000));
  return segundos < 60 ? `há ${segundos} s` : `há ${Math.round(segundos / 60)} min`;
};

// Vínculo entre a tag UHF (EPC) e a pulseira (código NFC). Com uma pulseira perto de uma antena, a tag dela aparece em
// "Tags lidas agora"; escolha a tag e depois a pulseira (busque pelo código, pelo nome da criança ou passe no leitor
// NFC que digita o código).
export default function VinculoPulseiras() {
  const [tags, setTags] = useState<UhfTagVista[]>([]);
  const [pulseiras, setPulseiras] = useState<UhfPulseira[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [epcSelecionado, setEpcSelecionado] = useState('');
  const [busca, setBusca] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const carregarPulseiras = useCallback(async () => {
    try { setPulseiras(await api.getUhfPulseiras()); }
    catch (err) { setErro(err instanceof Error ? err.message : 'Não foi possível carregar as pulseiras.'); }
  }, []);

  const carregarTags = useCallback(async () => {
    try { setTags(await api.getUhfTagsVistas()); } catch { /* tenta de novo no próximo ciclo */ }
  }, []);

  useEffect(() => {
    Promise.all([carregarPulseiras(), carregarTags()]).finally(() => setCarregando(false));
    const intervalo = setInterval(carregarTags, 2000);   // o leitor manda 2 lotes por segundo
    return () => clearInterval(intervalo);
  }, [carregarPulseiras, carregarTags]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const termoHex = hexDe(busca);
    if (!termo) return pulseiras;
    return pulseiras.filter((p) => (termoHex && p.codigo.includes(termoHex))
      || (p.crianca || '').toLowerCase().includes(termo)
      || (termoHex && (p.epc || '').includes(termoHex)));
  }, [busca, pulseiras]);

  const vinculadas = pulseiras.filter((p) => p.epc).length;
  const epcValido = hexDe(epcSelecionado).length > 0 && hexDe(epcSelecionado).length <= 24;
  const donoDoEpc = epcValido ? pulseiras.find((p) => p.epc && p.epc.replace(/^0+/, '') === hexDe(epcSelecionado).replace(/^0+/, '')) : undefined;

  const salvar = async (codigo: string, epc: string | null, mensagem: string) => {
    setSalvando(true);
    setErro('');
    try {
      await api.vincularUhfEpc(codigo, epc);
      setAviso(mensagem);
      if (epc) { setEpcSelecionado(''); setBusca(''); }
      await Promise.all([carregarPulseiras(), carregarTags()]);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar o vínculo.');
    } finally {
      setSalvando(false);
    }
  };

  const vincular = (pulseira: UhfPulseira) => {
    if (!epcValido) return;
    if (pulseira.epc && !window.confirm(`A pulseira ${pulseira.codigo} já tem o EPC ${pulseira.epc}. Trocar pelo novo?`)) return;
    salvar(pulseira.codigo, hexDe(epcSelecionado), `EPC vinculado à pulseira ${pulseira.codigo}.`);
  };

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-lg text-white">Pulseiras UHF</h3>
          <p className="text-xs text-gray-500">
            Vincule o EPC gravado na tag UHF ao código NFC da pulseira. Deixe só a pulseira que vai vincular perto de uma antena:
            a tag dela aparece em "Tags lidas agora" em poucos segundos.
          </p>
        </div>
        <Badge variant={vinculadas === pulseiras.length && pulseiras.length > 0 ? 'success' : 'secondary'}>
          {vinculadas} de {pulseiras.length} com EPC
        </Badge>
      </div>

      {erro && <p role="alert" className="mb-3 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-red-300">{erro}</p>}
      {aviso && !erro && <p className="mb-3 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-green-300">{aviso}</p>}

      {carregando ? (
        <p className="py-6 text-center text-gray-400"><Loader2 className="mr-2 inline animate-spin" size={16} />Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 1. Tag */}
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">1. Tags lidas agora (últimos 2 min)</p>
            {tags.length === 0 ? (
              <p className="rounded-lg bg-surface/50 p-4 text-center text-sm text-gray-500">
                Nenhuma tag lida. Confira se o leitor está online e se a pulseira está perto de uma antena posicionada e ativa.
              </p>
            ) : (
              <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
                {tags.map((t) => (
                  <button
                    key={t.tag}
                    type="button"
                    onClick={() => setEpcSelecionado(t.epc)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left text-sm transition-colors ${
                      hexDe(epcSelecionado) === t.epc ? 'border-primary bg-primary/10' : 'border-white/5 bg-surface/50 hover:border-primary/40'
                    }`}
                  >
                    <Tag size={14} className="shrink-0 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs text-white">{t.epc}</p>
                      <p className="truncate text-xs text-gray-500">{t.antenas.join(', ')} · {t.rssiMax.toFixed(1)} dBm · {haQuanto(t.ultimaVez)}</p>
                    </div>
                    {t.pulseira
                      ? <Badge variant="success">{t.pulseira.nome || t.pulseira.codigo}</Badge>
                      : <Badge variant="warning">Sem vínculo</Badge>}
                  </button>
                ))}
              </div>
            )}
            <label className="mt-3 block text-sm text-gray-300">EPC escolhido (ou digite)
              <input
                className={`${campo} mt-1 font-mono`}
                value={epcSelecionado}
                onChange={(e) => setEpcSelecionado(e.target.value)}
                placeholder="ABCABC000000000000000010"
                maxLength={30}
              />
            </label>
            {epcSelecionado && !epcValido && <p className="mt-1 text-xs text-red-300">Use até 24 caracteres hexadecimais (0-9, A-F).</p>}
            {donoDoEpc && <p className="mt-1 text-xs text-yellow-300">Este EPC já é da pulseira {donoDoEpc.codigo}. Desvincule lá antes de usar em outra.</p>}
          </div>

          {/* 2. Pulseira */}
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">2. Pulseira</p>
            <div className="relative mb-2">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                className={`${campo} pl-8`}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => {
                  // Leitor NFC que digita o código + Enter: vincula direto se o código bater com uma pulseira só.
                  if (e.key !== 'Enter' || filtradas.length !== 1 || !epcValido || donoDoEpc) return;
                  e.preventDefault();
                  vincular(filtradas[0]);
                }}
                placeholder="Código NFC, nome da criança ou EPC"
              />
            </div>
            <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
              {filtradas.length === 0 && <p className="p-4 text-center text-sm text-gray-500">Nenhuma pulseira encontrada.</p>}
              {filtradas.map((p) => (
                <div key={p.codigo} className="flex items-center gap-3 rounded-lg bg-surface/50 p-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs text-white">{p.codigo}{p.crianca ? <span className="ml-2 font-sans text-gray-400">{p.crianca}</span> : null}</p>
                    <p className="truncate font-mono text-xs text-gray-500">{p.epc ? `EPC ${p.epc}` : 'sem EPC'}</p>
                  </div>
                  {p.epc && (
                    <Button size="sm" variant="ghost" disabled={salvando} aria-label={`Desvincular EPC da pulseira ${p.codigo}`}
                      onClick={() => window.confirm(`Desvincular o EPC da pulseira ${p.codigo}?`) && salvar(p.codigo, null, `EPC desvinculado da pulseira ${p.codigo}.`)}>
                      <Unlink size={14} />
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" disabled={salvando || !epcValido || Boolean(donoDoEpc)} onClick={() => vincular(p)}>
                    <Link2 size={14} className="mr-1" />Vincular
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
