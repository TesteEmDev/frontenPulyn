import { memo, useCallback, useMemo, useState } from 'react';
import Avatar from './Avatar';
import SeletorDeCor from './SeletorDeCor';
import {
  avatarImageUrl,
  decodeAvatar,
  DEFAULT_AVATAR_CONFIG,
  encodeAvatar,
  isAvatarCode,
  randomAvatarConfig,
} from '../../avatar/builder/code';
import type { AvatarConfig } from '../../avatar/builder/config';
import {
  ACCESSORIES, BG_COLORS, CLOTHES, CLOTH_COLORS, EARRINGS, EYES, EYE_COLORS, FACES, FLAGS, GLASSES, HAIR_COLORS, HAIR_STYLES,
  MOUTHS, NECKLACES, NOSES, SKIN_COLORS, type FlagKey, type Option,
} from '../../avatar/builder/parts';

// Cada aba mostra grupos de peças (miniaturas) e grupos de cores.
type OptionKey = 'face' | 'hairStyle' | 'eyes' | 'mouth' | 'nose' | 'cloth' | 'acc' | 'glassesStyle' | 'neck' | 'earringStyle';
type ColorKey = 'skin' | 'hair' | 'eyeColor' | 'clothColor' | 'accColor' | 'gearColor' | 'bg';

// semTitulo: a seção só repetiria o nome da aba (ex.: aba Rosto > "Formato do rosto"), então o título some.
type Section =
  | { kind: 'options'; key: OptionKey; title: string; options: readonly Option[]; semTitulo?: boolean }
  | { kind: 'colors'; key: ColorKey; title: string; colors: readonly string[]; semTitulo?: boolean }
  | { kind: 'flags'; title: string; keys: readonly FlagKey[]; semTitulo?: boolean };

const TABS: ReadonlyArray<{ id: string; label: string; icon: string; sections: readonly Section[] }> = [
  { id: 'face', label: 'Rosto', icon: '🙂', sections: [
    { kind: 'options', key: 'face', title: 'Formato do rosto', options: FACES, semTitulo: true },
    { kind: 'colors', key: 'skin', title: 'Cor da pele', colors: SKIN_COLORS },
    { kind: 'flags', title: 'Detalhes do rosto', keys: ['blush', 'freckles', 'mole', 'bandaid', 'chibi'] },
  ] },
  { id: 'hair', label: 'Cabelo', icon: '💇', sections: [
    { kind: 'options', key: 'hairStyle', title: 'Penteado', options: HAIR_STYLES, semTitulo: true },
    { kind: 'colors', key: 'hair', title: 'Cor do cabelo', colors: HAIR_COLORS },
  ] },
  { id: 'eyes', label: 'Olhos', icon: '👀', sections: [
    { kind: 'options', key: 'eyes', title: 'Olhos', options: EYES, semTitulo: true },
    { kind: 'colors', key: 'eyeColor', title: 'Cor dos olhos', colors: EYE_COLORS },
    { kind: 'flags', title: 'Detalhes dos olhos', keys: ['lashes'] },
  ] },
  { id: 'mouth', label: 'Boca', icon: '👄', sections: [
    { kind: 'options', key: 'mouth', title: 'Boca', options: MOUTHS, semTitulo: true },
    { kind: 'options', key: 'nose', title: 'Nariz', options: NOSES },
  ] },
  { id: 'cloth', label: 'Roupa', icon: '👕', sections: [
    { kind: 'options', key: 'cloth', title: 'Roupa', options: CLOTHES, semTitulo: true },
    { kind: 'colors', key: 'clothColor', title: 'Cor da roupa', colors: CLOTH_COLORS },
  ] },
  { id: 'acc', label: 'Chapéu', icon: '🎩', sections: [
    { kind: 'options', key: 'acc', title: 'Chapéu e adereços de cabeça', options: ACCESSORIES, semTitulo: true },
    { kind: 'colors', key: 'accColor', title: 'Cor do chapéu', colors: CLOTH_COLORS },
  ] },
  { id: 'gear', label: 'Acessórios', icon: '🕶️', sections: [
    { kind: 'options', key: 'glassesStyle', title: 'Óculos', options: GLASSES },
    { kind: 'options', key: 'neck', title: 'Colar e lenço', options: NECKLACES },
    { kind: 'options', key: 'earringStyle', title: 'Brinco', options: EARRINGS },
    { kind: 'colors', key: 'gearColor', title: 'Cor dos acessórios', colors: CLOTH_COLORS },
  ] },
  { id: 'extras', label: 'Fundo', icon: '🎨', sections: [
    { kind: 'colors', key: 'bg', title: 'Cor do fundo', colors: BG_COLORS, semTitulo: true },
  ] },
];

interface AvatarBuilderProps {
  /** Código do avatar (pulyn1-...). Se não for um código válido, o montador começa de um personagem padrão. */
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  className?: string;
  /**
   * 'responsive' (padrão): celular em uma coluna com pré-visualização e abas fixas; a partir de 640px, duas colunas.
   * 'stacked': sempre uma coluna sem partes fixas, para quando o montador fica dentro de uma coluna estreita.
   */
  layout?: 'responsive' | 'stacked' | 'fill';
  /** Classes extras da pré-visualização do próprio montador (ex.: 'lg:hidden' quando a foto fica em outro lugar da tela). */
  previewClassName?: string;
  /** No máximo duas linhas de botões por seção: o que não cabe rola para o lado, em vez de para baixo (autoatendimento). */
  duasLinhas?: boolean;
}

// Classes por layout (completas, para o Tailwind enxergar cada uma)
const LAYOUT = {
  responsive: {
    root: 'flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(140px,170px)_minmax(0,1fr)] sm:items-start lg:grid-cols-[minmax(200px,250px)_minmax(0,1fr)]',
    card: 'sticky top-0 z-20 flex items-center gap-3 rounded-3xl border border-fuchsia-300/20 bg-gradient-to-br from-[#1b1240]/95 to-[#0a1226]/95 shadow-[0_8px_26px_rgba(0,0,0,0.35)] p-2 backdrop-blur max-sm:[@media(max-height:520px)]:static sm:top-2 sm:flex-col sm:p-3',
    imgBox: 'aspect-square w-[72px] shrink-0 sm:w-full sm:max-w-[220px]',
    img: 'h-full w-full rounded-full border-4 border-white/70 object-cover shadow-[0_0_24px_rgba(217,70,239,0.45)]',
    legacy: 'h-full w-full overflow-hidden rounded-full border-4 border-white/70 shadow-[0_0_24px_rgba(217,70,239,0.45)] [&>div]:!h-full [&>div]:!w-full [&>div]:!rounded-none',
    side: 'flex min-w-0 flex-1 flex-col gap-1.5 sm:w-full sm:flex-none',
    hint: 'text-[11px] leading-snug text-gray-400 sm:text-center sm:text-xs',
    random: 'w-full rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_6px_16px_rgba(168,85,247,0.45)] transition hover:brightness-110 active:scale-95 disabled:opacity-50 sm:py-3',
    tabsBox: 'sticky top-[88px] z-10 -mx-1 mb-3 bg-[#0a1226]/95 px-1 pb-2 pt-1 backdrop-blur max-sm:[@media(max-height:520px)]:static sm:static sm:bg-transparent sm:p-0 sm:backdrop-blur-none',
    tabs: 'flex snap-x gap-2.5 overflow-x-auto px-0.5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible',
    tab: 'sm:min-w-[72px] sm:px-3 sm:py-2',
    tabIcon: 'text-lg sm:text-xl',
    list: 'space-y-5 sm:max-h-[min(62dvh,600px)] sm:overflow-y-auto sm:overscroll-contain sm:rounded-3xl sm:border sm:border-white/[0.07] sm:bg-white/[0.03] sm:p-3 sm:scrollbar-thin sm:scrollbar-thumb-primary/50 sm:scrollbar-track-white/5',
  },
  // 'fill': como o 'stacked', mas ocupa a altura da coluna e só a lista de peças rola
  fill: {
    root: 'flex h-full min-h-0 flex-col gap-3',
    card: 'flex shrink-0 items-center gap-3 rounded-3xl border border-fuchsia-300/20 bg-gradient-to-br from-[#1b1240]/95 to-[#0a1226]/95 shadow-[0_8px_26px_rgba(0,0,0,0.35)] p-2',
    imgBox: 'aspect-square w-[72px] shrink-0',
    img: 'h-full w-full rounded-full border-4 border-white/70 object-cover shadow-[0_0_24px_rgba(217,70,239,0.45)]',
    legacy: 'h-full w-full overflow-hidden rounded-full border-4 border-white/70 shadow-[0_0_24px_rgba(217,70,239,0.45)] [&>div]:!h-full [&>div]:!w-full [&>div]:!rounded-none',
    side: 'flex min-w-0 flex-1 flex-col gap-1.5',
    hint: 'text-[11px] leading-snug text-gray-400',
    random: 'w-full rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_6px_16px_rgba(168,85,247,0.45)] transition hover:brightness-110 active:scale-95 disabled:opacity-50',
    tabsBox: 'mb-2.5 shrink-0',
    tabs: 'flex snap-x gap-2.5 overflow-x-auto px-0.5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
    tab: '',
    tabIcon: 'text-lg',
    list: 'min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain rounded-3xl border border-white/[0.07] bg-white/[0.03] p-3 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-white/5',
  },
  stacked: {
    root: 'flex flex-col gap-3',
    card: 'flex items-center gap-3 rounded-3xl border border-fuchsia-300/20 bg-gradient-to-br from-[#1b1240]/95 to-[#0a1226]/95 shadow-[0_8px_26px_rgba(0,0,0,0.35)] p-2',
    imgBox: 'aspect-square w-[72px] shrink-0',
    img: 'h-full w-full rounded-full border-4 border-white/70 object-cover shadow-[0_0_24px_rgba(217,70,239,0.45)]',
    legacy: 'h-full w-full overflow-hidden rounded-full border-4 border-white/70 shadow-[0_0_24px_rgba(217,70,239,0.45)] [&>div]:!h-full [&>div]:!w-full [&>div]:!rounded-none',
    side: 'flex min-w-0 flex-1 flex-col gap-1.5',
    hint: 'text-[11px] leading-snug text-gray-400',
    random: 'w-full rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_6px_16px_rgba(168,85,247,0.45)] transition hover:brightness-110 active:scale-95 disabled:opacity-50',
    tabsBox: 'mb-3.5',
    tabs: 'flex snap-x gap-2.5 overflow-x-auto px-0.5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
    tab: '',
    tabIcon: 'text-lg',
    list: 'max-h-[50dvh] space-y-5 overflow-y-auto overscroll-contain rounded-3xl border border-white/[0.07] bg-white/[0.03] p-3 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-white/5',
  },
} as const;

// Miniatura de uma opção: o personagem atual com aquela peça trocada.
const Thumb = memo(function Thumb({ config, selected, label, disabled, onPick }: {
  config: AvatarConfig; selected: boolean; label: string; disabled: boolean; onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={label}
      className={`group relative flex flex-col items-center gap-1.5 rounded-3xl border-2 p-2 transition duration-200 active:scale-95 disabled:opacity-50 ${
        selected
          ? 'border-fuchsia-300 bg-gradient-to-b from-fuchsia-400/25 to-violet-500/15 shadow-[0_8px_22px_rgba(217,70,239,0.35)]'
          : 'border-white/10 bg-gradient-to-b from-white/[0.06] to-black/20 hover:-translate-y-0.5 hover:border-fuchsia-300/50 hover:shadow-[0_8px_18px_rgba(0,0,0,0.35)]'
      }`}
    >
      <img
        src={avatarImageUrl(config)}
        alt=""
        decoding="async"
        loading="lazy"
        className={`aspect-square w-full rounded-full border-2 object-cover shadow-md transition duration-200 group-hover:scale-[1.03] ${selected ? 'border-white/80' : 'border-white/15'}`}
      />
      <span className={`w-full truncate text-center text-[11px] font-bold ${selected ? 'text-white' : 'text-gray-300'}`}>{label}</span>
      {selected && (
        <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-fuchsia-400 text-[11px] font-black text-white shadow-lg ring-2 ring-[#0a1226]">✓</span>
      )}
    </button>
  );
});

// Botão "cor personalizada": abre ali mesmo, embaixo, uma roda de cores (SeletorDeCor). A cor vale na hora e vira o fundo do
// avatar (e a cor do participante). Tocar de novo no botão recolhe a roda.
function CorPersonalizada({ value, selecionada, disabled, onChange }: { value: string; selecionada: boolean; disabled: boolean; onChange: (cor: string) => void }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(atual => !atual)}
        disabled={disabled}
        aria-expanded={aberto}
        className={`flex h-11 items-center gap-2 rounded-full border-2 px-3 text-xs font-bold text-white transition active:scale-95 disabled:opacity-50 ${
          selecionada || aberto ? 'border-white ring-4 ring-fuchsia-300/60' : 'border-white/30'
        }`}
        style={selecionada ? { backgroundColor: value } : { background: 'conic-gradient(#ef4444, #eab308, #22c55e, #06b6d4, #8b5cf6, #ec4899, #ef4444)' }}
      >
        <span className="rounded-full bg-black/55 px-2 py-0.5">🎨 Cor personalizada {aberto ? '▴' : '▾'}</span>
      </button>
      {aberto && (
        <div className="basis-full">
          <SeletorDeCor valor={/^#[0-9a-f]{6}$/i.test(value) ? value : '#6ec6ff'} onChange={cor => onChange(cor.toLowerCase())} disabled={disabled} className="py-3" />
        </div>
      )}
    </>
  );
}

function AvatarBuilder({ value, onChange, disabled = false, className = '', layout = 'responsive', previewClassName = '', duasLinhas = false }: AvatarBuilderProps) {
  const L = LAYOUT[layout];
  const [tabId, setTabId] = useState(TABS[0].id);
  const config = useMemo(() => decodeAvatar(value) ?? DEFAULT_AVATAR_CONFIG, [value]);
  const tab = TABS.find(item => item.id === tabId) ?? TABS[0];

  const update = useCallback((patch: Partial<AvatarConfig>) => {
    onChange(encodeAvatar({ ...config, ...patch }));
  }, [config, onChange]);

  const isCode = isAvatarCode(value);

  return (
    // Celular: uma coluna, com a pré-visualização e as abas fixas no topo enquanto a criança rola as peças.
    // Tablet/desktop: pré-visualização à esquerda e peças à direita (rolagem só na lista de peças).
    <div className={`${L.root} ${className}`}>
      {/* Pré-visualização */}
      <div className={`${L.card} ${previewClassName}`}>
        <div className={L.imgBox}>
          {isCode ? (
            <img
              src={avatarImageUrl(config)}
              alt="Seu personagem"
              className={L.img}
            />
          ) : (
            // Cadastro antigo com personagem pronto: mostra o atual até a criança trocar a primeira peça.
            <div className={L.legacy}>
              <Avatar emoji={value} size="xl" shape="square" decorative />
            </div>
          )}
        </div>
        <div className={L.side}>
          {!isCode && (
            <p className={L.hint}>
              Toque numa peça para criar um personagem novo.
            </p>
          )}
          <button
            type="button"
            onClick={() => onChange(encodeAvatar(randomAvatarConfig()))}
            disabled={disabled}
            className={L.random}
          >
            🎲 Surpreenda-me
          </button>
        </div>
      </div>

      <div className={layout === 'fill' ? 'flex min-h-0 min-w-0 flex-1 flex-col' : 'min-w-0'}>
        {/* Abas: ficam fixas logo abaixo da pré-visualização no celular */}
        <div className={L.tabsBox}>
          <div role="tablist" aria-label="Partes do personagem" className={L.tabs}>
            {TABS.map(item => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={item.id === tab.id}
                onClick={() => setTabId(item.id)}
                className={`flex min-w-[64px] shrink-0 snap-start flex-col items-center rounded-2xl border px-3 py-1.5 text-xs font-bold transition duration-200 active:scale-95 ${L.tab} ${
                  item.id === tab.id
                    ? 'border-transparent bg-gradient-to-b from-fuchsia-500 to-violet-600 text-white shadow-[0_6px_16px_rgba(168,85,247,0.5)]'
                    : 'border-white/10 bg-white/[0.04] text-gray-300 hover:border-fuchsia-300/40 hover:bg-white/[0.08]'
                }`}
              >
                <span className={L.tabIcon} aria-hidden="true">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Peças da aba: no celular a própria página rola; em telas largas a lista tem rolagem própria */}
        {/* duasLinhas (autoatendimento): altura fixa em todas as abas, para a lista não crescer nem encolher ao trocar de aba; o que passar disso rola dentro dela */}
        <div className={`${L.list} ${duasLinhas ? 'h-[min(62dvh,600px)] overflow-y-auto overscroll-contain' : ''}`}>
          {tab.sections.map(section => (
            <section key={section.title}>
              {!section.semTitulo && (
              <h4 className="mb-2.5 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-fuchsia-200">
                <span aria-hidden="true" className="h-3.5 w-1 rounded-full bg-gradient-to-b from-fuchsia-300 to-violet-400" />
                {section.title}
                <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-fuchsia-300/30 to-transparent" />
              </h4>
              )}
              {section.kind === 'options' && (
                <div className={duasLinhas
                  ? 'grid auto-cols-[92px] grid-flow-col grid-rows-2 gap-2.5 overflow-x-auto overscroll-x-contain pb-2 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-white/5'
                  : 'grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-2.5'}>
                  {section.options.map(option => (
                    <Thumb
                      key={option.value}
                      config={{ ...config, [section.key]: option.value }}
                      selected={config[section.key] === option.value}
                      label={option.label}
                      disabled={disabled}
                      onPick={() => update({ [section.key]: option.value })}
                    />
                  ))}
                </div>
              )}
              {section.kind === 'colors' && (
                // A cor personalizada abre o seletor logo abaixo do botão: por isso o fundo (que a tem) continua quebrando linha
                <div className={duasLinhas && section.key !== 'bg'
                  ? 'grid auto-cols-max grid-flow-col grid-rows-2 gap-2.5 overflow-x-auto overscroll-x-contain px-1 py-1 pb-2 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-white/5'
                  : 'flex flex-wrap gap-2.5'}>
                  {section.colors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => update({ [section.key]: color })}
                      disabled={disabled}
                      aria-label={`Cor ${color}`}
                      aria-pressed={config[section.key] === color}
                      style={{ backgroundColor: color }}
                      className={`relative h-11 w-11 rounded-full border-2 shadow-md transition duration-200 hover:scale-110 active:scale-90 disabled:opacity-50 ${
                        config[section.key] === color ? 'scale-110 border-white ring-4 ring-fuchsia-300/60' : 'border-white/30'
                      }`}
                    >
                      {config[section.key] === color && <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-sm font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">✓</span>}
                    </button>
                  ))}
                  {section.key === 'bg' && (
                    <CorPersonalizada
                      value={config.bg}
                      selecionada={!section.colors.includes(config.bg)}
                      disabled={disabled}
                      onChange={cor => update({ bg: cor })}
                    />
                  )}
                </div>
              )}
              {section.kind === 'flags' && (
                <div className={duasLinhas
                  ? 'grid auto-cols-max grid-flow-col grid-rows-2 gap-2 overflow-x-auto overscroll-x-contain pb-2 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-white/5'
                  : 'flex flex-wrap gap-2'}>
                  {FLAGS.filter(flag => section.keys.includes(flag.key)).map(flag => (
                    <button
                      key={flag.key}
                      type="button"
                      onClick={() => update({ [flag.key as FlagKey]: !config[flag.key] })}
                      disabled={disabled}
                      aria-pressed={config[flag.key]}
                      className={`rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition active:scale-95 disabled:opacity-50 ${
                        config[flag.key]
                          ? 'border-fuchsia-300 bg-fuchsia-300/20 text-white'
                          : 'border-white/10 bg-black/20 text-gray-300 hover:border-fuchsia-300/40'
                      }`}
                    >
                      {config[flag.key] ? '✓ ' : ''}{flag.label}
                    </button>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(AvatarBuilder);
