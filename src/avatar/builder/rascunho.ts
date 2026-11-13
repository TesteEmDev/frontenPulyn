// Rascunho do avatar: guarda no aparelho o personagem que está sendo montado, para não se perder se a página for atualizada.
// Cada tela usa a sua chave (check-in da recepção e kiosk têm rascunhos separados).
import { decodeAvatar, newAvatarCode } from '@pulyn/avatar';

export const CHAVE_RASCUNHO_CHECKIN = 'pulyn.avatarRascunho.checkin';
export const CHAVE_RASCUNHO_KIOSK = 'pulyn.avatarRascunho.kiosk';

// O avatar salvo (se ainda for um código válido) ou um personagem novo sorteado
export function lerAvatarRascunho(chave: string): string {
  try {
    const salvo = localStorage.getItem(chave);
    if (salvo && decodeAvatar(salvo)) return salvo;
  } catch {
    // sem acesso ao armazenamento (janela privada, dados bloqueados): segue com um personagem novo
  }
  return newAvatarCode();
}

export function salvarAvatarRascunho(chave: string, codigo: string): void {
  try {
    localStorage.setItem(chave, codigo);
  } catch {
    // sem armazenamento: o rascunho simplesmente não é guardado
  }
}
