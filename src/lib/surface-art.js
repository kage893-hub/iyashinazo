import * as THREE from 'three';
import { MATERIALS_ART, artURL } from '../data/generated-art.js';

const sources = new Map(), tiles = new Map(), textures = new Map();
const common = ['grass', 'gravel', 'woodPlanks', 'agedBoards', 'roofTiles', 'stoneBlocks', 'washi'];
const stageMaterials = {
  station: common, sky: [...common, 'cobblestone', 'plaster'],
  edo: [...common, 'indigoCloth'], port: [...common, 'sand', 'cobblestone', 'plaster'],
  hero: ['heroPixelStone', 'washi'], maou: ['heroPixelStone', 'maouPixelStone', 'washi'],
  onsen: [...common, 'indigoCloth'], kinoko: [...common, 'moss', 'soil'],
  toy: ['paintedToyWood', 'washi'], japan: [...common, 'indigoCloth', 'cobblestone', 'plaster'],
  museum: [...common, 'museumFloor'], saga: [...common, 'cobblestone', 'plaster', 'corrugatedMetal', 'rustedMetal'],
};

function load(id) {
  if (!sources.has(id)) sources.set(id, new Promise(resolve => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // 通信に失敗しても箱庭と謎は起動する。
    img.src = artURL('materials', id);
  }));
  return sources.get(id);
}

export async function prepareStageSurfaces(stage) {
  let timer;
  await Promise.race([
    Promise.all((stageMaterials[stage] || common).map(load)),
    new Promise(resolve => { timer = setTimeout(resolve, 2500); }),
  ]);
  clearTimeout(timer);
}

// 元の模型の色を保ち、凹凸・木目・織り目だけを載せる。材質ごとの色違いは共有する。
function tile(id, img, { base, strength = .8, rotate = false, pixel = false, size = 256 }) {
  const key = JSON.stringify([id, base, strength, rotate, pixel, size]);
  if (tiles.has(key)) return tiles.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = !pixel;
  if (rotate) { ctx.translate(size, 0); ctx.rotate(Math.PI / 2); }
  ctx.drawImage(img, 0, 0, size, size);
  ctx.resetTransform();
  if (base) {
    const data = ctx.getImageData(0, 0, size, size), p = data.data;
    const mean = [0, 0, 0];
    for (let i = 0; i < p.length; i += 4) for (let c = 0; c < 3; c++) mean[c] += p[i + c];
    for (let c = 0; c < 3; c++) mean[c] /= size * size;
    ctx.fillStyle = base;
    // 既存のCanvas素材と同じsRGBで基調色を合わせる。
    ctx.fillRect(0, 0, 1, 1);
    const color = ctx.getImageData(0, 0, 1, 1).data;
    for (let i = 0; i < p.length; i += 4) for (let c = 0; c < 3; c++) {
      p[i + c] = color[c] * (1 + (p[i + c] / Math.max(1, mean[c]) - 1) * strength);
    }
    ctx.putImageData(data, 0, 0);
  }
  tiles.set(key, canvas);
  return canvas;
}

/** 表面画像の上に文字・記号を毎回描き直すので、遅い読み込みでも手がかりは消えない。 */
export function surfaceCanvasTex(id, w, h, draw, options = {}) {
  if (!MATERIALS_ART.has(id)) throw new Error(`Unknown surface: ${id}`);
  const { base = '#ffffff', repeat, pixel = false, strength = .8, rotate = false, size = 256, tiled = false } = options;
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = pixel ? 1 : 4;
  texture.userData.surfaceArt = id;
  if (repeat) {
    texture.wrapS = texture.wrapT = THREE.MirroredRepeatWrapping;
    texture.repeat.set(...repeat);
  }
  if (pixel) {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
  }
  const paint = img => {
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    if (img) {
      const source = tile(id, img, { base, strength, rotate, pixel, size });
      ctx.imageSmoothingEnabled = !pixel;
      if (tiled) { ctx.fillStyle = ctx.createPattern(source, 'repeat'); ctx.fillRect(0, 0, w, h); }
      else ctx.drawImage(source, 0, 0, w, h);
      texture.userData.surfaceArtLoaded = true;
    }
    ctx.save();
    draw?.(ctx, w, h);
    ctx.restore();
    texture.needsUpdate = true;
  };
  paint(null);
  load(id).then(paint);
  return texture;
}

/** 同じ色・縮尺の面はテクスチャを共有し、静的メッシュの結合と描画数を保つ。 */
export function surfaceTex(id, options = {}) {
  const key = JSON.stringify([id, options]);
  if (!textures.has(key)) textures.set(key, surfaceCanvasTex(id, options.size || 256, options.size || 256, null, options));
  return textures.get(key);
}
