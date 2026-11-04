// Token da sessão. O telão aberto pela recepção guarda o dele só na aba (sessionStorage): se fosse no localStorage,
// trocaria a sessão da recepção nas outras abas do mesmo navegador. Quem lê o token passa por aqui.
const CHAVE = 'authToken';

export function lerToken(): string | null {
  try {
    return sessionStorage.getItem(CHAVE) || localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

// Esta aba tem sessão própria (telão aberto pela equipe)?
export function sessaoSoDestaAba(): boolean {
  try {
    return Boolean(sessionStorage.getItem(CHAVE));
  } catch {
    return false;
  }
}

export function guardarTokenSoDestaAba(token: string): void {
  sessionStorage.setItem(CHAVE, token);
}

export function limparTokenDestaAba(): void {
  try {
    sessionStorage.removeItem(CHAVE);
  } catch {
    // sem sessionStorage: nada a limpar
  }
}
