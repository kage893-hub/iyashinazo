// ---------------------------------------------------------------
// DOM の UI：会話ウィンドウ・持ち物・目的・パネル・トースト
// ---------------------------------------------------------------

const $ = (sel) => document.querySelector(sel);

export function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

export class UI {
  constructor(audio) {
    this.audio = audio;
    this.speakers = {};
    this.dialogueActive = false;
    this.onLine = null; // (who) => void
    this.dlg = $('#dialogue');
    this.dlgName = this.dlg.querySelector('.dlg-name');
    this.dlgText = this.dlg.querySelector('.dlg-text');
    this.tooltip = $('#tooltip');
    this.cursorItem = $('#cursor-item');
    this.inventoryEl = $('#inventory');
    this.questsEl = $('#quests');
    this.panelLayer = $('#panel-layer');
    this.toastsEl = $('#toasts');
    this.fadeEl = $('#fade');
    this.panels = [];
    this.questsCollapsed = window.innerWidth < 700;
    this.questsEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.questsCollapsed = !this.questsCollapsed;
      this.questsEl.classList.toggle('collapsed', this.questsCollapsed);
    });

    this.dlg.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.advance();
    });
    window.addEventListener('keydown', (e) => {
      if (!this.dialogueActive) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'z') {
        e.preventDefault();
        this.advance();
      }
    });
    window.addEventListener('pointermove', (e) => {
      this.mouseX = e.clientX; this.mouseY = e.clientY;
      if (this.cursorItem.classList.contains('show')) {
        this.cursorItem.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 14}px)`;
      }
    });
  }

  setSpeakers(map) { this.speakers = map; }

  // ---------------- 会話 ----------------
  /**
   * lines: Array<string | {who, text}>
   * who が無いものはナレーション
   */
  say(lines) {
    if (!Array.isArray(lines)) lines = [lines];
    lines = lines.map((l) => (typeof l === 'string' ? { text: l } : l));
    return new Promise((resolve) => {
      this._queue = lines;
      this._resolve = resolve;
      this._idx = -1;
      this.dialogueActive = true;
      this.dlg.classList.remove('hidden');
      requestAnimationFrame(() => this.dlg.classList.add('show'));
      this._next();
    });
  }

  _next() {
    this._idx++;
    if (this._idx >= this._queue.length) {
      this.dialogueActive = false;
      this.dlg.classList.remove('show');
      clearInterval(this._typer);
      setTimeout(() => { if (!this.dialogueActive) this.dlg.classList.add('hidden'); }, 200);
      const r = this._resolve;
      this._resolve = null;
      r && r();
      return;
    }
    const line = this._queue[this._idx];
    const sp = line.who ? this.speakers[line.who] || { name: line.who } : null;
    this.dlg.classList.toggle('narration', !sp);
    this.dlg.classList.toggle('hint', line.who === 'hint');
    if (sp) {
      this.dlgName.innerHTML = `<span class="dlg-icon">${sp.icon || ''}</span>${sp.name}`;
      this.dlgName.style.setProperty('--c', sp.color || '#6b4a2e');
      this.dlgName.style.display = '';
    } else {
      this.dlgName.style.display = 'none';
    }
    if (this.onLine) this.onLine(line.who);
    this._full = line.text;
    this._pos = 0;
    this._typing = true;
    this.dlgText.innerHTML = '';
    clearInterval(this._typer);
    const voice = sp && sp.voice;
    this._typer = setInterval(() => {
      this._pos++;
      this.dlgText.innerHTML = this._render(this._full.slice(0, this._pos));
      if (voice && this._pos % 3 === 1 && !/[\s…、。！？]/.test(this._full[this._pos - 1])) this.audio.blip(voice);
      if (this._pos >= this._full.length) {
        clearInterval(this._typer);
        this._typing = false;
      }
    }, 28);
  }

  _render(s) {
    // 【強調】を色付きに
    return s
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/【([^】]*)】?/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  advance() {
    if (!this.dialogueActive) return;
    if (this._typing) {
      clearInterval(this._typer);
      this._typing = false;
      this.dlgText.innerHTML = this._render(this._full);
      return;
    }
    this.audio.play('click');
    this._next();
  }

  // ---------------- 選択肢 ----------------
  choose(question, options) {
    return new Promise((resolve) => {
      const body = el('div', 'choice');
      if (question) body.appendChild(el('p', 'choice-q', question));
      let panel;
      options.forEach((opt, i) => {
        const b = el('button', 'btn', opt);
        b.onclick = () => { this.audio.play('click'); panel.close(); resolve(i); };
        body.appendChild(b);
      });
      panel = this.openPanel({ title: '', body, closable: false, cls: 'small' });
    });
  }

  // ---------------- ツールチップ ----------------
  showTooltip(text, x, y) {
    this.tooltip.textContent = text;
    this.tooltip.style.transform = `translate(${x + 16}px, ${y - 10}px)`;
    this.tooltip.classList.add('show');
  }
  hideTooltip() { this.tooltip.classList.remove('show'); }

  // ---------------- 持ち物 ----------------
  renderInventory(items, defs, selected, onClick, counts = {}) {
    this.inventoryEl.innerHTML = '';
    const label = el('div', 'inv-label', '持ち物');
    this.inventoryEl.appendChild(label);
    const row = el('div', 'inv-row');
    const n = Math.max(6, items.length);
    for (let i = 0; i < n; i++) {
      const id = items[i];
      const slot = el('button', 'inv-slot');
      if (id) {
        const d = defs[id];
        const n = d.stack && counts[id] > 1 ? `<span class="inv-count">×${counts[id]}</span>` : '';
        slot.innerHTML = `<span class="inv-icon">${d.icon}</span><span class="inv-name">${d.name}</span>${n}`;
        if (id === selected) slot.classList.add('selected');
        slot.onclick = (e) => { e.stopPropagation(); onClick(id); };
        slot.title = d.name;
      } else {
        slot.classList.add('empty');
        slot.disabled = true;
      }
      row.appendChild(slot);
    }
    this.inventoryEl.appendChild(row);
    if (selected) {
      this.cursorItem.innerHTML = defs[selected].icon;
      this.cursorItem.classList.add('show');
      this.cursorItem.style.transform = `translate(${(this.mouseX || 0) + 14}px, ${(this.mouseY || 0) + 14}px)`;
    } else {
      this.cursorItem.classList.remove('show');
    }
  }

  flashItem(id) {
    const slots = this.inventoryEl.querySelectorAll('.inv-slot');
    slots.forEach((s) => {
      if (s.title && s.querySelector('.inv-name')?.textContent === id) s.classList.add('flash');
    });
  }

  /** アイテム入手の演出 */
  showItemGet(def, count = 0) {
    const c = count ? `（${count}${def.stackMax ? '/' + def.stackMax : ''}）` : '';
    const pop = el('div', 'item-get', `<div class="ig-icon">${def.icon}</div><div class="ig-text"><b>${def.name}</b> を手に入れた！${c}</div>`);
    document.body.appendChild(pop);
    requestAnimationFrame(() => pop.classList.add('show'));
    setTimeout(() => { pop.classList.remove('show'); setTimeout(() => pop.remove(), 500); }, 1900);
  }

  // ---------------- 目的 ----------------
  renderQuests(title, quests) {
    if (!quests || !quests.length) {
      this.questsEl.classList.add('hidden');
      return;
    }
    this.questsEl.classList.remove('hidden');
    this.questsEl.classList.toggle('collapsed', this.questsCollapsed);
    const main = quests.filter((q) => !q.sub);
    const done = main.filter((q) => q.done).length;
    this.questsEl.innerHTML = `<div class="q-title">${title}<span class="q-count">${done}/${main.length}</span><span class="q-toggle">▾</span></div>` +
      quests.map((q) => `<div class="q-item ${q.done ? 'done' : ''} ${q.sub ? 'sub' : ''}"><span class="q-box">${q.done ? '✓' : ''}</span>${q.text}</div>`).join('');
  }

  // ---------------- パネル ----------------
  openPanel({ title = '', body, closable = true, cls = '', onClose }) {
    const wrap = el('div', 'panel-wrap');
    const panel = el('div', `panel ${cls}`);
    if (title) panel.appendChild(el('div', 'panel-title', title));
    const content = el('div', 'panel-body');
    if (typeof body === 'string') content.innerHTML = body;
    else if (body) content.appendChild(body);
    panel.appendChild(content);
    let closed = false;
    const api = {
      root: panel,
      body: content,
      close: () => {
        if (closed) return;
        closed = true;
        wrap.classList.remove('show');
        setTimeout(() => wrap.remove(), 250);
        this.panels = this.panels.filter((p) => p !== api);
        onClose && onClose();
      },
    };
    if (closable) {
      const x = el('button', 'panel-close', '✕');
      x.onclick = () => { this.audio.play('close'); api.close(); };
      panel.appendChild(x);
      wrap.addEventListener('pointerdown', (e) => {
        if (e.target === wrap) { this.audio.play('close'); api.close(); }
      });
    }
    wrap.appendChild(panel);
    this.panelLayer.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('show'));
    this.panels.push(api);
    this.audio.play('open');
    return api;
  }

  get panelOpen() { return this.panels.length > 0; }

  closeAllPanels() { [...this.panels].forEach((p) => p.close()); }

  // ---------------- トースト ----------------
  /** アイテムを選んでいるあいだ、持ち物の上に出しておく案内 */
  setUseBanner(def, onCancel) {
    if (!this.useBanner) {
      this.useBanner = el('div', 'use-banner');
      document.body.appendChild(this.useBanner);
    }
    const b = this.useBanner;
    if (!def) { b.classList.remove('show'); return; }
    b.innerHTML = `<span class="ub-icon">${def.icon}</span><span class="ub-text"><b>${def.name}</b> をどこに使う？</span><button class="ub-cancel">やめる</button>`;
    b.querySelector('.ub-cancel').onclick = (e) => { e.stopPropagation(); this.audio.play('click'); onCancel(); };
    b.classList.add('show');
  }

  toast(text, ms = 2200) {
    const t = el('div', 'toast', text);
    this.toastsEl.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, ms);
  }

  // ---------------- フェード ----------------
  fade(to, sec = 0.8, color = '#000') {
    this.fadeEl.style.background = color;
    this.fadeEl.style.transition = `opacity ${sec}s ease`;
    this.fadeEl.style.pointerEvents = to > 0 ? 'auto' : 'none';
    requestAnimationFrame(() => { this.fadeEl.style.opacity = to; });
    return new Promise((r) => setTimeout(r, sec * 1000 + 30));
  }

  /** 画面中央の大きなタイトル表示 */
  banner(main, sub, ms = 2600) {
    const b = el('div', 'banner', `<div class="banner-sub">${sub || ''}</div><div class="banner-main">${main}</div>`);
    document.body.appendChild(b);
    requestAnimationFrame(() => b.classList.add('show'));
    return new Promise((r) => setTimeout(() => {
      b.classList.remove('show');
      setTimeout(() => { b.remove(); r(); }, 700);
    }, ms));
  }
}
