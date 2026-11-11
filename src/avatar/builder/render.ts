// GERADOR DE AVATARES — desenha o personagem como SVG a partir de uma configuração.
// Gerado a partir do montador de avatares testado; não depende de React nem do DOM.
// Todos os valores usados no desenho vêm de listas fechadas (ver parts.ts), então o SVG gerado é seguro.
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { AvatarConfig } from './config';

interface FaceShape { earX: number; chin: number; fit: [number, number]; svg: string }

let INK = '#111';
let K = '';
let UID = 0;
function setLook(flat: boolean){ INK = flat ? '#4a2c22' : '#111'; K = `stroke="${INK}" stroke-width="6.5" stroke-linejoin="round" stroke-linecap="round"`; }
setLook(false);
function mix(a: string, b: string, k: number){ const pa=parseInt(a.slice(1),16), pb=parseInt(b.slice(1),16);
  const c=(sh: number)=>{ const x=(pa>>sh)&255, y=(pb>>sh)&255; return Math.round(x+(y-x)*k); };
  return '#'+[16,8,0].map(sh=>c(sh).toString(16).padStart(2,'0')).join(''); }
const WINE = '#8b2f4a';

function faceShape(s: AvatarConfig): FaceShape{
  const f = `fill="url(#gs)" ${K}`;
  switch(s.face){
    // chin = ponto mais baixo do queixo; fit = [largura, altura] do cabelo/acessórios em relação ao rosto redondo
    case 'oval':   return {earX:97, chin:328, fit:[.86,1.06], svg:`<ellipse cx="200" cy="200" rx="105" ry="128" ${f}/>`};
    case 'square': return {earX:92, chin:320, fit:[.9,1.02], svg:`<rect x="90" y="80" width="220" height="240" rx="72" ${f}/>`};
    case 'heart':  return {earX:86, chin:330, fit:[.95,1], svg:`<path d="M 85 190 C 85 110 135 80 200 80 C 265 80 315 110 315 190 C 315 262 262 326 200 330 C 138 326 85 262 85 190 Z" ${f}/>`};
    case 'wide':   return {earX:74, chin:312, fit:[1.06,.95], svg:`<ellipse cx="200" cy="202" rx="130" ry="112" ${f}/>`};
    case 'pear':   return {earX:84, chin:326, fit:[.92,1], svg:`<path d="M 112 175 C 112 108 152 82 200 82 C 248 82 288 108 288 175 C 318 215 306 318 200 326 C 94 318 82 215 112 175 Z" ${f}/>`};
    default:       return {earX:80, chin:318, fit:[1,1], svg:`<ellipse cx="200" cy="200" rx="122" ry="118" ${f}/>`};
  }
}
function starPoints(cx: number, cy: number, R: number, r: number){
  const pts: string[] = [];
  for (let i = 0; i < 10; i += 1){ const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R; pts.push(`${(cx + Math.cos(a) * rad).toFixed(1)},${(cy + Math.sin(a) * rad).toFixed(1)}`); }
  return pts.join(' ');
}
// Brinco no lóbulo da orelha (cx = centro da orelha)
function earringShape(s: AvatarConfig, cx: number){
  const gold = '#ffd54f';
  switch(s.earringStyle){
    case 'ball': return `<circle cx="${cx}" cy="243" r="7" fill="${gold}" ${K} stroke-width="3"/>`;
    case 'hoop': return `<circle cx="${cx}" cy="255" r="12" fill="none" stroke="${gold}" stroke-width="5" data-k="1"/>`;
    case 'star': return `<polygon points="${starPoints(cx, 250, 11, 5)}" fill="${gold}" ${K} stroke-width="3"/>`;
    case 'pearl': return `<circle cx="${cx}" cy="246" r="7.5" fill="#fff" ${K} stroke-width="3"/><circle cx="${cx-2}" cy="243.5" r="2" fill="#dfe6ee"/>`;
    default: return '';
  }
}
function ears(s: AvatarConfig, x: number){
  const f = `fill="${s.skin}" ${K}`;
  const inner = (cx: number, d: number)=> s.look==='flat' ? `<ellipse cx="${cx+d*3}" cy="216" rx="9" ry="12" fill="${mix(s.skin,'#000000',.14)}"/>` : `<path d="M ${cx+d*4} 205 q ${d*8} 8 0 18" fill="none" ${K} stroke-width="3"/>`;
  let out = `<circle cx="${x}" cy="215" r="22" ${f}/><circle cx="${400-x}" cy="215" r="22" ${f}/>`;
  out += inner(x,-1) + inner(400-x,1);
  out += earringShape(s, x) + earringShape(s, 400 - x);
  return out;
}
const SHORT = `M 80 190 C 70 90 140 55 200 55 C 270 55 335 90 320 190 C 310 160 290 140 270 135 C 240 150 160 150 130 135 C 110 140 90 160 80 190 Z`;
// Cachos: círculos que se fundem (o contorno só aparece por fora)
function cluster(list: Array<[number, number, number]>, fill: string){
  const stroked = list.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${INK}" stroke-width="10"/>`).join('');
  const fills = list.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`).join('');
  return stroked + fills;
}
function hairBack(s: AvatarConfig){
  const f = `fill="${mix(s.hair,'#000000',.2)}" ${K}`;
  switch(s.hairStyle){
    case 'long': return `<path d="M 75 200 C 55 80 140 45 200 45 C 260 45 345 80 325 200 L 340 345 L 60 345 Z" ${f}/>`;
    case 'bob':  return `<path d="M 76 210 C 58 80 140 48 200 48 C 260 48 342 80 324 210 L 328 275 Q 200 295 72 275 Z" ${f}/>`;
    case 'bun':  return `<circle cx="200" cy="52" r="44" ${f}/>`;
    case 'twin': return `<circle cx="95" cy="75" r="38" ${f}/><circle cx="305" cy="75" r="38" ${f}/>`;
    case 'puffs': return `<circle cx="102" cy="92" r="46" ${f}/><circle cx="298" cy="92" r="46" ${f}/><path d="M 80 85 q 12 -14 24 0 M 112 106 q 10 -12 22 0 M 276 85 q 12 -14 24 0 M 266 106 q 10 -12 22 0" fill="none" stroke="#000" stroke-opacity=".2" stroke-width="4" stroke-linecap="round"/>`;
    case 'afro': return `<circle cx="200" cy="118" r="114" ${f}/><path d="M 110 70 q 12 -14 24 0 M 180 40 q 12 -14 24 0 M 260 66 q 12 -14 24 0 M 80 130 q 12 -14 24 0 M 296 130 q 12 -14 24 0" fill="none" stroke="#000" stroke-opacity=".2" stroke-width="4" stroke-linecap="round"/>`;
    case 'low': return `<path d="M 86 150 C 40 170 28 255 52 310 C 78 282 90 225 98 182 Z" ${f}/><path d="M 314 150 C 360 170 372 255 348 310 C 322 282 310 225 302 182 Z" ${f}/>`;
    case 'bunbow': return `<circle cx="200" cy="52" r="42" ${f}/>`;
    case 'pony': return `<path d="M 285 115 C 365 105 385 205 350 285 C 335 250 318 205 296 170 Z" ${f}/>`;
    case 'braids': return [78,322].map(x=>[236,262,288,314].map(y=>`<ellipse cx="${x}" cy="${y}" rx="17" ry="15" ${f}/>`).join('') + `<circle cx="${x}" cy="338" r="9" fill="#e63946" ${K} stroke-width="4"/>`).join('');
    case 'wavy': return `<path d="M 74 200 C 52 80 140 46 200 46 C 260 46 348 80 326 200 C 348 235 322 262 338 300 C 316 322 300 296 286 312 C 270 330 240 300 200 312 C 160 300 130 330 114 312 C 100 296 84 322 62 300 C 78 262 52 235 74 200 Z" ${f}/>`;
    case 'ponytop': return `<path d="M 196 64 C 250 18 338 46 352 124 C 358 170 338 214 344 254 C 318 240 306 200 308 160 C 308 100 262 78 204 94 Z" ${f}/>`;
    case 'curlybob': return cluster([[76,196,34],[70,240,32],[88,280,30],[324,196,34],[330,240,32],[312,280,30],[200,70,62]], mix(s.hair,'#000000',.2));
    default: return '';
  }
}
const CURLS: Array<[number, number, number]> = [[105,135,40],[150,98,42],[205,86,44],[258,98,42],[298,135,40],[92,185,34],[308,185,34],[175,125,36],[230,125,36]];
function hairFront(s: AvatarConfig){
  const base = hairFrontBase(s);
  if (!base) return '';
  const strands = ['M 140 70 Q 122 108 128 150','M 205 58 Q 196 100 204 146','M 262 70 Q 280 108 272 150'].map(d=>`<path d="${d}" fill="none" stroke="#000" stroke-opacity=".13" stroke-width="5" stroke-linecap="round"/>`).join('');
  return base + `<clipPath id="gh">${base}</clipPath><g clip-path="url(#gh)"><rect x="40" y="30" width="320" height="170" fill="url(#gl)"/>${strands}<path d="M 118 112 Q 140 84 182 74" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="11" stroke-linecap="round"/><circle cx="104" cy="140" r="5" fill="#fff" fill-opacity=".5"/></g>`;
}
function acc(s: AvatarConfig){
  const c = s.accColor, f = `fill="${c}" ${K}`;
  switch(s.acc){
    case 'bow': return `<path d="M 285 100 C 270 76 238 64 234 84 C 230 104 236 124 252 124 C 266 124 278 112 285 100 Z" ${f}/><path d="M 285 100 C 300 76 332 64 336 84 C 340 104 334 124 318 124 C 304 124 292 112 285 100 Z" ${f}/><circle cx="285" cy="100" r="14" ${f}/>`;
    case 'party': return `<path d="M 142 96 C 160 66 182 34 196 16 Q 205 6 214 16 C 228 34 246 64 262 92 Q 202 116 142 96 Z" ${f}/><path d="M 164 70 Q 202 80 240 70 M 152 88 Q 202 102 252 86" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".85"/><circle cx="205" cy="10" r="12" fill="#ffd54f" ${K} stroke-width="4"/>`;
    case 'crown': return `<path d="M 130 98 C 128 78 128 60 132 46 Q 138 36 146 46 C 152 54 158 62 166 70 C 176 56 186 42 194 32 Q 200 24 206 32 C 214 42 224 56 234 70 C 242 62 248 54 254 46 Q 262 36 268 46 C 272 60 272 78 270 98 Q 200 110 130 98 Z" fill="#ffd54f" ${K}/><circle cx="138" cy="40" r="8" fill="#ffd54f" ${K} stroke-width="4"/><circle cx="200" cy="24" r="9" fill="#ffd54f" ${K} stroke-width="4"/><circle cx="262" cy="40" r="8" fill="#ffd54f" ${K} stroke-width="4"/><circle cx="200" cy="76" r="8" fill="${c}" stroke="${INK}" stroke-width="3"/><circle cx="162" cy="86" r="6" fill="${c}" stroke="${INK}" stroke-width="3"/><circle cx="238" cy="86" r="6" fill="${c}" stroke="${INK}" stroke-width="3"/>`;
    case 'cat': return `<path d="M 102 122 C 88 84 84 52 98 42 C 114 34 150 58 172 80 Z" ${f}/><path d="M 298 122 C 312 84 316 52 302 42 C 286 34 250 58 228 80 Z" ${f}/><path d="M 112 100 C 104 80 102 62 110 58 C 118 56 134 68 144 78 Z" fill="#ffc1d6"/><path d="M 288 100 C 296 80 298 62 290 58 C 282 56 266 68 256 78 Z" fill="#ffc1d6"/>`;
    case 'headband': return (s.look!=='flat' ? `<path d="M 86 168 Q 200 92 314 168" fill="none" stroke="${INK}" stroke-width="24" stroke-linecap="round"/>` : '') + `<path d="M 86 168 Q 200 92 314 168" fill="none" stroke="${c}" stroke-width="14" stroke-linecap="round"/>`;
    case 'bucket': return `<path d="M 98 135 C 94 50 306 50 302 135 Z" ${f}/><path d="M 99 120 Q 200 102 301 120" fill="none" stroke="${mix(c,'#000000',.25)}" stroke-width="10"/><path d="M 56 138 Q 200 108 344 138 Q 330 158 200 154 Q 70 158 56 138 Z" ${f}/>`;
    case 'pirate': return `<path d="M 84 152 C 80 70 140 48 200 48 C 262 48 322 70 316 152 Q 200 128 84 152 Z" ${f}/><path d="M 312 118 C 330 102 352 94 358 104 C 364 116 352 134 340 138 C 330 132 320 126 312 118 Z" ${f}/><circle cx="130" cy="95" r="5" fill="#fff"/><circle cx="175" cy="75" r="5" fill="#fff"/><circle cx="230" cy="75" r="5" fill="#fff"/><circle cx="272" cy="97" r="5" fill="#fff"/><path d="M 238 180 L 92 156" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cx="264" cy="204" rx="30" ry="27" fill="#1b1b1b"/>`;
    case 'helmet': return `<circle cx="200" cy="205" r="138" data-k="1" fill="rgba(200,230,255,.18)" stroke="#e8eef5" stroke-width="16"/><path d="M 108 140 Q 136 92 196 80" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="9" stroke-linecap="round"/>`;
    case 'nose': return `<circle cx="200" cy="240" r="15" fill="#e63946" ${K} stroke-width="4"/><circle cx="195" cy="235" r="4" fill="#fff" fill-opacity=".6"/>`;
    case 'beret': return `<path d="M 100 130 C 90 70 170 40 230 52 C 290 62 316 100 304 132 C 250 118 160 120 100 130 Z" ${f}/><path d="M 186 50 Q 192 34 206 44" fill="none" stroke="${mix(c,'#000000',.2)}" stroke-width="9" stroke-linecap="round"/>`;
    case 'flowers': return [[104,122,c],[152,96,'#ffffff'],[200,86,c],[248,96,'#ffffff'],[296,122,c]].map(([x,y,col])=>[0,1,2,3,4].map(i=>`<circle cx="${(x as number)+Math.cos(i*1.2566)*11}" cy="${(y as number)+Math.sin(i*1.2566)*11}" r="9" fill="${col}" ${K} stroke-width="3"/>`).join('') + `<circle cx="${x}" cy="${y}" r="7" fill="#ffd54f" ${K} stroke-width="3"/>`).join('');
    case 'chefhat': return `<path d="M 118 128 C 96 100 100 62 140 62 C 140 30 200 20 220 44 C 250 28 306 44 290 80 C 316 96 300 128 282 128 Z" fill="#ffffff" ${K}/><rect x="118" y="112" width="164" height="26" rx="8" ${f}/>`;
    case 'wizard': return `<path d="M 120 128 C 150 90 170 50 190 22 Q 204 6 218 22 C 228 50 250 92 282 128 Q 200 144 120 128 Z" ${f}/><path d="M 70 130 Q 200 104 330 130 Q 320 154 200 150 Q 80 154 70 130 Z" ${f}/><polygon points="200,70 206,84 221,85 210,95 213,110 200,102 187,110 190,95 179,85 194,84" fill="#ffd54f"/>`;
    case 'phones': return (s.look!=='flat' ? `<path d="M 92 190 C 90 62 310 62 308 190" fill="none" stroke="${INK}" stroke-width="22" stroke-linecap="round"/>` : '') + `<path d="M 92 190 C 90 62 310 62 308 190" fill="none" stroke="${c}" stroke-width="12" stroke-linecap="round"/><rect x="66" y="172" width="34" height="62" rx="15" ${f}/><rect x="300" y="172" width="34" height="62" rx="15" ${f}/>`;
    case 'cap': return `<path d="M 84 150 C 80 70 140 46 200 46 C 262 46 322 70 316 150 Z" ${f}/><path d="M 92 146 Q 40 146 24 176 Q 90 184 170 152 Z" ${f}/><circle cx="200" cy="48" r="8" ${f}/>`;
    default: return '';
  }
}
function maskLayer(s: AvatarConfig){
  if (s.acc !== 'mask') return '';
  return `<path d="M 96 192 Q 150 172 200 186 Q 250 172 304 192 Q 312 240 258 240 Q 228 232 200 232 Q 172 232 142 240 Q 88 240 96 192 Z" fill="${s.accColor}" ${K}/>`;
}
function hairFrontBase(s: AvatarConfig){
  const f = `fill="${s.hair}" ${K}`;
  switch(s.hairStyle){
    case 'spiky': return `<path d="M 80 192 L 66 146 L 60 108 L 94 124 L 90 78 L 122 102 L 134 50 L 160 92 L 180 34 L 200 84 L 222 26 L 238 84 L 266 40 L 272 96 L 304 62 L 304 116 L 338 100 L 322 148 L 322 192 C 312 164 292 142 272 138 L 254 156 L 236 136 L 218 160 L 200 138 L 182 160 L 164 136 L 146 156 L 130 138 C 110 142 92 164 80 192 Z" ${f}/><path d="M 100 112 L 108 140 M 128 70 L 138 112 M 178 52 L 186 100 M 224 46 L 216 98 M 270 62 L 262 106 M 304 90 L 292 124" fill="none" stroke="${mix(s.hair,'#000000',.32)}" stroke-width="5" stroke-linecap="round"/>`;
    case 'curly': case 'curlybob': {
      const stroked = CURLS.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${s.hair}" stroke="${INK}" stroke-width="10"/>`).join('');
      const fills = CURLS.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${s.hair}"/>`).join('');
      // espiral e brilho em cada cacho
      const swirl = CURLS.map(([x,y,r])=>`<path d="M ${x-r*.5} ${y+r*.15} C ${x-r*.5} ${y-r*.6} ${x+r*.5} ${y-r*.6} ${x+r*.45} ${y} C ${x+r*.4} ${y+r*.45} ${x-r*.1} ${y+r*.45} ${x-r*.05} ${y+r*.08}" fill="none" stroke="${mix(s.hair,'#000000',.3)}" stroke-width="4.5" stroke-linecap="round"/><circle cx="${x-r*.35}" cy="${y-r*.5}" r="${r*.13}" fill="#fff" fill-opacity=".35"/>`).join('');
      return stroked + fills + swirl;
    }
    // Chanel e longo: franja reta, com repartido de mechas
    case 'bob': case 'long': {
      const bangs = `<path d="M 80 190 C 70 90 140 55 200 55 C 270 55 335 90 320 190 L 314 168 C 304 156 292 152 276 152 L 124 152 C 108 152 96 156 86 168 Z" ${f}/>`;
      const mechas = `<path d="M 150 64 Q 138 108 142 150 M 200 58 L 200 150 M 250 64 Q 262 108 258 150" fill="none" stroke="${mix(s.hair,'#000000',.28)}" stroke-width="4.5" stroke-linecap="round"/>`;
      return bangs + mechas;
    }
    // Afro: volume macio ao redor da testa
    case 'afro': return cluster([[104,128,34],[142,100,38],[200,88,42],[258,100,38],[296,128,34],[86,170,24],[314,170,24]], s.hair)
      + `<path d="M 120 150 Q 200 120 280 150" fill="none" stroke="${mix(s.hair,'#000000',.22)}" stroke-width="4" stroke-linecap="round"/>`;
    case 'mohawk': return `<path d="M 172 150 C 158 112 160 72 176 56 C 180 30 220 30 224 56 C 240 72 242 112 228 150 C 215 135 185 135 172 150 Z" ${f}/>`;
    case 'messy': return `<path d="M 80 195 C 58 150 68 100 110 95 C 100 60 150 40 175 60 C 190 30 240 30 255 62 C 292 50 332 92 305 126 C 332 140 334 172 320 195 C 310 165 290 148 270 140 C 240 155 160 155 130 140 C 110 148 90 165 80 195 Z" ${f}/>`;
    case 'low': return `<path d="${SHORT}" ${f}/><circle cx="92" cy="186" r="9" fill="#e63946" ${K} stroke-width="4"/><circle cx="308" cy="186" r="9" fill="#e63946" ${K} stroke-width="4"/>`;
    case 'bunbow': return `<path d="${SHORT}" ${f}/><path d="M 200 94 C 188 76 162 68 159 84 C 156 100 162 114 175 113 C 186 112 194 104 200 94 Z" fill="#e63946" ${K} stroke-width="4"/><path d="M 200 94 C 212 76 238 68 241 84 C 244 100 238 114 225 113 C 214 112 206 104 200 94 Z" fill="#e63946" ${K} stroke-width="4"/><circle cx="200" cy="94" r="10" fill="#e63946" ${K} stroke-width="4"/>`;
    case 'wavy': return `<path d="M 80 200 C 66 90 140 55 200 55 C 270 55 334 90 320 200 C 314 176 306 160 292 152 Q 276 168 258 150 Q 240 170 222 150 Q 204 170 186 150 Q 168 170 150 150 Q 132 168 112 152 C 96 160 86 178 80 200 Z" ${f}/><path d="M 140 70 Q 124 100 132 134 M 200 60 Q 190 96 198 134 M 262 70 Q 278 100 270 134" fill="none" stroke="${mix(s.hair,'#000000',.25)}" stroke-width="4.5" stroke-linecap="round"/>`;
    case 'tuft': return `<path d="${SHORT}" ${f}/>` + (s.look!=='flat' ? `<path d="M 200 62 C 196 30 226 14 240 34 C 252 52 232 62 220 52" fill="none" stroke="${INK}" stroke-width="26" stroke-linecap="round"/>` : '') + `<path d="M 200 62 C 196 30 226 14 240 34 C 252 52 232 62 220 52" fill="none" stroke="${s.hair}" stroke-width="14" stroke-linecap="round"/>`;
    case 'ponytop': return `<path d="${SHORT}" ${f}/><circle cx="204" cy="62" r="9" fill="#e63946" ${K} stroke-width="4"/>`;
    case 'pixie': return `<path d="M 82 192 C 70 92 142 58 200 58 C 268 58 334 92 318 192 C 312 170 300 156 284 150 C 262 134 232 160 214 122 C 196 150 170 164 150 144 C 130 150 100 166 82 192 Z" ${f}/>`;
    case 'bald': return '';
    case 'pony': return `<path d="${SHORT}" ${f}/><circle cx="298" cy="128" r="10" fill="#e63946" ${K} stroke-width="4"/>`;
    case 'side': return `<path d="M 80 190 C 70 90 140 55 200 55 C 270 55 335 90 320 190 C 312 165 304 150 288 140 C 240 118 170 124 112 160 C 96 170 88 180 80 190 Z" ${f}/>`;
    default: return `<path d="${SHORT}" ${f}/>`;
  }
}
function irisEye(s: AvatarConfig, cx: number, y: number, big: boolean){
  const d = cx < 200 ? -1 : 1;
  const rx = big ? 22 : 19, ry = big ? 26 : 21, ir = big ? 17 : 13.5, pr = big ? 8.5 : 6.5;
  return `<ellipse cx="${cx}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" ${K} stroke-width="4"/><circle cx="${cx}" cy="${y+2}" r="${ir}" fill="url(#gi)"/><circle cx="${cx}" cy="${y+2}" r="${pr}" fill="${INK}"/><circle cx="${cx+5}" cy="${y-5}" r="${big ? 6 : 4.5}" fill="#fff"/><circle cx="${cx-5}" cy="${y+9}" r="${big ? 3 : 2}" fill="#fff" fill-opacity=".8"/><path d="M ${cx-rx} ${y-3} Q ${cx} ${y-(ry*2-3)} ${cx+rx} ${y-3}" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>` + (s.lashes ? `<path d="M ${cx+d*(rx-1)} ${y-6} L ${cx+d*(rx+8)} ${y-13} M ${cx+d*(rx+1)} ${y} L ${cx+d*(rx+10)} ${y-3}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>` : '');
}
// Óculos por cima dos olhos (a cor da armação vem de gearColor)
function glassesLayer(s: AvatarConfig, L: number, R: number, y: number){
  const c = s.gearColor;
  const fr = `stroke="${c}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" data-k="1"`;
  const glass = 'fill="rgba(255,255,255,.25)"';
  const bridge = (d: string) => `<path d="${d}" fill="none" ${fr}/>`;
  switch(s.glassesStyle){
    case 'round':
      return `<circle cx="${L}" cy="${y}" r="34" ${glass} ${fr}/><circle cx="${R}" cy="${y}" r="34" ${glass} ${fr}/>` + bridge(`M ${L+34} ${y} L ${R-34} ${y}`);
    case 'square':
      return `<rect x="${L-37}" y="${y-28}" width="74" height="56" rx="13" ${glass} ${fr}/><rect x="${R-37}" y="${y-28}" width="74" height="56" rx="13" ${glass} ${fr}/>` + bridge(`M ${L+37} ${y-9} Q 200 ${y-17} ${R-37} ${y-9}`);
    case 'sun': {
      const lens = (cx: number) => `<path d="M ${cx-40} ${y-26} L ${cx+40} ${y-26} Q ${cx+45} ${y-26} ${cx+43} ${y-14} L ${cx+32} ${y+22} Q ${cx+27} ${y+31} ${cx+16} ${y+31} L ${cx-16} ${y+31} Q ${cx-27} ${y+31} ${cx-32} ${y+22} L ${cx-43} ${y-14} Q ${cx-45} ${y-26} ${cx-40} ${y-26} Z" fill="#15181e" fill-opacity=".92" ${fr}/><path d="M ${cx-26} ${y-15} L ${cx-8} ${y-15} L ${cx-22} ${y+7} Z" fill="#fff" fill-opacity=".28"/>`;
      return lens(L) + lens(R) + bridge(`M ${L+42} ${y-18} Q 200 ${y-27} ${R-42} ${y-18}`);
    }
    case 'heart': {
      const heart = (cx: number) => `<path d="M ${cx} ${y+27} C ${cx-54} ${y-6} ${cx-32} ${y-44} ${cx} ${y-15} C ${cx+32} ${y-44} ${cx+54} ${y-6} ${cx} ${y+27} Z" fill="rgba(255,105,140,.45)" ${fr}/>`;
      return heart(L) + heart(R) + bridge(`M ${L+30} ${y-8} Q 200 ${y-16} ${R-30} ${y-8}`);
    }
    case 'star': {
      const star = (cx: number) => `<polygon points="${starPoints(cx, y+1, 40, 18)}" fill="rgba(255,213,79,.5)" ${fr}/>`;
      return star(L) + star(R) + bridge(`M ${L+30} ${y-4} Q 200 ${y-12} ${R-30} ${y-4}`);
    }
    default: return '';
  }
}
function eyes(s: AvatarConfig){
  const L=150, R=250, y=205, out: string[]=[];
  const BC = s.look==='flat' ? mix(s.hair,'#2a1a12',.55) : INK;
  const brow = (d: string, w = 9)=>`<path d="${d}" fill="none" stroke="${BC}" stroke-width="${w}" stroke-linecap="round"/>`;
  switch(s.eyes){
    case 'wink':
      out.push(irisEye(s, L, y, false));
      out.push(`<path d="M ${R-22} 210 Q ${R} 182 ${R+22} 210" fill="none" ${K} stroke-width="7"/>`);
      out.push(brow(`M ${L-22} 172 Q ${L} 162 ${L+22} 172`,6), brow(`M ${R-24} 164 Q ${R} 152 ${R+24} 164`,6)); break;
    case 'big':
      for (const cx of [L,R]) out.push(irisEye(s, cx, y, true));
      out.push(brow(`M ${L-24} 168 Q ${L} 156 ${L+24} 168`,6), brow(`M ${R-24} 168 Q ${R} 156 ${R+24} 168`,6)); break;
    case 'dots':
      for (const cx of [L,R]) out.push(`<ellipse cx="${cx}" cy="${y}" rx="8.5" ry="11.5" fill="${INK}"/><circle cx="${cx+3}" cy="${y-4}" r="3" fill="#fff"/>`);
      out.push(brow(`M ${L-16} 180 Q ${L} 172 ${L+16} 180`,4), brow(`M ${R-16} 180 Q ${R} 172 ${R+16} 180`,4)); break;
    case 'iris':
      for (const cx of [L,R]) { const d = cx===L ? -1 : 1;
        out.push(`<ellipse cx="${cx}" cy="${y}" rx="19" ry="21" fill="#fff" ${K} stroke-width="4"/><circle cx="${cx}" cy="${y+2}" r="13.5" fill="url(#gi)"/><circle cx="${cx}" cy="${y+2}" r="6.5" fill="${INK}"/><circle cx="${cx+5}" cy="${y-4}" r="4.5" fill="#fff"/><circle cx="${cx-5}" cy="${y+8}" r="2" fill="#fff" fill-opacity=".8"/><path d="M ${cx-19} ${y-3} Q ${cx} ${y-39} ${cx+19} ${y-3}" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>` + (s.lashes ? `<path d="M ${cx+d*18} ${y-6} L ${cx+d*27} ${y-13} M ${cx+d*20} ${y} L ${cx+d*29} ${y-3}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>` : '')); }
      out.push(brow(`M ${L-22} 172 Q ${L} 162 ${L+22} 172`,6), brow(`M ${R-22} 172 Q ${R} 162 ${R+22} 172`,6)); break;
    case 'normal':
      for (const cx of [L,R]) out.push(`<ellipse cx="${cx}" cy="${y}" rx="20" ry="22" fill="#fff" ${K} stroke-width="4"/><circle cx="${cx}" cy="${y+2}" r="11" fill="${INK}"/><circle cx="${cx+4}" cy="${y-3}" r="4" fill="#fff"/>`);
      out.push(brow(`M ${L-24} 172 Q ${L} 160 ${L+24} 172`,7), brow(`M ${R-24} 172 Q ${R} 160 ${R+24} 172`,7)); break;
    case 'happy':
      for (const cx of [L,R]) out.push(`<path d="M ${cx-22} 210 Q ${cx} 182 ${cx+22} 210" fill="none" ${K} stroke-width="7"/>`);
      out.push(brow(`M ${L-24} 168 Q ${L} 156 ${L+24} 168`,6), brow(`M ${R-24} 168 Q ${R} 156 ${R+24} 168`,6)); break;
    case 'sleepy':
      for (const cx of [L,R]) out.push(`<path d="M ${cx-22} 205 A 22 18 0 0 0 ${cx+22} 205 Z" fill="#fff" ${K} stroke-width="4"/><path d="M ${cx-10} 205 A 10 10 0 0 0 ${cx+10} 205 Z" fill="${INK}"/>`);
      out.push(brow(`M ${L-24} 182 L ${L+24} 182`,7), brow(`M ${R-24} 182 L ${R+24} 182`,7)); break;
    case 'cute':
      for (const cx of [L,R]) out.push(`<ellipse cx="${cx}" cy="${y}" rx="17" ry="24" fill="${INK}"/><circle cx="${cx+5}" cy="${y-8}" r="6" fill="#fff"/><circle cx="${cx-5}" cy="${y+9}" r="3" fill="#fff"/>`);
      out.push(brow(`M ${L-22} 170 Q ${L} 162 ${L+22} 170`,6), brow(`M ${R-22} 170 Q ${R} 162 ${R+22} 170`,6)); break;
    default: // angry
      out.push(`<ellipse cx="${L}" cy="${y}" rx="26" ry="16" fill="#fff" ${K} stroke-width="4"/><ellipse cx="${L+10}" cy="${y}" rx="4" ry="9" fill="${INK}"/>`);
      out.push(`<ellipse cx="${R}" cy="${y}" rx="26" ry="16" fill="#fff" ${K} stroke-width="4"/><ellipse cx="${R+10}" cy="${y}" rx="4" ry="9" fill="${INK}"/>`);
      out.push(brow(`M 108 172 L 180 194`,11), brow(`M 292 172 L 222 194`,11));
  }
  out.push(glassesLayer(s, L, R, y));
  return out.join('');
}
function mouth(s: AvatarConfig){
  switch(s.mouth){
    case 'smirk': return `<path d="M 168 266 Q 205 280 238 252" fill="none" ${K} stroke-width="6"/><path d="M 240 246 q 5 6 0 13" fill="none" ${K} stroke-width="3.5" opacity=".55"/>`;
    case 'cat': return `<path d="M 168 262 Q 184 282 200 264 Q 216 282 232 262" fill="none" ${K} stroke-width="5"/>`;
    case 'sad': return `<path d="M 172 278 Q 200 252 228 278" fill="none" ${K} stroke-width="6"/>`;
    case 'tiny': return `<path d="M 184 263 Q 200 277 216 263" fill="none" ${K} stroke-width="5"/>`;
    case 'smile':  return `<path d="M 165 258 Q 200 294 235 258" fill="none" ${K} stroke-width="6"/><path d="M 160 252 q -5 7 2 13 M 240 252 q 5 7 -2 13" fill="none" ${K} stroke-width="3.5" opacity=".55"/>`;
    case 'grin':   return `<path d="M 160 255 Q 200 305 240 255 Z" fill="${WINE}" ${K} stroke-width="4"/><clipPath id="gm"><path d="M 160 255 Q 200 305 240 255 Z"/></clipPath><ellipse clip-path="url(#gm)" cx="200" cy="292" rx="20" ry="11" fill="#ff8fa3"/><path d="M 168 257 Q 200 268 232 257 L 229 267 Q 200 278 171 267 Z" fill="#fff"/>`;
    case 'tongue': return `<path d="M 165 258 Q 200 300 235 258 Z" fill="${WINE}" ${K} stroke-width="4"/><path d="M 185 281 Q 200 306 215 281 Q 200 273 185 281 Z" fill="#ff8fa3" stroke="${INK}" stroke-width="3"/>`;
    case 'flat':   return `<path d="M 175 272 L 225 272" fill="none" ${K} stroke-width="6"/>`;
    case 'o':      return `<ellipse cx="200" cy="274" rx="13" ry="16" fill="${WINE}" ${K} stroke-width="4"/>`;
    default:       return `<path d="M 170 258 Q 200 264 230 258 Q 226 297 200 298 Q 174 297 170 258 Z" fill="${WINE}" ${K} stroke-width="4"/><clipPath id="gm"><path d="M 170 258 Q 200 264 230 258 Q 226 297 200 298 Q 174 297 170 258 Z"/></clipPath><ellipse clip-path="url(#gm)" cx="200" cy="294" rx="18" ry="10" fill="#ff8fa3"/>`;
  }
}
function nose(s: AvatarConfig){
  if (s.nose === 'dot') return `<ellipse cx="200" cy="237" rx="7" ry="5" fill="${mix(s.skin,'#b4532a',.4)}" opacity=".75"/>`;
  if (s.nose === 'button') return `<circle cx="200" cy="238" r="8" fill="${mix(s.skin,'#b4532a',.35)}" opacity=".8"/><circle cx="197" cy="235" r="2.5" fill="#fff" opacity=".6"/>`;
  return '';
}
function extras(s: AvatarConfig){
  let o = '';
  if (s.blush) o += `<ellipse cx="124" cy="244" rx="30" ry="20" fill="url(#gb)"/><ellipse cx="276" cy="244" rx="30" ry="20" fill="url(#gb)"/>`;
  if (s.mole) o += `<circle cx="262" cy="262" r="4.5" fill="#4a2a18" opacity=".9"/>`;
  if (s.bandaid) o += `<g transform="rotate(-28 132 254)"><rect x="104" y="244" width="56" height="20" rx="10" fill="#f6c9a0" stroke="#c9946a" stroke-width="2.5" data-k="1"/><rect x="124" y="244" width="16" height="20" fill="#ecb27f"/><circle cx="114" cy="254" r="1.8" fill="#c9946a"/><circle cx="150" cy="254" r="1.8" fill="#c9946a"/></g>`;
  if (s.freckles) o += [[165,236],[180,242],[155,246],[235,236],[220,242],[245,246]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3" fill="#8a4b2a" opacity=".7"/>`).join('');
  return o;
}
// Colar, cachecol ou lenço: desenhado por cima da roupa (só aparece com roupa)
function neckLayer(s: AvatarConfig){
  const gold = '#ffd54f', c = s.gearColor;
  const q = (t: number, a: number, b: number, d: number) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * d;
  switch(s.neck){
    case 'chain':
      return `<path d="M 152 326 Q 200 392 248 326" fill="none" stroke="${gold}" stroke-width="7" stroke-dasharray="9 5" stroke-linecap="round" data-k="1"/><circle cx="200" cy="359" r="9" fill="${gold}" ${K} stroke-width="3"/>`;
    case 'pearls': {
      let o = '';
      for (let i = 0; i <= 8; i += 1){ const t = i / 8; o += `<circle cx="${q(t,152,200,248).toFixed(1)}" cy="${q(t,326,386,326).toFixed(1)}" r="7.5" fill="#fff" stroke="#c9d1dc" stroke-width="2" data-k="1"/>`; }
      return o;
    }
    case 'medal':
      return `<path d="M 158 324 L 200 374 L 242 324" fill="none" stroke="#cfd8dc" stroke-width="5" stroke-linejoin="round" data-k="1"/><circle cx="200" cy="384" r="15" fill="${gold}" ${K} stroke-width="3.5"/><polygon points="${starPoints(200, 384, 9, 4)}" fill="#fff" fill-opacity=".85"/>`;
    case 'scarf':
      return `<path d="M 138 318 Q 200 356 262 318 L 270 348 Q 200 386 130 348 Z" fill="${c}" ${K}/><path d="M 148 330 Q 200 366 252 330" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="5" data-k="1"/><path d="M 228 356 L 256 414 L 222 420 L 206 366 Z" fill="${mix(c,'#000000',.15)}" ${K}/>`;
    case 'bandana':
      return `<path d="M 144 320 Q 200 350 256 320 L 200 396 Z" fill="${c}" ${K}/><circle cx="188" cy="352" r="3.5" fill="#fff" fill-opacity=".85"/><circle cx="212" cy="352" r="3.5" fill="#fff" fill-opacity=".85"/><circle cx="200" cy="370" r="3.5" fill="#fff" fill-opacity=".85"/>`;
    default: return '';
  }
}
const BASE = 'M 50 420 C 50 360 110 322 200 322 C 290 322 350 360 350 420 Z';
function clothes(s: AvatarConfig){
  const c = s.clothColor, f = `fill="${c}" ${K}`;
  const neck = `<path d="M 163 322 Q 200 362 237 322 Z" fill="${mix(s.skin,'#000000',.14)}" ${K} stroke-width="4"/>`;
  switch(s.cloth){
    case 'tshirt':  return `<path d="${BASE}" ${f}/>${neck}`;
    case 'stripes': {
      let lines = ''; for (let y=336;y<410;y+=22) lines += `<rect x="40" y="${y}" width="320" height="10" fill="#fff" opacity=".85"/>`;
      return `<path d="${BASE}" ${f}/><g clip-path="url(#cp)">${lines}</g><path d="${BASE}" fill="none" ${K}/>${neck}`;
    }
    case 'hoodie':
      return `<path d="M 100 360 C 90 290 150 292 200 292 C 250 292 310 290 300 360 Z" ${f}/><path d="${BASE}" ${f}/><path d="M 163 322 Q 200 350 237 322" fill="${mix(s.skin,'#000000',.14)}" ${K} stroke-width="4"/><path d="M 182 345 L 180 392 M 218 345 L 220 392" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`;
    case 'suit':
      return `<path d="${BASE}" ${f}/><path d="M 160 322 L 200 395 L 240 322 Z" fill="#fff" ${K} stroke-width="4"/><path d="M 192 345 L 208 345 L 213 392 L 200 402 L 187 392 Z" fill="#e63946" ${K} stroke-width="3"/><path d="M 160 322 L 200 405 M 240 322 L 200 405" fill="none" ${K} stroke-width="4"/>`;
    case 'overall':
      return `<path d="${BASE}" fill="#fff" ${K}/>${neck}<path d="M 140 360 L 140 330 M 260 360 L 260 330" ${K} stroke="${c}" stroke-width="16"/><rect x="132" y="358" width="136" height="60" rx="8" ${f}/><circle cx="140" cy="364" r="6" fill="#ffd54f" stroke="${INK}" stroke-width="3"/><circle cx="260" cy="364" r="6" fill="#ffd54f" stroke="${INK}" stroke-width="3"/>`;
    case 'polo': { const lt = mix(c,'#ffffff',.3); return `<path d="${BASE}" ${f}/><path d="M 170 322 Q 186 350 200 356 Q 214 350 230 322 Z" fill="${mix(s.skin,'#000000',.14)}"/><path d="M 154 326 Q 172 348 196 360 Q 184 372 168 368 Q 148 356 146 338 Q 148 330 154 326 Z" fill="${lt}" ${K} stroke-width="4"/><path d="M 246 326 Q 228 348 204 360 Q 216 372 232 368 Q 252 356 254 338 Q 252 330 246 326 Z" fill="${lt}" ${K} stroke-width="4"/><circle cx="200" cy="378" r="4" fill="#fff"/><circle cx="200" cy="396" r="4" fill="#fff"/>`; }
    case 'bowtie': return `<path d="${BASE}" fill="#fff" ${K}/><path d="M 168 322 Q 184 346 200 352 Q 216 346 232 322 Z" fill="${mix(s.skin,'#000000',.14)}"/><path d="M 154 326 Q 172 346 198 356 Q 186 370 170 368 Q 148 356 146 338 Q 148 330 154 326 Z" fill="#fff" ${K} stroke-width="4"/><path d="M 246 326 Q 228 346 202 356 Q 214 370 230 368 Q 252 356 254 338 Q 252 330 246 326 Z" fill="#fff" ${K} stroke-width="4"/><path d="M 200 360 C 190 346 172 340 169 352 C 166 364 170 378 182 377 C 191 376 196 368 200 360 Z M 200 360 C 210 346 228 340 231 352 C 234 364 230 378 218 377 C 209 376 204 368 200 360 Z" ${f} stroke-width="4"/><circle cx="200" cy="360" r="8" ${f} stroke-width="4"/>`;
    case 'astro': return `<path d="${BASE}" fill="#f1f4f8" ${K}/><path d="M 140 330 Q 200 372 260 330" fill="none" stroke="#9fb0c3" stroke-width="14" stroke-linecap="round"/><circle cx="150" cy="380" r="12" fill="#e63946" ${K} stroke-width="4"/><rect x="236" y="368" width="40" height="22" rx="5" fill="#2f6fed" ${K} stroke-width="4"/>`;
    case 'jacket':
      return `<path d="${BASE}" ${f}/><path d="M 168 322 Q 200 360 232 322 L 244 420 L 156 420 Z" fill="#fff" ${K} stroke-width="4"/>${neck}<path d="M 168 322 L 156 420 M 232 322 L 244 420" fill="none" stroke="${mix(c,'#000000',.35)}" stroke-width="5" stroke-linecap="round"/>`;
    case 'turtle':
      return `<path d="${BASE}" ${f}/><path d="M 156 300 Q 200 324 244 300 L 244 346 Q 200 372 156 346 Z" fill="${mix(c,'#ffffff',.18)}" ${K} stroke-width="4"/><path d="M 164 318 Q 200 342 236 318 M 162 332 Q 200 358 238 332" fill="none" stroke="${mix(c,'#000000',.25)}" stroke-width="3" opacity=".55"/>`;
    case 'tank':
      return `<path d="${BASE}" fill="${mix(s.skin,'#000000',.06)}" ${K}/><path d="M 100 420 C 100 380 140 356 200 356 C 260 356 300 380 300 420 Z" ${f}/><path d="M 152 360 L 150 328 M 248 360 L 250 328" fill="none" stroke="${c}" stroke-width="18" stroke-linecap="round"/>`;
    case 'chef':
      return `<path d="${BASE}" fill="#fff" ${K}/>${neck}<circle cx="186" cy="372" r="5" fill="#9aa7b5"/><circle cx="214" cy="372" r="5" fill="#9aa7b5"/><circle cx="186" cy="398" r="5" fill="#9aa7b5"/><circle cx="214" cy="398" r="5" fill="#9aa7b5"/><path d="M 166 326 Q 200 350 234 326 L 220 350 Q 200 366 180 350 Z" ${f} stroke-width="4"/>`;
    case 'pajama':
      return `<path d="${BASE}" ${f}/>${neck}<path d="M 160 326 Q 200 364 240 326" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/><path d="M 132 372 a 13 13 0 1 0 12 20 a 10 10 0 1 1 -12 -20 Z" fill="#ffd54f"/><polygon points="262,366 266,376 277,377 269,384 271,395 262,389 253,395 255,384 247,377 258,376" fill="#ffd54f"/><circle cx="222" cy="404" r="4" fill="#ffd54f"/>`;
    case 'hero':
      return `<path d="M 30 420 L 70 335 C 130 316 270 316 330 335 L 370 420 Z" fill="${s.accColor}" ${K}/><path d="${BASE}" ${f}/>${neck}<polygon points="206,350 184,384 200,384 192,410 222,370 205,370" fill="#ffd54f" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
    case 'star':
      return `<path d="${BASE}" ${f}/>${neck}<polygon points="200,360 207,376 224,377 211,388 215,405 200,396 185,405 189,388 176,377 193,376" fill="#ffd54f" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
    case 'dress':
      return `<path d="${BASE}" ${f}/>${neck}<path d="M 146 334 Q 200 392 254 334 Q 200 358 146 334 Z" fill="#fff" ${K} stroke-width="4"/><circle cx="200" cy="385" r="6" fill="#ffd54f" stroke="${INK}" stroke-width="3"/>`;
    default: return '';
  }
}

function defs(s: AvatarConfig){
  const sk = s.skin, ek = s.eyeColor;
  return `<defs>
<radialGradient id="gs" cx=".42" cy=".36" r=".8"><stop offset="0" stop-color="${mix(sk,'#ffffff',.14)}"/><stop offset=".7" stop-color="${sk}"/><stop offset="1" stop-color="${mix(sk,'#000000',.1)}"/></radialGradient>
<radialGradient id="gi" cx=".5" cy=".35" r=".75"><stop offset="0" stop-color="${mix(ek,'#ffffff',.25)}"/><stop offset="1" stop-color="${mix(ek,'#000000',.3)}"/></radialGradient>
<radialGradient id="gb"><stop offset="0" stop-color="#ff6f8a" stop-opacity=".8"/><stop offset="1" stop-color="#ff6f8a" stop-opacity="0"/></radialGradient>
<linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient>
<linearGradient id="gk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".2"/><stop offset=".3" stop-color="#000" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>
<radialGradient id="gg" cx=".3" cy=".25" r=".9"><stop offset="0" stop-color="${mix(s.bg,'#ffffff',.35)}"/><stop offset="1" stop-color="${s.bg}"/></radialGradient>
<clipPath id="cp"><path d="${BASE}"/></clipPath>
</defs>`;
}
function clean(svg: string, flat: boolean, u: number){
  svg = svg.replace(/id="(cp|fc|cc|gs|gi|gb|gl|gm|gg|gk|gh|gf|gq)"/g, `id="$1${u}"`).replace(/url\(#(cp|fc|cc|gs|gi|gb|gl|gm|gg|gk|gh|gf|gq)\)/g, `url(#$1${u})`);
  return svg.replace(/<[a-zA-Z][^>]*>/g, tag=>{
    if (flat && !tag.includes('data-k')){
      const m = tag.match(/\sfill="([^"]*)"/);
      if (m && m[1] !== 'none') tag = tag.replace(/\s(stroke|stroke-width|stroke-linejoin|stroke-linecap|stroke-opacity)="[^"]*"/g, '');
    }
    const name = tag.match(/^<([\w-]+)/)?.[1] ?? '';
    const end = tag.endsWith('/>') ? '/>' : '>';
    const attrs = new Map<string, string>();
    for (const m of tag.matchAll(/\s([\w:-]+)="([^"]*)"/g)) attrs.set(m[1], m[2]);
    return `<${name}` + [...attrs].map(([k,v])=>` ${k}="${v}"`).join('') + end;
  });
}
export function renderAvatarSvg(s: AvatarConfig, only?: Set<string>){
  const on = (k: string) => !only || only.has(k);
  const flat = s.look === 'flat', circ = s.shape === 'circle';
  setLook(flat);
  const withC = s.cloth !== 'none';
  const fs = faceShape(s);
  // a cabeça é posicionada pelo queixo, então todo rosto deixa o mesmo pedaço de pescoço acima da gola
  const k = s.chibi ? 1.06 : 1, off = s.chibi ? 10 : 0;
  const shift = withC ? Math.round(312 - 240 - off - (fs.chin - 240) * k) : 0;
  const HT = `translate(0 ${shift})` + (s.chibi ? ' translate(0 10) translate(200 240) scale(1.06) translate(-200 -240)' : '');
  // cabelo e acessórios acompanham a largura/altura de cada formato de rosto
  const FT = `translate(200 200) scale(${fs.fit[0]} ${fs.fit[1]}) translate(-200 -200)`;
  const neck = `<rect x="168" y="${fs.chin-70}" width="64" height="130" fill="${mix(s.skin,'#000000',.14)}"/><ellipse cx="200" cy="${fs.chin+4}" rx="32" ry="10" fill="#000" opacity=".14"/>`;
  const clothShade = `<g clip-path="url(#cp)"><rect x="40" y="318" width="320" height="110" fill="url(#gk)"/><ellipse cx="200" cy="334" rx="54" ry="14" fill="#000" opacity=".09"/></g>`;
  const HATS: Record<string, number> = { cap:52, bucket:140, pirate:52, helmet:0, beret:100, chefhat:112, wizard:140 };
  const hat = s.acc in HATS;
  const hs = (hat && ['spiky','messy','mohawk','tuft','ponytop','pixie'].includes(s.hairStyle)) ? 'short' : s.hairStyle;
  const s2 = { ...s, hairStyle: hs };
  const hideBack = (hat && s.acc !== 'helmet' && hs === 'afro') || ((hat || s.acc === 'cat') && ['bun','bunbow','twin','puffs'].includes(hs)) || (['crown','party','flowers'].includes(s.acc) && ['bun','bunbow'].includes(hs));
  let back = hideBack ? '' : hairBack(s2), front = hairFront(s2), hatDef = '';
  if (hat) {
    const area = s.acc === 'helmet' ? '<circle cx="200" cy="205" r="128"/>' : `<rect x="0" y="${HATS[s.acc]}" width="400" height="400"/>`;
    hatDef = `<clipPath id="gq">${area}</clipPath>`;
    back = `<g clip-path="url(#gq)">${back}</g>`;
    front = `<g clip-path="url(#gq)">${front}</g>`;
  }
  const fb = hairFrontBase(s2);
  const shade = (flat && fb) ? `<clipPath id="fc">${fs.svg}</clipPath><clipPath id="gf" transform="translate(0 14) ${FT}">${fb}</clipPath><g clip-path="url(#fc)"><rect clip-path="url(#gf)" x="0" y="0" width="400" height="400" fill="#000" opacity=".1"/></g>` : '';
  const fit = (x: string) => `<g transform="${FT}">${x}</g>`;
  const inner = `<g transform="${HT}">${on('hairBack') ? fit(back) : ''}${withC && on('clothes') ? neck : ''}</g>
${withC && on('clothes') ? `<g transform="translate(0 8)">${clothes(s)}${clothShade}${neckLayer(s)}</g>` : ''}
<g transform="${HT}">${on('face') ? ears(s, fs.earX) + fs.svg + shade + fit(extras(s)) : ''}${on('nose') ? nose(s) : ''}${on('acc') ? fit(maskLayer(s)) : ''}${on('mouth') ? `<g transform="translate(200 272) scale(1.18) translate(-200 -272)">${mouth(s)}</g>` : ''}${on('eyes') ? `<g transform="translate(200 212) scale(1.28) translate(-200 -212)">${eyes(s)}</g>` : ''}${fit(hatDef + (on('hairFront') ? front : '') + (on('acc') ? acc(s) : ''))}</g>`;
  const circleContent = `<clipPath id="cc"><circle cx="200" cy="200" r="200"/></clipPath>${on('bg') ? '<circle cx="200" cy="200" r="200" fill="url(#gg)"/>' : ''}<g clip-path="url(#cc)"><g transform="translate(200 250) scale(1.04) translate(-200 -250)">${inner}</g></g>`;
  const popContent = `<clipPath id="cc"><circle cx="200" cy="232" r="166"/><rect x="0" y="0" width="400" height="232"/></clipPath>${on('bg') ? '<circle cx="200" cy="232" r="166" fill="url(#gg)"/>' : ''}<g clip-path="url(#cc)"><g transform="translate(200 250) scale(.88) translate(-200 -250)">${inner}</g></g>`;
  const content = s.shape === 'pop' ? popContent : circ ? circleContent : `${on('bg') ? '<rect width="400" height="400" fill="url(#gg)"/>' : ''}<g transform="translate(200 262) scale(.94) translate(-200 -262)">${inner}</g>`;
  return clean(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">${defs(s)}${content}</svg>`, flat, ++UID);
}
