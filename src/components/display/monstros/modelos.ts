// Carrega cada arquivo de monstro uma vez só e entrega uma cópia para cada cartão. O arquivo pesa alguns MB: com várias
// equipes iguais (ou recarregando o cartão) ele não é lido de novo.
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as clonarComEsqueleto } from 'three/examples/jsm/utils/SkeletonUtils.js';

const cache = new Map<string, Promise<GLTF>>();

export function carregarModelo(url: string): Promise<GLTF> {
  let promessa = cache.get(url);
  if (!promessa) {
    promessa = new GLTFLoader().loadAsync(url);
    cache.set(url, promessa);
    // Falhou: tira do cache para a próxima tentativa carregar de novo
    promessa.catch(() => cache.delete(url));
  }
  return promessa;
}

// Começa a baixar os arquivos antes do jogo, para o monstro aparecer na hora
export function preCarregarModelos(urls: string[]) {
  urls.forEach((url) => { carregarModelo(url).catch(() => undefined); });
}

export interface MonstroPronto {
  modelo: THREE.Group;
  animacoes: THREE.AnimationClip[];
  // Materiais do corpo (recebem o flash vermelho): os de efeito (estouro e poeira) ficam de fora
  materiaisDoCorpo: THREE.MeshStandardMaterial[];
  // Só os materiais clonados são descartados: geometria e texturas são compartilhadas com as outras cópias
  descartar: () => void;
}

export async function criarMonstro(url: string): Promise<MonstroPronto> {
  const gltf = await carregarModelo(url);
  const modelo = clonarComEsqueleto(gltf.scene) as THREE.Group;
  const materiaisDoCorpo: THREE.MeshStandardMaterial[] = [];
  const clonados: THREE.Material[] = [];

  modelo.traverse((objeto) => {
    if (!(objeto instanceof THREE.Mesh)) return;
    objeto.frustumCulled = false; // o corpo se mexe para fora da caixa original
    // Materiais próprios: o flash muda a cor deles e não pode pintar os outros monstros
    const proprios = (Array.isArray(objeto.material) ? objeto.material : [objeto.material]).map((material: THREE.Material) => {
      const copia = material.clone();
      clonados.push(copia);
      if (copia.name !== 'FX_Impacto' && copia.name !== 'FX_Poeira' && copia instanceof THREE.MeshStandardMaterial) {
        materiaisDoCorpo.push(copia);
      }
      return copia;
    });
    objeto.material = Array.isArray(objeto.material) ? proprios : proprios[0];
  });

  return {
    modelo,
    animacoes: gltf.animations,
    materiaisDoCorpo,
    descartar: () => clonados.forEach((material) => material.dispose()),
  };
}
