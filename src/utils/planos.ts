// Planos da plataforma no painel do master: nome exibido, opções de seleção e cor do selo.
// Valor, limites e lista de recursos de cada plano vêm da API (utils/planDefinitions.js no backend).
export type PlanoId = 'starter' | 'professional' | 'enterprise' | 'pulynball';

export const PLANOS_SELECIONAVEIS: { value: PlanoId; label: string }[] = [
  { value: 'starter', label: 'Starter' },
  { value: 'professional', label: 'Professional' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'pulynball', label: 'PulynBall' },
];

export type PlanoBadge = 'primary' | 'secondary' | 'accent' | 'muted';

const BADGE_POR_PLANO: Record<string, PlanoBadge> = {
  enterprise: 'primary',
  professional: 'secondary',
  pulynball: 'accent',
  starter: 'muted',
};

// Classe de cor das barras do gráfico de receita por plano.
export const COR_BARRA_POR_PLANO: Record<string, string> = {
  enterprise: 'bg-primary',
  professional: 'bg-secondary',
  pulynball: 'bg-accent',
  starter: 'bg-gray-500',
};

export function planoBadge(plano: string): PlanoBadge {
  return BADGE_POR_PLANO[plano] || 'muted';
}

export function planoRotulo(plano: string): string {
  const conhecido = PLANOS_SELECIONAVEIS.find(item => item.value === plano);
  return conhecido ? conhecido.label : plano.charAt(0).toUpperCase() + plano.slice(1);
}
