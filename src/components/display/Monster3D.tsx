import { useEffect, useRef, useState, type CSSProperties } from 'react';
import * as THREE from 'three';
import { MONSTROS, urlDoModelo, type TipoDeMonstro } from './monstros/catalogo';
import { criarMonstro, type MonstroPronto } from './monstros/modelos';
import { tocarSom } from './monstros/som';
import { criarCenario, descartarCenario } from './monstros/cenarios';

interface Monster3DProps {
  hp: number;
  maxHp: number;
  defeated?: boolean;
  teamName?: string | null;
  teamColor?: string | null;
  winnerTeamName?: string | null;
  winnerTeamColor?: string | null;
  // Monstro sorteado para a equipe (tipo e cor); sem eles, aparece o slime verde
  tipo?: TipoDeMonstro;
  cor?: string;
  // Cenário mais leve (sem luzes pontuais e com metade dos objetos): para quando há muitas equipes na tela
  leve?: boolean;
}

type MonsterEffect = 'hit' | 'death' | null;
type PedidoDeAnimacao = 'hit' | 'crit' | 'death' | null;

const monsterStyles = `
  .monster-3d { position: relative; width: 100%; min-height: 330px; overflow: hidden; border-radius: 1.5rem; background: radial-gradient(circle at 50% 42%, #4c1d95 0%, #1e123c 38%, #090613 78%); }
  .monster-3d__canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  .monster-3d__fallback { position: absolute; inset: 0; display: grid; place-items: center; font-size: 7rem; animation: monster-fallback-float 2.5s ease-in-out infinite; }
  .monster-3d__status { position: absolute; left: 0; right: 0; bottom: 0; z-index: 4; display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.6rem 1rem .8rem; background: linear-gradient(to top, rgba(8, 4, 20, .82), rgba(8, 4, 20, 0)); color: #f5ecff; font-size: .8rem; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; text-shadow: 0 1px 6px rgba(0, 0, 0, .9); }
  .monster-3d__damage { color: #fef08a; text-shadow: 0 0 12px #f43f5e; animation: monster-damage .8s ease-out forwards; }
  .monster-3d__winner { color: var(--winner-color, #86efac); text-shadow: 0 0 12px var(--winner-color, #86efac); }
  @keyframes monster-damage { 0% { opacity: 0; transform: translateY(12px); } 25% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-28px); } }
  @keyframes monster-fallback-float { 0%,100% { transform: translateY(5px) scale(1); } 50% { transform: translateY(-10px) scale(1.06); } }
`;

// Intensidade do flash vermelho pelo tempo (s) desde o início do clipe. Não vai no arquivo do modelo (é do Blender): é feito aqui.
const flashHit = (t: number) => (t < 0.1 ? t / 0.1 : t < 0.27 ? 1 : Math.max(0, 1 - (t - 0.27) / 0.13));
const flashCrit = (t: number) => (
  t < 0.13 ? t / 0.13 : t < 0.5 ? 1 : t < 0.8 ? 1 - (0.85 * (t - 0.5)) / 0.3
    : t < 0.9 ? 0.15 + 5.5 * (t - 0.8) : t < 1.2 ? 0.7 * (1 - (t - 0.9) / 0.3) : 0
);
const flashFaint = (t: number) => (t < 0.07 ? t / 0.07 : t < 0.2 ? 1 - (0.5 * (t - 0.07)) / 0.13 : Math.max(0, 0.5 - (0.5 * (t - 0.2)) / 0.17));

// Fração da distância da câmera do catálogo (menor = o monstro maior no cartão)
const ZOOM_DO_CARTAO = 0.74;

// Dano a partir do qual o golpe é um ataque especial (30 do checkpoint especial e 50 do ataque especial): usa o Crit
const DANO_CRITICO = 30;

export default function Monster3D({
  hp,
  maxHp,
  defeated = false,
  teamName,
  teamColor,
  winnerTeamName,
  winnerTeamColor,
  tipo = 'slime',
  cor,
  leve = false,
}: Monster3DProps) {
  const dados = MONSTROS[tipo];
  const corDoMonstro = cor && dados.cores.includes(cor) ? cor : dados.cores[0];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const defeatedRef = useRef(defeated);
  const hpRef = useRef(hp);
  // Pedido de animação: cada golpe novo muda a chave, e o laço de desenho reinicia o clipe (mesmo repetindo o mesmo golpe)
  const pedidoRef = useRef<{ tipo: PedidoDeAnimacao; chave: number }>({ tipo: null, chave: 0 });
  const [effect, setEffect] = useState<MonsterEffect>(null);
  const [damage, setDamage] = useState(0);
  const [effectKey, setEffectKey] = useState(0);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const previousHpRef = useRef(hp);
  const montadoRef = useRef(false);

  useEffect(() => {
    defeatedRef.current = defeated;
    hpRef.current = hp;
  }, [defeated, hp]);

  useEffect(() => {
    // Na primeira vez só guarda o estado: um monstro que já chega derrotado aparece caído, sem repetir a queda
    if (!montadoRef.current) {
      montadoRef.current = true;
      previousHpRef.current = hp;
      return undefined;
    }
    const previousHp = previousHpRef.current;
    previousHpRef.current = hp;
    if (hp >= previousHp && !defeated) return undefined;

    const dano = Math.max(0, previousHp - hp);
    const morreu = defeated || hp <= 0;
    const pedido: PedidoDeAnimacao = morreu ? 'death' : dano >= DANO_CRITICO ? 'crit' : 'hit';
    pedidoRef.current = { tipo: pedido, chave: pedidoRef.current.chave + 1 };
    setDamage(dano);
    setEffect(morreu ? 'death' : 'hit');
    setEffectKey((current) => current + 1);
    const timeout = window.setTimeout(() => setEffect(null), morreu ? 1200 : 900);
    return () => window.clearTimeout(timeout);
  }, [hp, defeated]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return undefined;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (error) {
      console.warn('WebGL indisponível para o monstro 3D:', error);
      setWebglUnavailable(true);
      return undefined;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // Cenário do monstro (o mesmo do visualizador): fundo, névoa, chão, luzes e os objetos de cada lugar
    const scene = new THREE.Scene();
    const cenario = criarCenario(tipo, leve);
    scene.add(cenario.group);
    scene.background = cenario.bgTexture ?? null;
    scene.fog = new THREE.Fog(cenario.fog[0], cenario.fog[1], cenario.fog[2]);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    // Os valores do catálogo enquadram o monstro inteiro com folga; o cartão é largo e baixo, então chega um pouco mais perto
    const { x, y, z, alvoY } = dados.camera;
    camera.position.set(x * ZOOM_DO_CARTAO, alvoY + (y - alvoY) * ZOOM_DO_CARTAO, z * ZOOM_DO_CARTAO);
    camera.lookAt(0, alvoY, 0);

    scene.add(new THREE.HemisphereLight(cenario.hemi[0], cenario.hemi[1], cenario.hemi[2]));
    const keyLight = new THREE.DirectionalLight(cenario.key[0], cenario.key[1]);
    keyLight.position.set(-3, 6, 5);
    scene.add(keyLight);
    // Luzes de contorno nas cores do cenário (no modo leve só uma, mais fraca)
    const rimLight = new THREE.PointLight(cenario.rim[0], ((leve ? 6 : 8) * cenario.rim[2]) / 2, 10);
    rimLight.position.set(2.8, 1.8, 2.5);
    scene.add(rimLight);
    if (!leve) {
      const rimLight2 = new THREE.PointLight(cenario.rim[1], (6 * cenario.rim[2]) / 2, 9);
      rimLight2.position.set(-3, 0.5, 1);
      scene.add(rimLight2);
    }

    const chao = new THREE.Mesh(
      new THREE.CircleGeometry(60, leve ? 32 : 64),
      new THREE.MeshStandardMaterial({ color: cenario.ground, roughness: 0.95 })
    );
    chao.rotation.x = -Math.PI / 2;
    scene.add(chao);

    let disposed = false;
    let pronto: MonstroPronto | null = null;
    let mixer: THREE.AnimationMixer | null = null;
    const acoes: Partial<Record<'idle' | 'hit' | 'crit' | 'faint', THREE.AnimationAction>> = {};
    let estadoModelo: 'idle' | 'hit' | 'crit' | 'death' = 'idle';
    let ultimaChave = pedidoRef.current.chave;
    const coresOriginais = new Map<THREE.MeshStandardMaterial, { cor: THREE.Color; intensidade: number }>();

    const passarPara = (nome: 'idle' | 'hit' | 'crit' | 'faint', fade: number) => {
      const alvo = acoes[nome];
      if (!alvo) return;
      // Todas as outras saem, inclusive as que já terminaram: um clipe que acabou fica parado (pausado) no último quadro com
      // peso total, e isRunning() é falso para ele. Sem tirá-lo, o monstro caído se misturava com o Idle e voltava torto.
      Object.values(acoes).forEach((outra) => {
        if (outra && outra !== alvo && (outra.isRunning() || outra.paused || outra.getEffectiveWeight() > 0)) outra.fadeOut(fade);
      });
      alvo.reset().fadeIn(fade).play();
    };
    const voltarAoRepouso = (fade = 0.25) => {
      estadoModelo = 'idle';
      passarPara('idle', fade);
    };
    const comecar = (pedido: 'hit' | 'crit' | 'death', comSom = true) => {
      if (!pronto) return;
      if (pedido === 'death') {
        estadoModelo = 'death';
        passarPara('faint', 0.04);
        if (comSom) tocarSom(tipo, 'faint');
        return;
      }
      if (estadoModelo === 'death') return; // monstro caído não reage a golpes
      estadoModelo = pedido;
      passarPara(pedido, 0.04);
      if (comSom) tocarSom(tipo, pedido);
    };

    criarMonstro(urlDoModelo(tipo, corDoMonstro))
      .then((monstro) => {
        if (disposed) { monstro.descartar(); return; }
        pronto = monstro;
        monstro.modelo.position.set(0, 0, 0); // a origem dos modelos é o chão, entre os pés
        scene.add(monstro.modelo);

        mixer = new THREE.AnimationMixer(monstro.modelo);
        const clipe = (nome: string) => monstro.animacoes.find((c) => c.name === nome);
        const criar = (nome: string, repete: boolean) => {
          const c = clipe(nome);
          if (!c || !mixer) return undefined;
          const acao = mixer.clipAction(c);
          if (!repete) { acao.setLoop(THREE.LoopOnce, 1); acao.clampWhenFinished = true; }
          return acao;
        };
        acoes.idle = criar('Idle', true);
        acoes.hit = criar('Hit', false);
        acoes.crit = criar('Crit', false) ?? acoes.hit;
        acoes.faint = criar('Faint', false);
        mixer.addEventListener('finished', (evento) => {
          const acao = (evento as unknown as { action: THREE.AnimationAction }).action;
          if ((acao === acoes.hit && estadoModelo === 'hit') || (acao === acoes.crit && estadoModelo === 'crit')) voltarAoRepouso(0.15);
        });
        monstro.materiaisDoCorpo.forEach((m) => coresOriginais.set(m, { cor: m.emissive.clone(), intensidade: m.emissiveIntensity }));

        if (defeatedRef.current && acoes.faint) {
          // Já chegou derrotado (página recarregada no meio do jogo): fica caído, sem repetir a queda nem o som
          estadoModelo = 'death';
          acoes.faint.reset().play();
          acoes.faint.time = acoes.faint.getClip().duration;
          mixer.update(0);
        } else {
          acoes.idle?.play();
        }
      })
      .catch((error) => {
        console.warn('Não foi possível carregar o modelo do monstro: o cartão fica só com o cenário.', error);
      });

    const clock = new THREE.Clock();
    let frameId = 0;
    let visivel = true;

    const resize = () => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();
    // Cartão fora da tela não precisa ser desenhado
    const observadorDeVisibilidade = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([entrada]) => { visivel = entrada.isIntersecting; })
      : null;
    observadorDeVisibilidade?.observe(container);

    const aplicarFlash = () => {
      if (!pronto) return;
      let intensidade = 0;
      const acao = estadoModelo === 'death' ? acoes.faint : acoes[estadoModelo];
      if (acao) {
        if (estadoModelo === 'hit') intensidade = flashHit(acao.time);
        else if (estadoModelo === 'crit') intensidade = flashCrit(acao.time);
        else if (estadoModelo === 'death') intensidade = flashFaint(acao.time);
      }
      pronto.materiaisDoCorpo.forEach((material) => {
        if (intensidade > 0.001) {
          material.emissive.setRGB(1, 0.04, 0.04);
          material.emissiveIntensity = intensidade;
        } else {
          const original = coresOriginais.get(material);
          if (original) {
            material.emissive.copy(original.cor);
            material.emissiveIntensity = original.intensidade;
          }
        }
      });
    };

    const animate = () => {
      frameId = window.requestAnimationFrame(animate);
      const delta = clock.getDelta();
      if (!visivel) return;
      const elapsed = clock.getElapsedTime();

      if (pronto && mixer) {
        const pedido = pedidoRef.current;
        if (pedido.chave !== ultimaChave) {
          ultimaChave = pedido.chave;
          if (pedido.tipo) comecar(pedido.tipo);
        }
        // Nova partida (ele voltou a ter energia): o monstro volta ao normal. Só a energia decide: um aviso de "derrotado"
        // que chega atrasado em relação ao HP não pode levantá-lo no meio da queda.
        if (estadoModelo === 'death' && !defeatedRef.current && hpRef.current > 0) voltarAoRepouso(0.4);
        mixer.update(delta);
        aplicarFlash();
      }

      cenario.update?.(elapsed);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      observadorDeVisibilidade?.disconnect();
      mixer?.stopAllAction();
      // O monstro do arquivo compartilha geometria e texturas com as outras cópias: só os materiais clonados vão embora
      pronto?.descartar();
      scene.remove(cenario.group);
      descartarCenario(cenario);
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        if (pronto && pronto.modelo.getObjectById(object.id)) return;
        object.geometry.dispose();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
        else object.material.dispose();
      });
      renderer.dispose();
    };
    // O monstro é escolhido ao montar o cartão; trocar de tipo ou cor remonta a cena
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, corDoMonstro, leve]);

  const safeMaxHp = Math.max(1, maxHp || 500);
  const safeHp = Math.max(0, Math.min(safeMaxHp, hp || 0));
  const hpPercent = Math.round((safeHp / safeMaxHp) * 100);
  const winnerStyle = { '--winner-color': winnerTeamColor || teamColor || '#86efac' } as CSSProperties;

  return (
    <div className="monster-3d" aria-label={`${teamName ? `Monstro da equipe ${teamName}` : 'Monstro 3D'} (${dados.nome}) com ${safeHp} de ${safeMaxHp} HP`}>
      <style>{monsterStyles}</style>
      <canvas ref={canvasRef} className="monster-3d__canvas" aria-hidden="true" />
      {webglUnavailable && <div className="monster-3d__fallback" aria-hidden="true">👹</div>}
      <div className="monster-3d__status" style={winnerStyle}>
        {defeated ? (
          <span className="monster-3d__winner">🏆 {winnerTeamName || 'Monstro derrotado'}</span>
        ) : (
          <span>{teamName ? `${dados.nome} de ${teamName}` : `${dados.nome} em batalha`}</span>
        )}
        <span className={effect ? 'monster-3d__damage' : ''} key={effectKey}>
          {effect === 'death' ? 'DERROTADO!' : effect === 'hit' ? `-${damage} HP` : `${hpPercent}% de energia`}
        </span>
      </div>
    </div>
  );
}
