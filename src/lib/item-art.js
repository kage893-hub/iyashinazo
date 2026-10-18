import { ITEMS_ART, artURL } from '../data/generated-art.js';

/** 薬のセットも一つの持ち物のまま、個別の画像3枚を並べて見せる。 */
export function itemArt(id, fallback) {
  const ids = id === 'potions' ? ['potions-healing', 'potions-antidote', 'potions-energy'] : [id];
  if (!ids.every(key => ITEMS_ART.has(key))) return fallback;
  return `<span class="item-art${ids.length > 1 ? ' item-art-set' : ''}" aria-hidden="true"><span class="item-art-fallback">${fallback}</span><span class="item-art-images">${ids.map(key => `<img data-item-art src="${artURL('items', key)}" alt="" width="320" height="320" decoding="async" draggable="false">`).join('')}</span></span>`;
}

let installed = false;
export function installItemArt() {
  if (installed) return;
  installed = true;
  // load/error はバブルしないので捕捉する。キャッシュ済み画像にも同じ経路を使う。
  const update = ({ target }) => {
    if (!target.matches?.('img[data-item-art]')) return;
    const root = target.closest('.item-art');
    if (root) root.classList.toggle('art-ready', [...root.querySelectorAll('img')].every(img => img.complete && img.naturalWidth > 0));
  };
  document.addEventListener('load', update, true);
  document.addEventListener('error', update, true);
}
