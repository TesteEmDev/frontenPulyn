import { useEffect, useRef, useState, type CSSProperties } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface Monster3DProps {
  hp: number;
  maxHp: number;
  defeated?: boolean;
  winnerTeamName?: string | null;
  winnerTeamColor?: string | null;
}

type MonsterEffect = 'hit' | 'death' | null;

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

export default function Monster3D({
  hp,
  maxHp,
  defeated = false,
  winnerTeamName,
  winnerTeamColor,
}: Monster3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const effectRef = useRef<MonsterEffect>(null);
  const defeatedRef = useRef(defeated);
  const [effect, setEffect] = useState<MonsterEffect>(null);
  const [damage, setDamage] = useState(0);
  const [effectKey, setEffectKey] = useState(0);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const previousHpRef = useRef(hp);

  useEffect(() => {
    defeatedRef.current = defeated;
    effectRef.current = effect;
  }, [defeated, effect]);

  useEffect(() => {
    const previousHp = previousHpRef.current;
    previousHpRef.current = hp;
    if (hp >= previousHp && !defeated) return;

    setDamage(Math.max(0, previousHp - hp));
    setEffect(defeated || hp <= 0 ? 'death' : 'hit');
    setEffectKey((current) => current + 1);
    const timeout = window.setTimeout(() => setEffect(null), defeated || hp <= 0 ? 1200 : 700);
    return () => window.clearTimeout(timeout);
  }, [hp, defeated]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (error) {
      console.warn('WebGL indisponível para o monstro 3D:', error);
      setWebglUnavailable(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x090613, 6, 14);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0.28, 1.25, 8.5);
    camera.lookAt(0, 0.72, 0);

    scene.add(new THREE.HemisphereLight(0xffb7f6, 0x130b2b, 2.1));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(-3, 5, 5);
    scene.add(keyLight);
    const pinkLight = new THREE.PointLight(0xec4899, 7, 8);
    pinkLight.position.set(2.8, 1.5, 2.5);
    scene.add(pinkLight);
    const purpleLight = new THREE.PointLight(0x7c3aed, 5, 7);
    purpleLight.position.set(-3, 0.2, 1);
    scene.add(purpleLight);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(3.2, 64),
      new THREE.MeshBasicMaterial({ color: 0xa21caf, transparent: true, opacity: 0.22, depthWrite: false })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.72;
    scene.add(floor);

    const monster = createMonster(scene);
    let importedModel: THREE.Object3D | null = null;
    let modelMixer: THREE.AnimationMixer | null = null;
    let modelActions: Record<string, THREE.AnimationAction> = {};
    let lastModelState = '';
    let disposed = false;

    const playModelAction = (state: string) => {
      const action = modelActions[state] || modelActions.idle;
      if (!action || lastModelState === state) return;

      Object.values(modelActions).forEach((otherAction) => {
        if (otherAction !== action) otherAction.fadeOut(0.12);
      });
      action.reset().fadeIn(0.12);
      if (state === 'death' || state === 'hit' || state === 'attack') {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      } else {
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.clampWhenFinished = false;
      }
      action.play();
      lastModelState = state;
    };

    const modelLoader = new GLTFLoader();
    modelLoader.load(
      '/models/morrendo.glb',
      (gltf) => {
        if (disposed) return;

        const model = gltf.scene;
        model.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.castShadow = true;
          object.receiveShadow = true;
        });

        const initialBounds = new THREE.Box3().setFromObject(model);
        const initialSize = initialBounds.getSize(new THREE.Vector3());
        const targetHeight = 4.45;
        const modelScale = initialSize.y > 0 ? targetHeight / initialSize.y : 1;
        model.scale.setScalar(modelScale);

        const scaledBounds = new THREE.Box3().setFromObject(model);
        const scaledCenter = scaledBounds.getCenter(new THREE.Vector3());
        model.position.x -= scaledCenter.x;
        model.position.z -= scaledCenter.z;
        model.position.y += -1.62 - scaledBounds.min.y;
        scene.add(model);

        modelMixer = new THREE.AnimationMixer(model);
        const findClip = (terms: string[]) => gltf.animations.find((clip) => {
          const clipName = clip.name.toLowerCase();
          return terms.some((term) => clipName.includes(term));
        });
        const createAction = (terms: string[]) => {
          const clip = findClip(terms);
          return clip && modelMixer ? modelMixer.clipAction(clip) : undefined;
        };

        modelActions = {
          idle: createAction(['flying_idle', 'idle']) || createAction(['flying']),
          attack: createAction(['punch']) || createAction(['headbutt']),
          hit: createAction(['hitreact', 'hit']),
          death: createAction(['death', 'die']),
          special: createAction(['headbutt']),
          victory: createAction(['yes']),
        } as Record<string, THREE.AnimationAction>;
        modelActions = Object.fromEntries(
          Object.entries(modelActions).filter(([, action]) => Boolean(action))
        ) as Record<string, THREE.AnimationAction>;

        monster.visible = false;
        importedModel = model;
        playModelAction('idle');
      },
      undefined,
      (error) => {
        console.warn('Não foi possível carregar o modelo GLB do monstro. Usando fallback procedural.', error);
      }
    );

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
    const clock = new THREE.Clock();
    let frameId = 0;

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

    const animate = () => {
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();
      const currentEffect = effectRef.current;
      const isDead = defeatedRef.current || currentEffect === 'death';
      const isHit = currentEffect === 'hit';
      const breathe = 1 + Math.sin(elapsed * 1.8) * 0.025;
      const blink = Math.sin(elapsed * 0.72) > 0.986 ? 0.12 : 1;

      if (importedModel && modelMixer) {
        playModelAction(isDead ? 'death' : isHit ? 'hit' : 'idle');
        modelMixer.update(delta);
        importedModel.rotation.y = isDead
          ? THREE.MathUtils.lerp(importedModel.rotation.y, -0.22, 0.04)
          : Math.sin(elapsed * 0.7) * 0.045;
        importedModel.rotation.z = isDead
          ? THREE.MathUtils.lerp(importedModel.rotation.z, -0.12, 0.04)
          : isHit ? Math.sin(elapsed * 36) * 0.025 : 0;
      }

      if (isDead) {
        monster.rotation.y = THREE.MathUtils.lerp(monster.rotation.y, -0.22, 0.04);
        monster.rotation.z = THREE.MathUtils.lerp(monster.rotation.z, -0.38, 0.04);
        monster.scale.lerp(new THREE.Vector3(0.82, 0.82, 0.82), 0.035);
      } else {
        monster.rotation.y = -0.06 + Math.sin(elapsed * 0.8) * 0.08;
        monster.rotation.z = isHit ? Math.sin(elapsed * 42) * 0.09 : 0;
        monster.position.y = -0.35 + Math.sin(elapsed * 1.8) * 0.1;
        monster.scale.lerp(new THREE.Vector3(1, 1, 1), 0.08);

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
        parts.chestCrystal.rotation.x = 0.25 + Math.sin(elapsed * 2) * 0.08;
      }

      parts.particleGroup.rotation.y = elapsed * 0.18;
      parts.particleGroup.position.y = Math.sin(elapsed * 1.4) * 0.08;
      floor.scale.setScalar(1 + Math.sin(elapsed * 2) * 0.06);
      pinkLight.intensity = 6.5 + Math.sin(elapsed * 2.2) * 1.2;
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      modelMixer?.stopAllAction();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
        else object.material.dispose();
      });
      renderer.dispose();
    };
  }, []);

  const safeMaxHp = Math.max(1, maxHp || 500);
  const safeHp = Math.max(0, Math.min(safeMaxHp, hp || 0));
  const hpPercent = Math.round((safeHp / safeMaxHp) * 100);
  const winnerStyle = { '--winner-color': winnerTeamColor || '#86efac' } as CSSProperties;

  return (
    <div className="monster-3d" aria-label={`Monstro 3D com ${safeHp} de ${safeMaxHp} HP`}>
      <style>{monsterStyles}</style>
      <canvas ref={canvasRef} className="monster-3d__canvas" aria-hidden="true" />
      {webglUnavailable && <div className="monster-3d__fallback" aria-hidden="true">👹</div>}
      <div className="monster-3d__status" style={winnerStyle}>
        {defeated ? (
          <span className="monster-3d__winner">🏆 {winnerTeamName || 'Monstro derrotado'}</span>
        ) : (
          <span>Monstro em batalha</span>
        )}
        <span className={effect ? 'monster-3d__damage' : ''} key={effectKey}>
          {effect === 'death' ? 'DERROTADO!' : effect === 'hit' ? `-${damage} HP` : `${hpPercent}% de energia`}
        </span>
      </div>
    </div>
  );
}
