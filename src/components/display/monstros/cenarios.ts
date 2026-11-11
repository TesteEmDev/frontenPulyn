// Cenários dos monstros (low-poly, só formas do Three.js, sem arquivos externos): um para cada tipo de monstro.
// O monstro fica na origem olhando para +Z; tudo que é cenário fica atrás (z negativo) e nas laterais.
// Portado do visualizador da pasta Monstrinhos. `leve` (usado quando há muitas equipes na tela, cada cartão tem o próprio
// renderizador) tira as luzes pontuais do cenário e deixa a metade dos objetos.
import * as THREE from 'three';
import type { TipoDeMonstro } from './catalogo';

export interface Cenario {
  nome: string;
  group: THREE.Group;
  ground: string;
  bg: [number, string][];
  fog: [string, number, number];
  hemi: [string, string, number];
  key: [string, number];
  rim: [string, string, number];
  update: ((t: number) => void) | null;
  bgTexture?: THREE.CanvasTexture;
}

type Rng = () => number;
type Ponto = [number, number, number];

const rngSeed = (seed: number): Rng => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const mat = (color: string, o: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, flatShading: true, ...o });
const glow = (color: string, o: THREE.MeshBasicMaterialParameters = {}) => new THREE.MeshBasicMaterial({ color, ...o });
const add = <T extends THREE.Object3D>(g: THREE.Object3D, mesh: T, x = 0, y = 0, z = 0): T => { mesh.position.set(x, y, z); g.add(mesh); return mesh; };

function gradiente(stops: [number, string][]) {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    stops.forEach(([p, col]) => g.addColorStop(p, col));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 256);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// posição aleatória num arco atrás/ao lado do monstro, longe da área dele
function arco(rng: Rng, rmin: number, rmax: number, deg: number): [number, number] {
  for (let i = 0; i < 40; i += 1) {
    const r = rmin + rng() * (rmax - rmin);
    const a = ((rng() * 2 - 1) * deg * Math.PI) / 180;
    const x = r * Math.sin(a);
    const z = -r * Math.cos(a);
    if (!(Math.abs(x) < 2.4 && z > -4.5)) return [x, z];
  }
  return [6, -8];
}

const pinheiro = (h: number, folha: THREE.Material, tronco: THREE.Material) => {
  const g = new THREE.Group();
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(h * 0.04, h * 0.06, h * 0.25, 6), tronco), 0, h * 0.125, 0);
  add(g, new THREE.Mesh(new THREE.ConeGeometry(h * 0.30, h * 0.5, 7), folha), 0, h * 0.45, 0);
  add(g, new THREE.Mesh(new THREE.ConeGeometry(h * 0.24, h * 0.42, 7), folha), 0, h * 0.68, 0);
  add(g, new THREE.Mesh(new THREE.ConeGeometry(h * 0.16, h * 0.34, 7), folha), 0, h * 0.88, 0);
  return g;
};
const arvoreRedonda = (h: number, folha: THREE.Material, tronco: THREE.Material) => {
  const g = new THREE.Group();
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(h * 0.06, h * 0.09, h * 0.5, 6), tronco), 0, h * 0.25, 0);
  add(g, new THREE.Mesh(new THREE.IcosahedronGeometry(h * 0.38, 1), folha), 0, h * 0.68, 0);
  return g;
};
const cogumelo = (h: number, capR: number, color: string, haste: THREE.Material, emissive = 0) => {
  const g = new THREE.Group();
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(capR * 0.22, capR * 0.3, h, 8), haste), 0, h / 2, 0);
  const chapeu = add(g, new THREE.Mesh(new THREE.SphereGeometry(capR, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    mat(color, { emissive: color, emissiveIntensity: emissive, side: THREE.DoubleSide })), 0, h, 0);
  chapeu.scale.y = 0.7;
  const pintas = mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: emissive * 0.6 });
  for (let i = 0; i < 6; i += 1) {
    const a = i * 1.05;
    const rr = capR * (0.35 + (0.35 * ((i * 37) % 10)) / 10);
    const y = Math.sqrt(Math.max(0, capR * capR - rr * rr)) * 0.7;
    add(g, new THREE.Mesh(new THREE.SphereGeometry(capR * 0.1, 6, 5), pintas), Math.cos(a) * rr, h + y - 0.02, Math.sin(a) * rr);
  }
  return g;
};
const grupoDeCristais = (rng: Rng, color: string, escala = 1) => {
  const g = new THREE.Group();
  const m = mat(color, { emissive: color, emissiveIntensity: 0.7, roughness: 0.3 });
  for (let i = 0; i < 5; i += 1) {
    const h = (1 + rng() * 1.6) * escala;
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.2 * escala, h, 6), m);
    c.position.set((rng() - 0.5) * 0.8 * escala, h / 2 - 0.05, (rng() - 0.5) * 0.6 * escala);
    c.rotation.set((rng() - 0.5) * 0.5, 0, (rng() - 0.5) * 0.6);
    g.add(c);
  }
  return g;
};
const pontos = (n: number, color: string, size: number, fn: (i: number) => Ponto, o: THREE.PointsMaterialParameters = {}) => {
  const geo = new THREE.BufferGeometry();
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 1) {
    const p = fn(i);
    arr[i * 3] = p[0];
    arr[i * 3 + 1] = p[1];
    arr[i * 3 + 2] = p[2];
  }
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, fog: false, transparent: true, opacity: 0.95, depthWrite: false, ...o }));
  pts.frustumCulled = false;
  return pts;
};
const pedras = (g: THREE.Object3D, rng: Rng, n: number, color: string, rx: number, rz0: number, rz1: number, size = 0.4) => {
  const m = mat(color);
  for (let i = 0; i < n; i += 1) {
    const [x, z] = arco(rng, rz0, rz1, rx);
    const s = size * (0.5 + rng());
    const r = add(g, new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), m), x, s * 0.5, z);
    r.rotation.set(rng() * 3, rng() * 3, 0);
    r.scale.y = 0.7;
  }
};

// Atualiza as posições de uma nuvem de pontos animada
const mover = (nuvem: THREE.Points, base: number[][], fn: (b: number[], i: number) => Ponto) => {
  const a = nuvem.geometry.attributes.position as THREE.BufferAttribute;
  base.forEach((b, i) => { const p = fn(b, i); a.setXYZ(i, p[0], p[1], p[2]); });
  a.needsUpdate = true;
};

// =============================================================== cenários
// `q(n)`: quantidade de objetos (metade no modo leve). `luz(...)`: luz pontual, que só existe fora do modo leve.
function fabrica(leve: boolean) {
  const q = (n: number) => (leve ? Math.max(1, Math.ceil(n / 2)) : n);
  const luz = (g: THREE.Object3D, cor: string, intensidade: number, distancia: number, x: number, y: number, z: number) => {
    if (leve) return null;
    const l = new THREE.PointLight(cor, intensidade, distancia);
    l.position.set(x, y, z);
    g.add(l);
    return l;
  };

  const planicie = (): Cenario => {
    const rng = rngSeed(11);
    const g = new THREE.Group();
    const verdes = ['#6dbb4c', '#58a63f', '#7acb55', '#4d9638'];
    for (let i = 0; i < 9; i += 1) {
      const r = 6 + rng() * 5;
      const x = -22 + i * 5.5 + rng() * 2;
      const z = -14 - rng() * 10;
      const colina = add(g, new THREE.Mesh(new THREE.SphereGeometry(r, 16, 10), mat(verdes[i % 4])), x, -r * 0.62, z);
      colina.scale.y = 0.75;
    }
    const sol = add(g, new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 12), glow('#fff1a8', { fog: false })), -9, 10, -32);
    add(g, new THREE.Mesh(new THREE.SphereGeometry(2.8, 16, 12), glow('#fff6c8', { fog: false, transparent: true, opacity: 0.25 })), sol.position.x, sol.position.y, sol.position.z);
    const nuvens: THREE.Group[] = [];
    for (let i = 0; i < q(6); i += 1) {
      const c = new THREE.Group();
      const m = mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.35, flatShading: false });
      for (let k = 0; k < 5; k += 1) add(c, new THREE.Mesh(new THREE.SphereGeometry(0.9 + rng() * 0.8, 10, 8), m), k * 1.1 - 2, rng() * 0.5, rng() * 0.8);
      c.position.set(-20 + i * (leve ? 16 : 8), 7 + rng() * 4, -20 - rng() * 10);
      c.userData.x0 = c.position.x;
      c.userData.v = 0.25 + rng() * 0.25;
      g.add(c);
      nuvens.push(c);
    }
    const capim = mat('#4f9a3a');
    const haste = mat('#5b8f3d');
    for (let i = 0; i < q(160); i += 1) {
      const x = (rng() * 2 - 1) * 14;
      const z = 3 - rng() * 18;
      if (Math.hypot(x, z) < 2.6) continue;
      const c = add(g, new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.35, 4), capim), x, 0.17, z);
      c.rotation.z = (rng() - 0.5) * 0.4;
    }
    const flores = ['#ffffff', '#ffe066', '#ff8fb8', '#b69cff'];
    for (let i = 0; i < q(55); i += 1) {
      const x = (rng() * 2 - 1) * 11;
      const z = 2 - rng() * 12;
      if (Math.hypot(x, z) < 2.8) continue;
      add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 4), haste), x, 0.15, z);
      add(g, new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), mat(flores[i % 4], { emissive: flores[i % 4], emissiveIntensity: 0.15 })), x, 0.34, z);
    }
    const folha = mat('#3f8f36');
    const tronco = mat('#7a5232');
    [[-7, -8, 4.2], [8, -10, 5], [-12, -14, 5.5]].forEach(([x, z, h]) => add(g, arvoreRedonda(h, folha, tronco), x, 0, z));
    return {
      nome: 'Planície', group: g, ground: '#5fae4a',
      bg: [[0, '#5aa9f0'], [0.55, '#a8d8ff'], [1, '#eaf7ff']], fog: ['#cfe9ff', 16, 48],
      hemi: ['#ffffff', '#8fcf6a', 2.0], key: ['#fff3d6', 3.6], rim: ['#ffd9a8', '#a8d4ff', 2.5],
      update: (t) => nuvens.forEach((c) => { c.position.x = ((c.userData.x0 + t * c.userData.v + 30) % 60) - 30; }),
    };
  };

  const floresta = (): Cenario => {
    const rng = rngSeed(23);
    const g = new THREE.Group();
    const folhas = [mat('#1f4a2c'), mat('#275a35'), mat('#1a3d28')];
    const tronco = mat('#4a3322');
    for (let i = 0; i < q(70); i += 1) { const [x, z] = arco(rng, 5.5, 24, 85); add(g, pinheiro(3.5 + rng() * 5, folhas[i % 3], tronco), x, 0, z); }
    for (let i = 0; i < 7; i += 1) { const s = i % 2 ? 1 : -1; add(g, pinheiro(4 + rng() * 3, folhas[i % 3], tronco), s * (5 + rng() * 3), 0, 1 - rng() * 3); }
    pedras(g, rng, q(14), '#59635e', 70, 4, 12, 0.5);
    const lua = add(g, new THREE.Mesh(new THREE.SphereGeometry(1.7, 16, 12), glow('#e8f3ff', { fog: false })), -7, 11, -30);
    add(g, new THREE.Mesh(new THREE.SphereGeometry(2.7, 16, 12), glow('#cfe3ff', { fog: false, transparent: true, opacity: 0.18 })), lua.position.x, lua.position.y, lua.position.z);
    // fogueira
    const fx = 4.2;
    const fz = -2.4;
    const lenha = mat('#5a3a22');
    [0.6, -0.6].forEach((a) => { const l = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 6), lenha), fx, 0.12, fz); l.rotation.set(Math.PI / 2, 0, a); });
    const chamas = [0.34, 0.26, 0.2].map((r, i) => add(g, new THREE.Mesh(new THREE.ConeGeometry(r, 0.7 + i * 0.1, 6), glow(['#ff9a1f', '#ffd24a', '#fff3b0'][i])), fx + (i - 1) * 0.08, 0.5, fz));
    const fogo = luz(g, '#ff8a2a', 9, 10, fx, 1.1, fz + 0.3);
    const N = q(30);
    const vagalumes = pontos(N, '#d8ff7a', 0.07, () => [0, 0, 0]);
    g.add(vagalumes);
    const base = Array.from({ length: N }, () => [(rng() * 2 - 1) * 9, 0.6 + rng() * 2, 2 - rng() * 12, rng() * 6]);
    return {
      nome: 'Floresta sombria', group: g, ground: '#27381f',
      bg: [[0, '#08131f'], [0.55, '#17343a'], [1, '#30584a']], fog: ['#17342c', 9, 34],
      hemi: ['#a8e8c8', '#16251c', 1.7], key: ['#d4e6ff', 2.8], rim: ['#ff9a4a', '#7fd6ff', 1.2],
      update: (t) => {
        chamas.forEach((f, i) => { f.scale.y = 1 + Math.sin(t * 9 + i * 2) * 0.18; f.scale.x = 1 + Math.sin(t * 7 + i) * 0.08; f.scale.z = f.scale.x; });
        if (fogo) fogo.intensity = 8 + Math.sin(t * 11) * 1.6 + Math.sin(t * 17) * 0.8;
        mover(vagalumes, base, (b) => [b[0] + Math.sin(t * 0.6 + b[3]) * 0.8, b[1] + Math.sin(t * 0.9 + b[3] * 2) * 0.3, b[2] + Math.cos(t * 0.5 + b[3]) * 0.8]);
      },
    };
  };

  const vulcao = (): Cenario => {
    const rng = rngSeed(37);
    const g = new THREE.Group();
    const rochas = [mat('#4a3a3a'), mat('#5a4642'), mat('#3d2f31')];
    for (let i = 0; i < 12; i += 1) {
      const r = 3.5 + rng() * 3.5;
      const h = 5 + rng() * 6;
      const x = -26 + i * 4.6 + rng() * 2;
      const z = -16 - rng() * 12;
      add(g, new THREE.Mesh(new THREE.ConeGeometry(r, h, 5 + (i % 3)), rochas[i % 3]), x, h / 2 - 0.3, z);
    }
    // vulcão
    const vx = 4.2;
    const vz = -14;
    const vh = 5.6;
    add(g, new THREE.Mesh(new THREE.CylinderGeometry(1.2, 6, vh, 9), mat('#43302f')), vx, vh / 2, vz);
    add(g, new THREE.Mesh(new THREE.CircleGeometry(1.15, 12), glow('#ff7a1a', { fog: false })), vx, vh + 0.02, vz).rotation.x = -Math.PI / 2;
    const fumaca = add(g, new THREE.Mesh(new THREE.ConeGeometry(1.3, 3.4, 8, 1, true), glow('#ff8a2a', { fog: false, transparent: true, opacity: 0.28, side: THREE.DoubleSide })), vx, vh + 1.7, vz);
    const topo = new THREE.Vector3(vx, vh, vz);
    [0.5, 2.3, 4.1, 5.6].forEach((a) => {
      const r = 3.6;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 4.2), glow('#ff6a1a'));
      m.position.set(vx + Math.sin(a) * r, vh * 0.48, vz - Math.cos(a) * r * 0.9);
      m.lookAt(topo);
      g.add(m);
    });
    const cratera = luz(g, '#ff6a1f', 40, 38, vx, vh + 1.5, vz + 1.5);
    // poças de lava e pedras
    const pocas = [[-6.5, -3.5, 1.5], [6.5, -5, 2.0], [-9, -9, 2.2]].map(([x, z, r]) => add(g, new THREE.Mesh(new THREE.CircleGeometry(r, 18), glow('#ff6a1a')), x, 0.02, z));
    pocas.forEach((p) => { p.rotation.x = -Math.PI / 2; });
    luz(g, '#ff7a2a', 7, 9, -6.5, 0.6, -3.5);
    pedras(g, rng, q(22), '#3d2f31', 80, 3, 14, 0.55);
    const N = q(140);
    const brasas = pontos(N, '#ffa23a', 0.09, () => [0, 0, 0]);
    g.add(brasas);
    const eb = Array.from({ length: N }, () => [(rng() * 2 - 1) * 14, rng() * 9, -2 - rng() * 18, 0.4 + rng() * 0.9, rng() * 10]);
    return {
      nome: 'Montanhas e vulcão', group: g, ground: '#3a2a2a',
      bg: [[0, '#2a0b16'], [0.5, '#8a2a1f'], [1, '#f39a46']], fog: ['#5e2519', 10, 42],
      hemi: ['#ffb894', '#3a1a14', 1.7], key: ['#ffd6b0', 3.2], rim: ['#ff5a1f', '#ffa23a', 3.0],
      update: (t) => {
        if (cratera) cratera.intensity = 36 + Math.sin(t * 3) * 6;
        fumaca.scale.y = 1 + Math.sin(t * 2.2) * 0.12;
        pocas.forEach((p, i) => { p.scale.setScalar(1 + Math.sin(t * 1.5 + i) * 0.03); });
        mover(brasas, eb, (b) => [b[0] + Math.sin(t * 0.7 + b[4]) * 0.5, (b[1] + t * b[3]) % 10, b[2]]);
      },
    };
  };

  const cogumelos = (): Cenario => {
    const rng = rngSeed(53);
    const g = new THREE.Group();
    g.add(pontos(q(260), '#ffffff', 2.2, () => { const a = (rng() * 2 - 1) * 1.5; const e = 0.15 + rng() * 1.3; return [Math.sin(a) * 60 * Math.cos(e), 60 * Math.sin(e) + 2, -Math.cos(a) * 60 * Math.cos(e)]; }, { sizeAttenuation: false }));
    const lua = add(g, new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 12), glow('#f0eaff', { fog: false })), 8, 11, -30);
    add(g, new THREE.Mesh(new THREE.SphereGeometry(2.4, 16, 12), glow('#c9bfff', { fog: false, transparent: true, opacity: 0.18 })), lua.position.x, lua.position.y, lua.position.z);
    const chapeus = ['#ff4f9a', '#5ef2ff', '#ffb347', '#9b6bff', '#6bff9b'];
    const haste = mat('#e8dcc8', { emissive: '#e8dcc8', emissiveIntensity: 0.12 });
    const luzes: THREE.PointLight[] = [];
    for (let i = 0; i < q(22); i += 1) {
      const [x, z] = arco(rng, 6.5, 18, 88);
      const h = 1.2 + rng() * 3.4;
      const c = chapeus[i % 5];
      add(g, cogumelo(h, 0.9 + rng() * 1.6, c, haste, 0.38), x, 0, z);
      if (i < 5) { const l = luz(g, c, 7, 9, x, h + 0.8, z + 1); if (l) luzes.push(l); }
    }
    for (let i = 0; i < q(16); i += 1) {
      const [x, z] = arco(rng, 3.2, 8, 88);
      add(g, cogumelo(0.3 + rng() * 0.5, 0.25 + rng() * 0.3, chapeus[(i + 2) % 5], haste, 0.7), x, 0, z);
    }
    const capim = mat('#2f7a63', { emissive: '#1a5a4a', emissiveIntensity: 0.3 });
    for (let i = 0; i < q(120); i += 1) {
      const x = (rng() * 2 - 1) * 13;
      const z = 3 - rng() * 17;
      if (Math.hypot(x, z) < 2.6) continue;
      add(g, new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.4, 4), capim), x, 0.2, z);
    }
    const N = q(45);
    const vagalumes = pontos(N, '#c8ff6a', 0.09, () => [0, 0, 0]);
    g.add(vagalumes);
    const base = Array.from({ length: N }, () => [(rng() * 2 - 1) * 10, 0.5 + rng() * 3, 3 - rng() * 14, rng() * 6]);
    return {
      nome: 'Campo de cogumelos', group: g, ground: '#1d3a52',
      bg: [[0, '#060924'], [0.55, '#1a1448'], [1, '#33307a']], fog: ['#1a1648', 10, 38],
      hemi: ['#a8b8ff', '#1d1b40', 1.5], key: ['#d4dcff', 2.5], rim: ['#ff7ad9', '#5ef2ff', 2.6],
      update: (t) => {
        luzes.forEach((l, i) => { l.intensity = 6 + Math.sin(t * 1.4 + i * 1.7) * 1.8; });
        mover(vagalumes, base, (b) => [b[0] + Math.sin(t * 0.5 + b[3]) * 1.0, b[1] + Math.sin(t * 0.8 + b[3] * 2) * 0.4, b[2] + Math.cos(t * 0.45 + b[3]) * 1.0]);
      },
    };
  };

  const cemiterio = (): Cenario => {
    const rng = rngSeed(71);
    const g = new THREE.Group();
    const lua = add(g, new THREE.Mesh(new THREE.SphereGeometry(2.6, 20, 14), glow('#f5f1e0', { fog: false })), -5, 8.5, -26);
    add(g, new THREE.Mesh(new THREE.SphereGeometry(3.8, 20, 14), glow('#d8dcff', { fog: false, transparent: true, opacity: 0.14 })), lua.position.x, lua.position.y, lua.position.z);
    const pedra = [mat('#8a8a98'), mat('#767688'), mat('#9a9aa6')];
    for (let i = 0; i < q(30); i += 1) {
      const [x, z] = arco(rng, 4.2, 15, 85);
      const w = 0.7 + rng() * 0.45;
      const h = 0.9 + rng() * 0.8;
      const t = new THREE.Group();
      const m = pedra[i % 3];
      if (i % 5 === 0) {
        add(t, new THREE.Mesh(new THREE.BoxGeometry(0.22, h * 1.3, 0.2), m), 0, h * 0.65, 0);
        add(t, new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.2), m), 0, h * 0.95, 0);
      } else {
        add(t, new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.22), m), 0, h / 2, 0);
        const topo = add(t, new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, 0.22, 10), m), 0, h, 0);
        topo.rotation.x = Math.PI / 2;
      }
      t.position.set(x, 0, z);
      t.rotation.set(0, (rng() - 0.5) * 0.5, (rng() - 0.5) * 0.25);
      g.add(t);
    }
    const madeira = mat('#2e2630');
    for (let i = 0; i < q(6); i += 1) {
      const [x, z] = arco(rng, 7, 20, 85);
      const t = new THREE.Group();
      const h = 3.5 + rng() * 2;
      add(t, new THREE.Mesh(new THREE.ConeGeometry(0.3, h, 6), madeira), 0, h / 2, 0);
      for (let k = 0; k < 4; k += 1) {
        const b = add(t, new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, 1.6, 5), madeira), (k % 2 ? 0.55 : -0.55), h * (0.5 + k * 0.12), 0);
        b.rotation.z = (k % 2 ? -1 : 1) * (0.8 + rng() * 0.3);
      }
      t.position.set(x, 0, z);
      g.add(t);
    }
    const ferro = mat('#1c1a22');
    for (let i = 0; i < 28; i += 1) {
      const x = -13.5 + i;
      const z = -10;
      add(g, new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.5, 0.07), ferro), x, 0.75, z);
      add(g, new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 4), ferro), x, 1.6, z);
    }
    [0.45, 1.1].forEach((y) => add(g, new THREE.Mesh(new THREE.BoxGeometry(28, 0.05, 0.05), ferro), 0, y, -10));
    const nevoa: THREE.Mesh[] = [];
    const mm = glow('#cfd6ff', { transparent: true, opacity: 0.1, depthWrite: false });
    for (let i = 0; i < 9; i += 1) {
      const s = add(g, new THREE.Mesh(new THREE.SphereGeometry(2 + rng() * 1.5, 10, 8), mm), -12 + i * 3, 0.5, -3 - rng() * 9);
      s.scale.y = 0.22;
      s.userData = { x0: s.position.x, p: rng() * 6 };
      nevoa.push(s);
    }
    const fogos = [0, 1, 2].map((i) => {
      const w = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), glow(['#8ff0ff', '#a8ffd8', '#b9a8ff'][i])), 0, 1, 0);
      if (!leve) w.add(new THREE.PointLight(['#6cf0ff', '#6cffc2', '#9a7aff'][i], 3, 5));
      return w;
    });
    return {
      nome: 'Cemitério', group: g, ground: '#2b2b38',
      bg: [[0, '#0e0f1c'], [0.5, '#27243f'], [1, '#4f4e70']], fog: ['#2a2a40', 8, 32],
      hemi: ['#a6b0e0', '#14141f', 1.3], key: ['#cdd8ff', 2.6], rim: ['#8fa8ff', '#6cf0c2', 1.8],
      update: (t) => {
        nevoa.forEach((s) => { s.position.x = s.userData.x0 + Math.sin(t * 0.15 + s.userData.p) * 1.5; });
        fogos.forEach((w, i) => w.position.set(Math.sin(t * 0.4 + i * 2.1) * (5 + i * 1.5), 1.2 + Math.sin(t * 0.9 + i) * 0.3, -3 - i * 2.5 + Math.cos(t * 0.35 + i) * 1.2));
      },
    };
  };

  const caverna = (): Cenario => {
    const rng = rngSeed(97);
    const g = new THREE.Group();
    const geo = new THREE.IcosahedronGeometry(17, leve ? 2 : 3);
    const p = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i += 1) {
      v.fromBufferAttribute(p, i);
      const n = (Math.sin(v.x * 0.7) + Math.sin(v.y * 0.9 + 1) + Math.sin(v.z * 0.8 + 2) + Math.sin((v.x + v.z) * 0.45)) / 4;
      v.setLength(17 * (1 + 0.09 * n));
      p.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    const parede = add(g, new THREE.Mesh(geo, mat('#5e4c6e', { side: THREE.BackSide })), 0, 0, -2);
    parede.scale.set(1, 0.58, 1);
    const rocha = [mat('#5a4a62'), mat('#463a50')];
    for (let i = 0; i < q(40); i += 1) {
      const [x, z] = arco(rng, 3, 15, 120);
      const h = 1.2 + rng() * 3.2;
      const r = 0.25 + rng() * 0.4;
      const est = add(g, new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), rocha[i % 2]), x, 9.6 - h / 2 + 0.2, z);
      est.rotation.x = Math.PI;
    }
    for (let i = 0; i < q(26); i += 1) {
      const [x, z] = arco(rng, 4.5, 14, 100);
      const h = 0.8 + rng() * 2.2;
      const r = 0.25 + rng() * 0.45;
      add(g, new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), rocha[i % 2]), x, h / 2 - 0.05, z);
    }
    const cores = ['#5ef2ff', '#ff7ad9', '#9b7bff', '#5ef2ff', '#ff7ad9'];
    const luzes: THREE.PointLight[] = [];
    [[-7, -7], [6.5, -8], [-10, -3], [9.5, -3.5], [0.5, -13]].forEach(([x, z], i) => {
      const c = grupoDeCristais(rng, cores[i], 1.3 + rng() * 0.5);
      c.position.set(x, 0, z);
      g.add(c);
      const l = luz(g, cores[i], 9, 11, x, 1.4, z + 1);
      if (l) luzes.push(l);
    });
    add(g, new THREE.Mesh(new THREE.CircleGeometry(1.7, 24), glow('#7f9fe0', { fog: false })), 0, 3.0, -15.2);
    luz(g, '#a8c8ff', 10, 18, 0, 3.4, -13);
    const N = q(90);
    const poeira = pontos(N, '#d9ccff', 0.05, () => [0, 0, 0], { opacity: 0.6 });
    g.add(poeira);
    const base = Array.from({ length: N }, () => [(rng() * 2 - 1) * 10, 0.3 + rng() * 5, 4 - rng() * 16, rng() * 6]);
    return {
      nome: 'Caverna', group: g, ground: '#2d2433',
      bg: [[0, '#0b0a12'], [0.5, '#161224'], [1, '#2a2040']], fog: ['#1c1428', 8, 46],
      hemi: ['#b8a4ff', '#1a1226', 1.5], key: ['#ddd2ff', 2.8], rim: ['#5ef2ff', '#ff7ad9', 2.2],
      update: (t) => {
        luzes.forEach((l, i) => { l.intensity = 8 + Math.sin(t * 1.2 + i * 1.3) * 2; });
        mover(poeira, base, (b) => [b[0] + Math.sin(t * 0.2 + b[3]) * 0.6, b[1] + Math.sin(t * 0.3 + b[3] * 2) * 0.4, b[2] + Math.cos(t * 0.25 + b[3]) * 0.6]);
      },
    };
  };

  return { slime: planicie, orc: floresta, dragao: vulcao, cogumelo: cogumelos, esqueleto: cemiterio, morcego: caverna } satisfies Record<TipoDeMonstro, () => Cenario>;
}

export function criarCenario(tipo: TipoDeMonstro, leve = false): Cenario {
  const cenario = fabrica(leve)[tipo]();
  cenario.bgTexture = gradiente(cenario.bg);
  return cenario;
}

export function descartarCenario(cenario: Cenario | null) {
  if (!cenario) return;
  cenario.group.traverse((o) => {
    const objeto = o as THREE.Mesh;
    objeto.geometry?.dispose();
    const material = objeto.material as THREE.Material | THREE.Material[] | undefined;
    if (material) (Array.isArray(material) ? material : [material]).forEach((m) => m.dispose());
  });
  cenario.bgTexture?.dispose();
}
