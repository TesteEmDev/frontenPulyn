import { useEffect, useRef, useState, type CSSProperties } from 'react';
import * as THREE from 'three';
import { MONSTROS, urlDoModelo, type TipoDeMonstro } from './monstros/catalogo';
import { criarMonstro, type MonstroPronto } from './monstros/modelos';
import { tocarSom } from './monstros/som';

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
}

type MonsterEffect = 'hit' | 'death' | null;
type PedidoDeAnimacao = 'hit' | 'crit' | 'death' | null;

const monsterStyles = `
  .monster-3d { position: relative; width: 100%; min-height: 330px; overflow: hidden; border-radius: 1.5rem; background: radial-gradient(circle at 50% 42%, #4c1d95 0%, #1e123c 38%, #090613 78%); }
  .monster-3d__canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  .monster-3d__fallback { position: absolute; inset: 0; display: grid; place-items: center; font-size: 7rem; filter: drop-shadow(0 0 25px #ec4899); animation: monster-fallback-float 2.5s ease-in-out infinite; }
  .monster-3d__status { position: absolute; left: 1rem; right: 1rem; bottom: 1rem; z-index: 4; display: flex; align-items: center; justify-content: space-between; gap: 1rem; color: #e9d5ff; font-size: .8rem; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; }
  .monster-3d__damage { color: #fef08a; text-shadow: 0 0 12px #f43f5e; animation: monster-damage .8s ease-out forwards; }
  .monster-3d__winner { color: var(--winner-color, #86efac); text-shadow: 0 0 12px var(--winner-color, #86efac); }
  @keyframes monster-damage { 0% { opacity: 0; transform: translateY(12px); } 25% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-28px); } }
  @keyframes monster-fallback-float { 0%,100% { transform: translateY(5px) scale(1); } 50% { transform: translateY(-10px) scale(1.06); } }
`;

function createMonster(scene: THREE.Scene) {
  const monster = new THREE.Group();
  monster.position.y = -0.35;
  monster.rotation.y = -0.02;

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x9d1bb8,
    roughness: 0.58,
    metalness: 0.1,
    emissive: 0x27002f,
    emissiveIntensity: 0.32,
  });
  const headMaterial = new THREE.MeshStandardMaterial({
    color: 0xd946ef,
    roughness: 0.48,
    metalness: 0.06,
    emissive: 0x42004b,
    emissiveIntensity: 0.28,
  });
  const bellyMaterial = new THREE.MeshStandardMaterial({ color: 0xfb7185, roughness: 0.68 });
  const hornMaterial = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.3,
    metalness: 0.18,
    emissive: 0x7c3f00,
    emissiveIntensity: 0.3,
  });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x160014, roughness: 0.84 });
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 1.65,
    roughness: 0.22,
  });
  const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x250022, roughness: 0.4 });
  const toothMaterial = new THREE.MeshStandardMaterial({ color: 0xfff7ed, roughness: 0.32 });
  const innerEarMaterial = new THREE.MeshStandardMaterial({ color: 0xfda4af, roughness: 0.55 });
  const crystalMaterial = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    emissive: 0x0891b2,
    emissiveIntensity: 1.8,
    roughness: 0.2,
    metalness: 0.25,
  });

  const body = new THREE.Mesh(new THREE.SphereGeometry(1.36, 32, 24), bodyMaterial);
  body.scale.set(1, 1.18, 0.84);
  body.position.y = -0.22;
  monster.add(body);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.76, 28, 18), bellyMaterial);
  belly.scale.set(1, 1.08, 0.28);
  belly.position.set(0, -0.22, 1.08);
  monster.add(belly);

  const chestRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.43, 0.055, 8, 24),
    crystalMaterial
  );
  chestRing.position.set(0, 0.18, 1.08);
  monster.add(chestRing);

  const chestCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 1), crystalMaterial);
  chestCrystal.position.set(0, 0.18, 1.17);
  chestCrystal.rotation.set(0.25, 0.2, 0.15);
  monster.add(chestCrystal);

  const head = new THREE.Mesh(new THREE.SphereGeometry(1.34, 32, 24), headMaterial);
  head.scale.set(1.14, 0.9, 0.86);
  head.position.set(0, 1.5, 0.12);
  monster.add(head);

  const earGeometry = new THREE.SphereGeometry(0.46, 20, 14);
  const innerEarGeometry = new THREE.SphereGeometry(0.28, 16, 12);
  for (const x of [-1.06, 1.06]) {
    const ear = new THREE.Mesh(earGeometry, headMaterial);
    ear.scale.set(0.78, 1.05, 0.48);
    ear.position.set(x, 1.56, 0.02);
    monster.add(ear);

    const innerEar = new THREE.Mesh(innerEarGeometry, innerEarMaterial);
    innerEar.scale.set(0.8, 1.15, 0.28);
    innerEar.position.set(x, 1.56, 0.38);
    monster.add(innerEar);
  }

  const eyeGeometry = new THREE.SphereGeometry(0.3, 24, 18);
  const pupilGeometry = new THREE.SphereGeometry(0.105, 16, 12);
  const eyes: THREE.Mesh[] = [];
  for (const x of [-0.5, 0.5]) {
    const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eye.scale.set(0.86, 1.32, 0.48);
    eye.position.set(x, 1.61, 1.08);
    monster.add(eye);
    eyes.push(eye);

    const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    pupil.scale.set(0.82, 1.42, 0.45);
    pupil.position.set(x, 1.62, 1.37);
    monster.add(pupil);
  }

  const browGeometry = new THREE.CapsuleGeometry(0.08, 0.34, 5, 10);
  for (const x of [-0.5, 0.5]) {
    const brow = new THREE.Mesh(browGeometry, bodyMaterial);
    brow.position.set(x, 1.98, 1.03);
    brow.rotation.z = x < 0 ? -0.22 : 0.22;
    monster.add(brow);
  }

  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.56, 24, 16), darkMaterial);
  mouth.scale.set(1.18, 0.5, 0.3);
  mouth.position.set(0, 1.02, 1.1);
  monster.add(mouth);

  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.47, 24, 16), headMaterial);
  jaw.scale.set(1.16, 0.3, 0.28);
  jaw.position.set(0, 0.83, 1.12);
  monster.add(jaw);

  const toothGeometry = new THREE.ConeGeometry(0.1, 0.3, 8);
  for (const x of [-0.36, -0.12, 0.12, 0.36]) {
    const tooth = new THREE.Mesh(toothGeometry, toothMaterial);
    tooth.position.set(x, 1.13, 1.38);
    tooth.rotation.x = Math.PI;
    monster.add(tooth);
  }

  const hornGeometry = new THREE.ConeGeometry(0.32, 1.2, 12);
  for (const x of [-0.72, 0.72]) {
    const horn = new THREE.Mesh(hornGeometry, hornMaterial);
    horn.position.set(x, 2.84, 0.08);
    horn.rotation.z = x < 0 ? -0.22 : 0.22;
    monster.add(horn);

    const hornBase = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 12), hornMaterial);
    hornBase.scale.set(1, 0.5, 0.8);
    hornBase.position.set(x, 2.38, 0.08);
    monster.add(hornBase);
  }

  const spikeGeometry = new THREE.ConeGeometry(0.22, 0.62, 8);
  for (const y of [-0.7, -0.05, 0.6, 1.2]) {
    const spike = new THREE.Mesh(spikeGeometry, bodyMaterial);
    spike.position.set(0, y, -0.76);
    spike.rotation.x = -Math.PI / 2;
    monster.add(spike);
  }

  const armGeometry = new THREE.CapsuleGeometry(0.29, 1.02, 8, 16);
  const arms: THREE.Mesh[] = [];
  for (const x of [-1.48, 1.48]) {
    const arm = new THREE.Mesh(armGeometry, bodyMaterial);
    arm.position.set(x, -0.14, 0.02);
    arm.rotation.z = x < 0 ? -0.62 : 0.62;
    monster.add(arm);
    arms.push(arm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.36, 18, 14), hornMaterial);
    hand.scale.set(1.15, 0.72, 0.92);
    hand.position.set(x + (x < 0 ? -0.3 : 0.3), -0.87, 0.18);
    monster.add(hand);

    for (const clawOffset of [-0.14, 0, 0.14]) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.28, 7), toothMaterial);
      claw.position.set(hand.position.x + clawOffset, -1.07, 0.3);
      claw.rotation.x = -0.45;
      monster.add(claw);
    }
  }

  const legGeometry = new THREE.CapsuleGeometry(0.34, 0.55, 8, 14);
  const legs: THREE.Mesh[] = [];
  for (const x of [-0.58, 0.58]) {
    const leg = new THREE.Mesh(legGeometry, bodyMaterial);
    leg.position.set(x, -1.18, 0.08);
    monster.add(leg);
    legs.push(leg);

    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.48, 20, 14), hornMaterial);
    foot.scale.set(1.25, 0.52, 1.15);
    foot.position.set(x, -1.56, 0.36);
    monster.add(foot);
  }

  const tail = new THREE.Mesh(
    new THREE.TorusGeometry(0.58, 0.13, 8, 20, Math.PI * 1.35),
    bodyMaterial
  );
  tail.position.set(-1.05, -0.45, -0.48);
  tail.rotation.set(0.35, -0.5, -0.7);
  monster.add(tail);

  const particleGroup = new THREE.Group();
  const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xf0abfc, transparent: true, opacity: 0.8 });
  for (let index = 0; index < 12; index += 1) {
    const particle = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045 + (index % 3) * 0.018, 0), particleMaterial);
    const angle = (index / 12) * Math.PI * 2;
    particle.position.set(Math.cos(angle) * 2.15, 0.2 + (index % 4) * 0.48, Math.sin(angle) * 0.7 - 0.15);
    particleGroup.add(particle);
  }
  monster.add(particleGroup);

  const aura = new THREE.Mesh(
    new THREE.SphereGeometry(2.9, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0xec4899, transparent: true, opacity: 0.065, depthWrite: false })
  );
  aura.position.y = 0.65;
  monster.add(aura);

  monster.userData.parts = { body, head, belly, chestCrystal, eyes, arms, legs, particleGroup };
  scene.add(monster);
  return monster;
}

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

// Fundo do cartão: degradê vertical da paleta do monstro
function criarFundo(paradas: [number, string][]) {
  const tela = document.createElement('canvas');
  tela.width = 2;
  tela.height = 256;
  const contexto = tela.getContext('2d');
  if (contexto) {
    const degrade = contexto.createLinearGradient(0, 0, 0, 256);
    paradas.forEach(([posicao, cor]) => degrade.addColorStop(posicao, cor));
    contexto.fillStyle = degrade;
    contexto.fillRect(0, 0, 2, 256);
  }
  const textura = new THREE.CanvasTexture(tela);
  textura.colorSpace = THREE.SRGBColorSpace;
  return textura;
}

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
}: Monster3DProps) {
  const dados = MONSTROS[tipo];
  const corDoMonstro = cor && dados.cores.includes(cor) ? cor : dados.cores[0];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const defeatedRef = useRef(defeated);
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
  }, [defeated]);

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

    // Cenário leve: só cores (fundo, névoa, chão e luzes do cenário do monstro). Cada cartão tem o próprio renderizador,
    // então nada de objetos nem de muitas luzes aqui.
    const paleta = dados.paleta;
    const scene = new THREE.Scene();
    const fundo = criarFundo(paleta.fundo);
    scene.background = fundo;
    scene.fog = new THREE.Fog(paleta.nevoa[0], paleta.nevoa[1], paleta.nevoa[2]);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    // Os valores do catálogo enquadram o monstro inteiro com folga; o cartão é largo e baixo, então chega um pouco mais perto
    const { x, y, z, alvoY } = dados.camera;
    camera.position.set(x * ZOOM_DO_CARTAO, alvoY + (y - alvoY) * ZOOM_DO_CARTAO, z * ZOOM_DO_CARTAO);
    camera.lookAt(0, alvoY, 0);

    scene.add(new THREE.HemisphereLight(paleta.hemi[0], paleta.hemi[1], paleta.hemi[2]));
    const keyLight = new THREE.DirectionalLight(paleta.luz[0], paleta.luz[1]);
    keyLight.position.set(-3, 6, 5);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(paleta.rim[0], (8 * paleta.rim[2]) / 2, 10);
    rimLight.position.set(2.8, 1.8, 2.5);
    scene.add(rimLight);

    const chao = new THREE.Mesh(
      new THREE.CircleGeometry(60, 48),
      new THREE.MeshStandardMaterial({ color: paleta.chao, roughness: 0.95 })
    );
    chao.rotation.x = -Math.PI / 2;
    scene.add(chao);

    // Monstro de reserva (desenhado por código): aparece enquanto o arquivo carrega ou se ele não carregar
    const monster = createMonster(scene);
    monster.scale.setScalar(0.5);
    monster.position.y = 1.0;
    const parts = monster.userData.parts as {
      body: THREE.Mesh;
      head: THREE.Mesh;
      belly: THREE.Mesh;
      chestCrystal: THREE.Mesh;
      eyes: THREE.Mesh[];
      arms: THREE.Mesh[];
      legs: THREE.Mesh[];
      particleGroup: THREE.Group;
    };

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
      Object.values(acoes).forEach((outra) => { if (outra && outra !== alvo && outra.isRunning()) outra.fadeOut(fade); });
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

        monster.visible = false;
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
        console.warn('Não foi possível carregar o modelo do monstro. Usando o desenho de reserva.', error);
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
        // Nova partida: o monstro volta ao normal
        if (estadoModelo === 'death' && !defeatedRef.current) voltarAoRepouso(0.4);
        mixer.update(delta);
        aplicarFlash();
      } else {
        // Desenho de reserva, enquanto o modelo não chega
        const breathe = 1 + Math.sin(elapsed * 1.8) * 0.025;
        const blink = Math.sin(elapsed * 0.72) > 0.986 ? 0.12 : 1;
        monster.rotation.y = -0.06 + Math.sin(elapsed * 0.8) * 0.08;
        monster.position.y = 1.0 + Math.sin(elapsed * 1.8) * 0.05;
        parts.body.scale.set(breathe, 1.18 * breathe, 0.84 * breathe);
        parts.head.position.y = 1.5 + Math.sin(elapsed * 1.8) * 0.025;
        parts.belly.position.y = -0.22 + Math.sin(elapsed * 1.8) * 0.035;
        parts.eyes.forEach((eye) => { eye.scale.y = 1.32 * blink; });
        parts.arms.forEach((arm, index) => {
          const direction = index === 0 ? -1 : 1;
          arm.rotation.z = direction * (0.62 + Math.sin(elapsed * 1.6 + index) * 0.035);
        });
        parts.legs.forEach((leg, index) => {
          leg.rotation.z = Math.sin(elapsed * 1.8 + index * Math.PI) * 0.025;
        });
        parts.chestCrystal.rotation.y = elapsed * 1.4;
        parts.particleGroup.rotation.y = elapsed * 0.18;
      }

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
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        if (pronto && pronto.modelo.getObjectById(object.id)) return;
        object.geometry.dispose();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
        else object.material.dispose();
      });
      fundo.dispose();
      renderer.dispose();
    };
    // O monstro é escolhido ao montar o cartão; trocar de tipo ou cor remonta a cena
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, corDoMonstro]);

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
