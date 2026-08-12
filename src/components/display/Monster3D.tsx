import { useEffect, useRef, useState, type CSSProperties } from 'react';
import * as THREE from 'three';

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
  monster.position.y = -0.25;

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xa21caf,
    roughness: 0.62,
    metalness: 0.08,
    emissive: 0x28002f,
    emissiveIntensity: 0.35,
  });
  const headMaterial = new THREE.MeshStandardMaterial({
    color: 0xd946ef,
    roughness: 0.52,
    metalness: 0.05,
    emissive: 0x3b073f,
    emissiveIntensity: 0.3,
  });
  const bellyMaterial = new THREE.MeshStandardMaterial({ color: 0xfb7185, roughness: 0.7 });
  const hornMaterial = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.35,
    metalness: 0.2,
    emissive: 0x7c3f00,
    emissiveIntensity: 0.25,
  });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x190017, roughness: 0.8 });
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 1.5,
    roughness: 0.25,
  });
  const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x31002f, roughness: 0.45 });
  const toothMaterial = new THREE.MeshStandardMaterial({ color: 0xfff7ed, roughness: 0.4 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(1.35, 32, 24), bodyMaterial);
  body.scale.set(1, 1.12, 0.82);
  body.position.y = -0.2;
  monster.add(body);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.72, 24, 16), bellyMaterial);
  belly.scale.set(1, 1.05, 0.25);
  belly.position.set(0, -0.25, 1.02);
  monster.add(belly);

  const head = new THREE.Mesh(new THREE.SphereGeometry(1.35, 32, 24), headMaterial);
  head.scale.set(1.12, 0.88, 0.82);
  head.position.set(0, 1.45, 0.1);
  monster.add(head);

  const eyeGeometry = new THREE.SphereGeometry(0.28, 20, 16);
  const pupilGeometry = new THREE.SphereGeometry(0.1, 16, 12);
  for (const x of [-0.48, 0.48]) {
    const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eye.scale.set(0.85, 1.25, 0.45);
    eye.position.set(x, 1.55, 1.0);
    monster.add(eye);

    const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    pupil.scale.set(0.8, 1.35, 0.45);
    pupil.position.set(x, 1.56, 1.27);
    monster.add(pupil);
  }

  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.52, 24, 16), darkMaterial);
  mouth.scale.set(1.15, 0.48, 0.28);
  mouth.position.set(0, 0.98, 1.03);
  monster.add(mouth);

  const toothGeometry = new THREE.ConeGeometry(0.1, 0.3, 8);
  for (const x of [-0.27, 0, 0.27]) {
    const tooth = new THREE.Mesh(toothGeometry, toothMaterial);
    tooth.position.set(x, 1.1, 1.3);
    tooth.rotation.x = Math.PI;
    monster.add(tooth);
  }

  const hornGeometry = new THREE.ConeGeometry(0.3, 1.15, 10);
  for (const x of [-0.72, 0.72]) {
    const horn = new THREE.Mesh(hornGeometry, hornMaterial);
    horn.position.set(x, 2.75, 0.05);
    horn.rotation.z = x < 0 ? -0.22 : 0.22;
    monster.add(horn);
  }

  const armGeometry = new THREE.CapsuleGeometry(0.28, 0.95, 8, 16);
  for (const x of [-1.45, 1.45]) {
    const arm = new THREE.Mesh(armGeometry, bodyMaterial);
    arm.position.set(x, -0.2, 0);
    arm.rotation.z = x < 0 ? -0.62 : 0.62;
    monster.add(arm);

    const claw = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), hornMaterial);
    claw.scale.set(1.15, 0.7, 0.9);
    claw.position.set(x + (x < 0 ? -0.28 : 0.28), -0.9, 0.02);
    monster.add(claw);
  }

  const aura = new THREE.Mesh(
    new THREE.SphereGeometry(2.8, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0xec4899, transparent: true, opacity: 0.07, depthWrite: false })
  );
  aura.position.y = 0.65;
  monster.add(aura);

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
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 1.2, 8);
    camera.lookAt(0, 0.75, 0);

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
      const elapsed = clock.getElapsedTime();
      const currentEffect = effectRef.current;
      const isDead = defeatedRef.current || currentEffect === 'death';
      const isHit = currentEffect === 'hit';

      if (isDead) {
        monster.rotation.y += 0.012;
        monster.rotation.z = THREE.MathUtils.lerp(monster.rotation.z, -0.38, 0.04);
        monster.scale.lerp(new THREE.Vector3(0.82, 0.82, 0.82), 0.035);
      } else {
        monster.rotation.y = Math.sin(elapsed * 0.8) * 0.16;
        monster.rotation.z = isHit ? Math.sin(elapsed * 42) * 0.09 : 0;
        monster.position.y = -0.25 + Math.sin(elapsed * 1.8) * 0.1;
        monster.scale.lerp(new THREE.Vector3(1, 1, 1), 0.08);
      }

      floor.scale.setScalar(1 + Math.sin(elapsed * 2) * 0.06);
      pinkLight.intensity = 6.5 + Math.sin(elapsed * 2.2) * 1.2;
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
        else object.material.dispose();
      });
      renderer.dispose();
    };
  }, []);

  const safeMaxHp = Math.max(1, maxHp || 100);
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
