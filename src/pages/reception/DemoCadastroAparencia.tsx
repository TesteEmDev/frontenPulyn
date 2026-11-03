import { useState } from 'react';
import AvatarSelector from '../../components/ui/AvatarSelector';
import CorSelector from '../../components/ui/CorSelector';
import { ADVENTURER_AVATARS } from '../../avatar/adventurerAvatars';
import { CORES_PARTICIPANTE } from '../../utils/coresParticipante';

// Página de demonstração: a escolha de avatar e de cor com alguns já "escolhidos por outros participantes" (dados de exemplo).
const AVATARES_EM_USO = [1, 4, 5, 9, 12, 15].map((i) => ADVENTURER_AVATARS[i].id);
const CORES_EM_USO = [0, 3, 8].map((i) => CORES_PARTICIPANTE[i].hex);

export default function DemoCadastroAparencia() {
  const [avatar, setAvatar] = useState(ADVENTURER_AVATARS[0].id);
  const [cor, setCor] = useState(CORES_PARTICIPANTE[5].hex);
  return (
    <div className="min-h-screen bg-[#081327] p-4 text-white">
      <span className="rounded-full bg-warning/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-warning">Prévia · dados de exemplo</span>
      <h1 className="mt-3 font-display text-2xl font-bold">Escolha seu personagem</h1>
      <p className="mb-3 text-sm text-gray-400">Os avatares e as cores que outros participantes já escolheram ficam cinza e não podem ser escolhidos.</p>
      <AvatarSelector value={avatar} onChange={setAvatar} wide indisponiveis={AVATARES_EM_USO} />
      <div className="mt-4 border-t border-cyan-300/10 pt-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-300">Escolha a sua cor</p>
        <CorSelector value={cor} onChange={setCor} indisponiveis={CORES_EM_USO} />
      </div>
    </div>
  );
}
