import { memo, useCallback, useMemo, useState } from 'react';
import { Check, Crown, Dices, Eye, Scissors, Shirt, Smile, Sparkles, UserRound, type LucideIcon } from 'lucide-react';
import Avatar from './Avatar';
import {
  ACCESSORIES, avatarImageUrl, BG_COLORS, CLOTHES, CLOTH_COLORS, decodeAvatar, DEFAULT_AVATAR_CONFIG, encodeAvatar, EYES,
  EYE_COLORS, FACES, FLAGS, HAIR_COLORS, HAIR_STYLES, isAvatarCode, MOUTHS, NOSES, randomAvatarConfig, SKIN_COLORS,
  type AvatarConfig, type FlagKey, type Option,
} from '@pulyn/avatar';

// Cada aba mostra grupos de peças (miniaturas) e grupos de cores.
type OptionKey = 'face' | 'hairStyle' | 'eyes' | 'mouth' | 'nose' | 'cloth' | 'acc';
type ColorKey = 'skin' | 'hair' | 'eyeColor' | 'clothColor' | 'accColor' | 'bg';

type Section =
  | { kind: 'options'; key: OptionKey; title: string; options: readonly Option[] }
  | { kind: 'colors'; key: ColorKey; title: string; colors: readonly string[] }
  | { kind: 'flags'; title: string };

const TABS: ReadonlyArray<{ id: string; label: string; icon: LucideIcon; sections: readonly Section[] }> = [
  { id: 'face', label: 'Rosto', icon: UserRound, sections: [
    { kind: 'options', key: 'face', title: 'Formato do rosto', options: FACES },
    { kind: 'colors', key: 'skin', title: 'Cor da pele', colors: SKIN_COLORS },
  ] },
  { id: 'hair', label: 'Cabelo', icon: Scissors, sections: [
    { kind: 'options', key: 'hairStyle', title: 'Penteado', options: HAIR_STYLES },
    { kind: 'colors', key: 'hair', title: 'Cor do cabelo', colors: HAIR_COLORS },
  ] },
  { id: 'eyes', label: 'Olhos', icon: Eye, sections: [
    { kind: 'options', key: 'eyes', title: 'Olhos', options: EYES },
    { kind: 'colors', key: 'eyeColor', title: 'Cor dos olhos', colors: EYE_COLORS },
  ] },
  { id: 'mouth', label: 'Boca', icon: Smile, sections: [
    { kind: 'options', key: 'mouth', title: 'Boca', options: MOUTHS },
    { kind: 'options', key: 'nose', title: 'Nariz', options: NOSES },
  ] },
  { id: 'cloth', label: 'Roupa', icon: Shirt, sections: [
    { kind: 'options', key: 'cloth', title: 'Roupa', options: CLOTHES },
    { kind: 'colors', key: 'clothColor', title: 'Cor da roupa', colors: CLOTH_COLORS },
  ] },
  { id: 'acc', label: 'Chapéu', icon: Crown, sections: [
    { kind: 'options', key: 'acc', title: 'Acessório', options: ACCESSORIES },
    { kind: 'colors', key: 'accColor', title: 'Cor do acessório', colors: CLOTH_COLORS },
  ] },
  { id: 'extras', label: 'Extras', icon: Sparkles, sections: [
    { kind: 'flags', title: 'Detalhes' },
    { kind: 'colors', key: 'bg', title: 'Cor do fundo', colors: BG_COLORS },
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
}

// Classes por layout (completas, para o Tailwind enxergar cada uma)
const LAYOUT = {
  responsive: {
    root: 'flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(140px,170px)_minmax(0,1fr)] sm:items-start lg:grid-cols-[minmax(200px,250px)_minmax(0,1fr)]',
    card: 'sticky top-0 z-20 flex items-center gap-3 rounded-2xl border border-cyan-300/20 bg-[#0a1226]/95 p-2 backdrop-blur max-sm:[@media(max-height:520px)]:static sm:top-2 sm:flex-col sm:p-3',
    imgBox: 'aspect-square w-[72px] shrink-0 sm:w-full sm:max-w-[220px]',
    img: 'h-full w-full rounded-2xl border-2 border-cyan-300/40 shadow-lg sm:rounded-3xl sm:border-4',
    legacy: 'h-full w-full overflow-hidden rounded-2xl border-2 border-cyan-300/40 shadow-lg sm:rounded-3xl sm:border-4 [&>div]:!h-full [&>div]:!w-full [&>div]:!rounded-none',
    side: 'flex min-w-0 flex-1 flex-col gap-1.5 sm:w-full sm:flex-none',
    hint: 'text-[11px] leading-snug text-gray-400 sm:text-center sm:text-xs',
    random: 'flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-3 py-2.5 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/20 active:scale-95 disabled:opacity-50 sm:py-3',
    tabsBox: 'sticky top-[88px] z-10 -mx-1 mb-3 bg-[#0a1226]/95 px-1 pb-2 pt-1 backdrop-blur max-sm:[@media(max-height:520px)]:static sm:static sm:bg-transparent sm:p-0 sm:backdrop-blur-none',
    tabs: 'flex snap-x gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible',
    tab: 'sm:min-w-[72px] sm:px-3 sm:py-2',
    tabIcon: 'h-5 w-5 sm:h-6 sm:w-6',
    list: 'space-y-4 sm:max-h-[min(62dvh,600px)] sm:overflow-y-auto sm:overscroll-contain sm:pr-1 sm:scrollbar-thin sm:scrollbar-thumb-primary/50 sm:scrollbar-track-white/5',
  },
  // 'fill': como o 'stacked', mas ocupa a altura da coluna e só a lista de peças rola
  fill: {
    root: 'flex h-full min-h-0 flex-col gap-3',
    card: 'flex shrink-0 items-center gap-3 rounded-2xl border border-cyan-300/20 bg-[#0a1226]/95 p-2',
    imgBox: 'aspect-square w-[72px] shrink-0',
    img: 'h-full w-full rounded-2xl border-2 border-cyan-300/40 shadow-lg',
    legacy: 'h-full w-full overflow-hidden rounded-2xl border-2 border-cyan-300/40 shadow-lg [&>div]:!h-full [&>div]:!w-full [&>div]:!rounded-none',
    side: 'flex min-w-0 flex-1 flex-col gap-1.5',
    hint: 'text-[11px] leading-snug text-gray-400',
    random: 'flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-3 py-2.5 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/20 active:scale-95 disabled:opacity-50',
    tabsBox: 'mb-0 shrink-0',
    tabs: 'flex snap-x gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
    tab: '',
    tabIcon: 'h-5 w-5',
    list: 'min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-white/5',
  },
  stacked: {
    root: 'flex flex-col gap-3',
    card: 'flex items-center gap-3 rounded-2xl border border-cyan-300/20 bg-[#0a1226]/95 p-2',
    imgBox: 'aspect-square w-[72px] shrink-0',
    img: 'h-full w-full rounded-2xl border-2 border-cyan-300/40 shadow-lg',
    legacy: 'h-full w-full overflow-hidden rounded-2xl border-2 border-cyan-300/40 shadow-lg [&>div]:!h-full [&>div]:!w-full [&>div]:!rounded-none',
    side: 'flex min-w-0 flex-1 flex-col gap-1.5',
    hint: 'text-[11px] leading-snug text-gray-400',
    random: 'flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-3 py-2.5 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/20 active:scale-95 disabled:opacity-50',
    tabsBox: 'mb-3',
    tabs: 'flex snap-x gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
    tab: '',
    tabIcon: 'h-5 w-5',
    list: 'max-h-[50dvh] space-y-4 overflow-y-auto overscroll-contain pr-1 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-white/5',
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
      className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-1.5 transition active:scale-95 disabled:opacity-50 ${
        selected
          ? 'border-fuchsia-300 bg-fuchsia-300/15 shadow-[0_0_14px_rgba(240,171,252,0.3)]'
          : 'border-white/10 bg-black/20 hover:border-fuchsia-300/50'
      }`}
    >
      <img src={avatarImageUrl(config)} alt="" decoding="async" loading="lazy" className="aspect-square w-full rounded-xl" />
      <span className="w-full truncate text-center text-[11px] font-semibold text-gray-200">{label}</span>
    </button>
  );
});

function AvatarBuilder({ value, onChange, disabled = false, className = '', layout = 'responsive', previewClassName = '' }: AvatarBuilderProps) {
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
            <Dices className="h-4 w-4 shrink-0" aria-hidden="true" />
            Surpreenda-me
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
                className={`flex min-w-[64px] shrink-0 snap-start flex-col items-center rounded-xl border-2 px-2.5 py-1.5 text-xs font-bold transition active:scale-95 ${L.tab} ${
                  item.id === tab.id
                    ? 'border-fuchsia-300 bg-fuchsia-300/20 text-white'
                    : 'border-white/10 bg-black/20 text-gray-300 hover:border-fuchsia-300/40'
                }`}
              >
                <item.icon className={`mb-0.5 ${L.tabIcon}`} aria-hidden="true" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Peças da aba: no celular a própria página rola; em telas largas a lista tem rolagem própria */}
        <div className={L.list}>
          {tab.sections.map(section => (
            <section key={section.title}>
              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-fuchsia-300">{section.title}</h4>
              {section.kind === 'options' && (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-2">
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
                <div className="flex flex-wrap gap-2.5">
                  {section.colors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => update({ [section.key]: color })}
                      disabled={disabled}
                      aria-label={`Cor ${color}`}
                      aria-pressed={config[section.key] === color}
                      style={{ backgroundColor: color }}
                      className={`h-11 w-11 rounded-full border-2 transition active:scale-90 disabled:opacity-50 ${
                        config[section.key] === color ? 'border-white ring-4 ring-fuchsia-300/60' : 'border-white/30'
                      }`}
                    />
                  ))}
                </div>
              )}
              {section.kind === 'flags' && (
                <div className="flex flex-wrap gap-2">
                  {FLAGS.map(flag => (
                    <button
                      key={flag.key}
                      type="button"
                      onClick={() => update({ [flag.key as FlagKey]: !config[flag.key] })}
                      disabled={disabled}
                      aria-pressed={config[flag.key]}
                      className={`flex items-center gap-1.5 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition active:scale-95 disabled:opacity-50 ${
                        config[flag.key]
                          ? 'border-fuchsia-300 bg-fuchsia-300/20 text-white'
                          : 'border-white/10 bg-black/20 text-gray-300 hover:border-fuchsia-300/40'
                      }`}
                    >
                      {config[flag.key] && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                      {flag.label}
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
