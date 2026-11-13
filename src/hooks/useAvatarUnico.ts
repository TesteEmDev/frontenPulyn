import { useCallback, useEffect, useRef } from 'react';
import { newAvatarCode } from '@pulyn/avatar';

// Cada participante do evento tem um avatar só dele. `emUso` são os avatares dos outros participantes.
//  - avatar que a pessoa ainda não mexeu (sorteado ao abrir o cadastro) e que alguém já usa: troca sozinho por outro sorteado;
//  - avatar que ela montou/escolheu e alguém já usa: `repetido` fica true (a tela avisa e não deixa salvar até mudar uma peça).
// `proprio`: avatar da própria criança já cadastrada no evento (não conta como repetido).
export function useAvatarUnico(emUso: readonly string[], avatar: string, trocar: (codigo: string) => void, proprio: string | null = null) {
  const escolhidoPelaPessoa = useRef(false);
  const repetido = avatar !== proprio && emUso.includes(avatar);

  useEffect(() => {
    if (repetido && !escolhidoPelaPessoa.current) trocar(newAvatarCode());
  }, [repetido, avatar, trocar]);

  // Chame quando a pessoa mexer no avatar
  const marcarEscolhido = useCallback(() => { escolhidoPelaPessoa.current = true; }, []);
  // Chame quando o formulário voltar ao início (novo cadastro)
  const reiniciar = useCallback(() => { escolhidoPelaPessoa.current = false; }, []);
  return { repetido, marcarEscolhido, reiniciar };
}

export const MENSAGEM_AVATAR_REPETIDO = 'Outro participante do evento já tem este personagem. Mude alguma peça para o seu ficar único.';
