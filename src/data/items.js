// アイテム定義（アイコンはインライン SVG）
const svg = (inner) => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

export const ITEMS = {
  marble: {
    name: 'ビー玉',
    desc: '透きとおった青いビー玉。中で小さな光がくるくる回っている。',
    icon: svg(`
      <defs><radialGradient id="mg" cx="40%" cy="35%" r="70%">
        <stop offset="0" stop-color="#e6fbff"/><stop offset=".45" stop-color="#5fc6e8"/><stop offset="1" stop-color="#1d5f8f"/></radialGradient></defs>
      <circle cx="32" cy="34" r="20" fill="url(#mg)" stroke="#164a6e" stroke-width="2"/>
      <path d="M22 38c6-10 14-2 20-10" stroke="#fff6b0" stroke-width="3" fill="none" stroke-linecap="round"/>
      <ellipse cx="25" cy="25" rx="6" ry="4" fill="#fff" opacity=".85"/>`),
  },
  springKey: {
    name: 'ゼンマイ鍵',
    desc: '蝶の羽のような形をした真鍮の鍵。時計のゼンマイを巻くためのもの。',
    icon: svg(`
      <g fill="#e2b54a" stroke="#7a5414" stroke-width="2.5" stroke-linejoin="round">
        <path d="M32 30 C16 14 6 22 10 32 C6 42 16 50 32 34 Z"/>
        <path d="M32 30 C48 14 58 22 54 32 C58 42 48 50 32 34 Z"/>
        <rect x="28" y="30" width="8" height="26" rx="3"/>
      </g>
      <circle cx="18" cy="32" r="4" fill="#7a5414"/><circle cx="46" cy="32" r="4" fill="#7a5414"/>`),
  },
  brooch: {
    name: '月のブローチ',
    desc: '三日月の形をした金のブローチ。ほんのり冷たく光っている。',
    icon: svg(`
      <path d="M40 8a24 24 0 1 0 16 40A20 20 0 1 1 40 8z" fill="#f2d36b" stroke="#8a6416" stroke-width="2.5"/>
      <circle cx="30" cy="36" r="5" fill="#7fd0ff" stroke="#2b6c9a" stroke-width="2"/>
      <circle cx="28.5" cy="34.5" r="1.6" fill="#fff"/>`),
  },
  starCoin: {
    name: '星の硬貨',
    desc: '星の模様が刻まれた金貨。異世界の旅で使われるお金らしい。',
    icon: svg(`
      <circle cx="32" cy="32" r="24" fill="#f4c94a" stroke="#8d6312" stroke-width="3"/>
      <circle cx="32" cy="32" r="18" fill="none" stroke="#c9952a" stroke-width="2"/>
      <path d="M32 17l4.4 9.4 10.2 1.2-7.6 7 2 10.1L32 39.6l-9 5.1 2-10.1-7.6-7 10.2-1.2z" fill="#fff3b8" stroke="#a87918" stroke-width="1.5" stroke-linejoin="round"/>`),
  },
  ticket: {
    name: '天空の街ゆき切符',
    desc: '「はざま → 天空の街」と書かれた硬い紙の切符。改札のパンチ穴は星形。',
    icon: svg(`
      <rect x="6" y="16" width="52" height="32" rx="4" fill="#f6ecd2" stroke="#7b5a32" stroke-width="2.5"/>
      <rect x="11" y="21" width="42" height="22" rx="2" fill="none" stroke="#c8a36a" stroke-width="1.5" stroke-dasharray="3 2"/>
      <text x="32" y="31" font-size="8" text-anchor="middle" fill="#4a3a2a" font-weight="700">はざま→</text>
      <text x="32" y="41" font-size="8" text-anchor="middle" fill="#3a5a8a" font-weight="700">天空の街</text>
      <path d="M50 22l1.3 2.7 3 .4-2.2 2 .6 3-2.7-1.5-2.7 1.5.6-3-2.2-2 3-.4z" fill="#3a5a8a"/>`),
  },
  tongs: {
    name: '火ばさみ',
    desc: '長い鉄の火ばさみ。熱いものでも平気でつかめる。',
    icon: svg(`
      <g stroke="#3d3d48" stroke-width="5" stroke-linecap="round" fill="none">
        <path d="M14 54 L44 14"/><path d="M22 56 L48 18"/>
      </g>
      <circle cx="15" cy="55" r="6" fill="none" stroke="#8a5a3a" stroke-width="4"/>
      <path d="M44 14 l6 -4 M48 18 l6 -2" stroke="#3d3d48" stroke-width="4" stroke-linecap="round"/>`),
  },
  fireStone: {
    name: 'ほのお石',
    desc: '内側から赤く燃えている不思議な石。機関車のボイラーに火を入れるのに使う。',
    icon: svg(`
      <defs><radialGradient id="fg" cx="50%" cy="60%" r="60%">
        <stop offset="0" stop-color="#fff2a8"/><stop offset=".4" stop-color="#ff9a3a"/><stop offset="1" stop-color="#b8321e"/></radialGradient></defs>
      <path d="M32 8c4 8 14 12 14 26a14 14 0 0 1-28 0c0-6 3-10 6-13 0 5 2 8 5 9-1-9 1-16 3-22z" fill="#ffb347" opacity=".55"/>
      <path d="M18 40l6-14 14-4 10 10-2 14-14 6z" fill="url(#fg)" stroke="#7a2412" stroke-width="2.5" stroke-linejoin="round"/>`),
  },
  valveHandle: {
    name: 'バルブハンドル',
    desc: '赤く塗られた丸いハンドル。給水塔のバルブのものらしい。',
    icon: svg(`
      <circle cx="32" cy="32" r="20" fill="none" stroke="#c43a2e" stroke-width="6"/>
      <g stroke="#c43a2e" stroke-width="5" stroke-linecap="round">
        <path d="M32 14v36"/><path d="M14 32h36"/><path d="M19 19l26 26"/><path d="M45 19L19 45"/></g>
      <circle cx="32" cy="32" r="6" fill="#8a8f99" stroke="#3a3d45" stroke-width="2"/>`),
  },
  signalKey: {
    name: '信号所の鍵',
    desc: '銀色の大きな鍵。札に「信号所」と書いてある。',
    icon: svg(`
      <circle cx="18" cy="24" r="10" fill="none" stroke="#b8c2cc" stroke-width="6"/>
      <path d="M26 30 L52 50" stroke="#b8c2cc" stroke-width="6" stroke-linecap="round"/>
      <path d="M44 44l-5 6M50 48l-4 5" stroke="#b8c2cc" stroke-width="5" stroke-linecap="round"/>
      <rect x="34" y="8" width="22" height="14" rx="2" fill="#e8d8a8" stroke="#7b5a32" stroke-width="2" transform="rotate(12 45 15)"/>
      <path d="M18 24 L36 14" stroke="#7b5a32" stroke-width="1.5"/>`),
  },

  // ---------------- STAGE 2：天空の街 ----------------
  konpeito: {
    name: '星のこんぺいとう',
    desc: '天空の街のおみやげ。星のかけらのように甘くて、空の生きものの大好物らしい。',
    icon: svg(`
      <path d="M14 30 Q32 58 50 30 Z" fill="#c9e4ff" stroke="#5a7ac8" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M14 30 Q32 22 50 30" fill="none" stroke="#5a7ac8" stroke-width="2.5"/>
      <path d="M20 16 l12 10 l12 -10" fill="none" stroke="#d84a5a" stroke-width="3" stroke-linecap="round"/>
      <g stroke="#7a5a2a" stroke-width="1.2">
        <path d="M24 28l2.5-3 3 2.5-1 3.5-3.5.5z" fill="#ffd36a"/>
        <path d="M33 26l3-2 2.5 3-2 3-3.5-.5z" fill="#ff9ac0"/>
        <path d="M40 30l2.5-2.5 2.5 2.5-1.5 3-3-.5z" fill="#9fe0ff"/>
        <path d="M29 33l3-1.5 2 3-2.5 2.5-3-1.5z" fill="#c8f0a0"/>
      </g>`),
  },
  oilCan: {
    name: '油さし',
    desc: 'カエルの機関士の油さし。さびついたものも、これでなめらかに動く。',
    icon: svg(`
      <path d="M16 30 h24 v20 a4 4 0 0 1-4 4 H20 a4 4 0 0 1-4-4z" fill="#d8b04a" stroke="#7a5a14" stroke-width="2.5"/>
      <path d="M22 30 q6-10 12 0" fill="none" stroke="#7a5a14" stroke-width="3"/>
      <path d="M40 36 L58 18" stroke="#7a5a14" stroke-width="4" stroke-linecap="round"/>
      <circle cx="59" cy="16" r="2.5" fill="#3a2a1a"/>
      <path d="M8 34 q-2 8 4 10" fill="none" stroke="#7a5a14" stroke-width="3"/>`),
  },
  cotton: {
    name: '雲のわた',
    desc: 'ふわふわの雲のかたまり。3つ集めると、アルパカが布に織ってくれる。',
    stack: true,
    stackMax: 3,
    icon: svg(`
      <g fill="#ffffff" stroke="#9ab0d8" stroke-width="2.5">
        <circle cx="22" cy="36" r="11"/><circle cx="34" cy="28" r="13"/><circle cx="45" cy="37" r="10"/>
      </g>
      <path d="M14 40 h38" stroke="#ffffff" stroke-width="10" stroke-linecap="round"/>
      <circle cx="30" cy="24" r="3" fill="#eef4ff"/>`),
  },
  sail: {
    name: '雲の帆',
    desc: 'アルパカが織った、雲の糸の帆布。風車の羽根に張ることができる。',
    icon: svg(`
      <path d="M14 10 L50 14 L46 54 L10 50 Z" fill="#f7f2e6" stroke="#8a7a5a" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M13 20 L49 24 M12 30 L48 34 M11 40 L47 44" stroke="#c8d8f0" stroke-width="2"/>
      <circle cx="14" cy="10" r="3" fill="#8a7a5a"/><circle cx="50" cy="14" r="3" fill="#8a7a5a"/>`),
  },
  letter: {
    name: '風に飛ばされた手紙',
    desc: '星の切手がはられた封筒。「時計台のカメさんへ」と書いてある。',
    icon: svg(`
      <rect x="8" y="16" width="48" height="32" rx="3" fill="#fbf6ea" stroke="#8a6a4a" stroke-width="2.5"/>
      <path d="M8 18 L32 36 L56 18" fill="none" stroke="#8a6a4a" stroke-width="2.5"/>
      <circle cx="32" cy="36" r="5" fill="#d84a3a"/>
      <rect x="44" y="20" width="8" height="9" fill="#9fd0ff" stroke="#5a7ac8" stroke-width="1"/>`),
  },
  letterOpen: {
    name: '孫からの手紙',
    desc: '「おじいちゃん、宝箱は『そらのうた』の順に鈴を鳴らすとひらくよ。そらのうた：☾ ★ ☁ ☀ ☁ ★」',
    icon: svg(`
      <rect x="12" y="8" width="40" height="50" rx="3" fill="#fbf6ea" stroke="#8a6a4a" stroke-width="2.5"/>
      <g font-size="10" text-anchor="middle" font-weight="700">
        <text x="22" y="26" fill="#3a6ac8">☾</text><text x="32" y="26" fill="#c9952a">★</text><text x="42" y="26" fill="#8a9ab0">☁</text>
        <text x="22" y="40" fill="#d84a3a">☀</text><text x="32" y="40" fill="#8a9ab0">☁</text><text x="42" y="40" fill="#c9952a">★</text>
      </g>
      <path d="M18 48 h28" stroke="#c8b08a" stroke-width="2"/>`),
  },
  gear: {
    name: '風車の歯車',
    desc: '大風車の予備の歯車。ずっしり重い金色の歯車だ。',
    icon: svg(`
      <g fill="#e2b54a" stroke="#7a5414" stroke-width="2.5" stroke-linejoin="round">
        <path d="M32 6l4 7 8-2 1 8 8 2-3 7 6 5-6 5 3 7-8 2-1 8-8-2-4 7-4-7-8 2-1-8-8-2 3-7-6-5 6-5-3-7 8-2 1-8 8 2z"/>
      </g>
      <circle cx="32" cy="32" r="9" fill="#fff3c8" stroke="#7a5414" stroke-width="2.5"/>`),
  },

  // ---------------- STAGE 3：寂れた温泉街 ----------------
  lantern: {
    name: '手さげ提灯',
    desc: 'キツネの提灯屋の手さげ提灯。中のろうそくに火はついていない。',
    icon: svg(`
      <path d="M32 6v8" stroke="#3a2418" stroke-width="3"/>
      <rect x="20" y="13" width="24" height="6" rx="2" fill="#2a1a14"/>
      <rect x="20" y="49" width="24" height="6" rx="2" fill="#2a1a14"/>
      <ellipse cx="32" cy="34" rx="16" ry="17" fill="#e8dcc4" stroke="#8a5a3a" stroke-width="2"/>
      <path d="M17 28h30M16 34h32M17 40h30" stroke="#b89a7a" stroke-width="1.5"/>`),
  },
  lanternLit: {
    name: '灯った提灯',
    desc: '釜場の残り火をうつした提灯。あたたかい光がゆれている。',
    icon: svg(`
      <circle cx="32" cy="34" r="26" fill="#ffd27a" opacity=".35"/>
      <path d="M32 6v8" stroke="#3a2418" stroke-width="3"/>
      <rect x="20" y="13" width="24" height="6" rx="2" fill="#2a1a14"/>
      <rect x="20" y="49" width="24" height="6" rx="2" fill="#2a1a14"/>
      <ellipse cx="32" cy="34" rx="16" ry="17" fill="#ffb050" stroke="#c8582e" stroke-width="2"/>
      <path d="M17 28h30M16 34h32M17 40h30" stroke="#e8823a" stroke-width="1.5"/>
      <path d="M32 26c3 4 4 7 0 11-4-4-3-7 0-11z" fill="#fff4b0"/>`),
  },
  poker: {
    name: '火かき棒',
    desc: '囲炉裏の灰をかく鉄の棒。奥のほうの残り火も、かき出せそう。',
    icon: svg(`
      <path d="M12 54 L50 12" stroke="#3d3d48" stroke-width="5" stroke-linecap="round"/>
      <path d="M50 12 l6 4" stroke="#3d3d48" stroke-width="5" stroke-linecap="round"/>
      <circle cx="11" cy="55" r="6" fill="none" stroke="#3d3d48" stroke-width="4"/>`),
  },
  amazake: {
    name: 'あったか甘酒',
    desc: 'タヌキの番頭が温めてくれた甘酒。湯気がほわほわ立っている。',
    icon: svg(`
      <path d="M22 18c-2-5 2-8 0-12M32 18c-2-5 2-8 0-12M42 18c-2-5 2-8 0-12" stroke="#c8c8d8" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M14 24h36l-4 26a6 6 0 0 1-6 5H24a6 6 0 0 1-6-5z" fill="#f4f0e6" stroke="#5a7ab8" stroke-width="3"/>
      <path d="M17 30h30" stroke="#5a7ab8" stroke-width="2"/>
      <ellipse cx="32" cy="25" rx="16" ry="3" fill="#fbf6ea"/>`),
  },
  gateKey: {
    name: '源泉の門の鍵',
    desc: 'サルの顔の形をした古い鍵。持ち手に「源泉」と彫ってある。',
    icon: svg(`
      <circle cx="20" cy="22" r="13" fill="#d8b04a" stroke="#7a5a14" stroke-width="3"/>
      <circle cx="20" cy="22" r="8" fill="#e88a8a"/>
      <circle cx="17" cy="20" r="1.6" fill="#2a1a14"/><circle cx="23" cy="20" r="1.6" fill="#2a1a14"/>
      <path d="M30 30 L54 54" stroke="#d8b04a" stroke-width="6" stroke-linecap="round"/>
      <path d="M46 46l-5 6M52 52l-4 5" stroke="#d8b04a" stroke-width="5" stroke-linecap="round"/>`),
  },
  masu: {
    name: '三合升',
    desc: '湯を量るための木の升。三合入る。',
    icon: svg(`
      <path d="M12 22 L32 14 L52 22 L32 30 Z" fill="#e8c890" stroke="#8a6a3a" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M12 22 v20 l20 10 v-22 z" fill="#d8b070" stroke="#8a6a3a" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M52 22 v20 l-20 10 v-22 z" fill="#c89a5a" stroke="#8a6a3a" stroke-width="2.5" stroke-linejoin="round"/>
      <text x="22" y="44" font-size="10" font-weight="900" fill="#5a3a1a">三</text>`),
  },
  // ---- 江戸の宿場町 ----
  kawaraban: {
    name: '瓦版',
    desc: 'ネコの瓦版屋が刷った、けさの瓦版。もう一度押すと読める。',
    icon: svg(`
      <path d="M12 10 h40 v44 h-40 z" fill="#f4ead2" stroke="#6a4a2a" stroke-width="2.5"/>
      <path d="M18 18 h28 M18 24 h28 M18 30 h16" stroke="#3a2418" stroke-width="2.5"/>
      <circle cx="40" cy="40" r="8" fill="none" stroke="#c8382e" stroke-width="3"/>
      <path d="M18 38 h14 M18 44 h14" stroke="#3a2418" stroke-width="2"/>`),
  },
  cucumber: {
    name: 'キュウリ',
    desc: '井戸の桶で冷やしてあった、みずみずしいキュウリ。',
    icon: svg(`
      <path d="M14 46 C20 26 36 12 52 14 C50 30 34 46 14 46 Z" fill="#4a9a3a" stroke="#2a5a1a" stroke-width="2.5"/>
      <path d="M22 38 l2 2 M30 30 l2 2 M38 22 l2 2 M28 38 l2 2 M36 30 l2 2" stroke="#9ad87a" stroke-width="2" stroke-linecap="round"/>
      <path d="M52 14 l5 -4" stroke="#e8c84a" stroke-width="3" stroke-linecap="round"/>`),
  },
  rope: {
    name: '舫い綱',
    desc: 'カッパの渡し舟の、予備のじょうぶな綱。',
    icon: svg(`
      <ellipse cx="32" cy="34" rx="20" ry="14" fill="none" stroke="#c8a060" stroke-width="7"/>
      <ellipse cx="32" cy="34" rx="20" ry="14" fill="none" stroke="#8a6a3a" stroke-width="2" stroke-dasharray="4 4"/>
      <path d="M46 44 q8 6 10 14" stroke="#c8a060" stroke-width="6" stroke-linecap="round" fill="none"/>`),
  },
  dango: {
    name: 'みたらし団子',
    desc: 'リスの団子屋の、焼きたてのみたらし団子。',
    icon: svg(`
      <path d="M14 54 L50 12" stroke="#c8a070" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="22" cy="44" r="8" fill="#e8b860" stroke="#8a5a2a" stroke-width="2.5"/>
      <circle cx="32" cy="32" r="8" fill="#e8b860" stroke="#8a5a2a" stroke-width="2.5"/>
      <circle cx="42" cy="20" r="8" fill="#e8b860" stroke="#8a5a2a" stroke-width="2.5"/>
      <path d="M16 40 q6 -4 12 2 M26 28 q6 -4 12 2 M36 16 q6 -4 12 2" stroke="#a8641e" stroke-width="3" fill="none"/>`),
  },
  jitte: {
    name: '十手',
    desc: '岡っ引きの親分の十手。川の底から見つかった。',
    icon: svg(`
      <path d="M20 56 L44 10" stroke="#9aa4b0" stroke-width="6" stroke-linecap="round"/>
      <path d="M34 30 l10 2 l2 -8" stroke="#9aa4b0" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M17 54 L23 44" stroke="#3a2418" stroke-width="8" stroke-linecap="round"/>
      <path d="M18 58 q-6 2 -8 -4" stroke="#c8382e" stroke-width="3" fill="none"/>`),
  },
  tegata: {
    name: '通行手形',
    desc: '「ほしまわり号　通行をゆるす」と書かれた手形。岡っ引きの判がおしてある。',
    icon: svg(`
      <path d="M18 8 h28 v48 h-28 z" fill="#f4e6c4" stroke="#6a4a2a" stroke-width="2.5"/>
      <path d="M32 14 v26" stroke="#2a1a14" stroke-width="3"/>
      <path d="M26 18 h12 M26 26 h12" stroke="#2a1a14" stroke-width="2"/>
      <rect x="25" y="42" width="14" height="10" rx="2" fill="#c8382e"/>`),
  },
  // ---- 潮の港町 ----
  moonGear: {
    name: '月の歯車',
    desc: '金色の歯車。歯の数は二十八。まん中に三日月の穴があいている。潮時計の部品らしい。',
    icon: svg(`
      <g fill="#e0b84a" stroke="#8a6416" stroke-width="2">
        <path d="M32 6 l4 6 h-8 z M32 58 l4 -6 h-8 z M6 32 l6 4 v-8 z M58 32 l-6 4 v-8 z M13 13 l7 2 l-5 5 z M51 51 l-7 -2 l5 -5 z M51 13 l-2 7 l-5 -5 z M13 51 l2 -7 l5 5 z"/>
        <circle cx="32" cy="32" r="20"/></g>
      <path d="M36 22a10 10 0 1 0 0 20a8 8 0 1 1 0 -20z" fill="#2a3a6a"/>`),
  },
  parcel: {
    name: '灯台あての小包',
    desc: '宛名がにじんだ小包。やわらかくて、ほんのり油のにおい。中身は灯台のランプの芯らしい。',
    icon: svg(`
      <rect x="10" y="18" width="44" height="34" rx="3" fill="#d8b070" stroke="#7a5a2a" stroke-width="2.5"/>
      <path d="M32 18 v34 M10 30 h44" stroke="#f4f0e0" stroke-width="4"/>
      <path d="M24 12 q8 6 16 0" stroke="#f4f0e0" stroke-width="3" fill="none"/>
      <path d="M38 38 q4 -8 8 0" stroke="#5a7aa8" stroke-width="2" fill="none" opacity=".7"/>`),
  },
  net: {
    name: '漁網',
    desc: 'カニの漁師の網。黄色い浮き玉がついている。岩山の洞窟にひっかかっていた。',
    icon: svg(`
      <path d="M8 16 Q32 4 56 16 L50 52 Q32 60 14 52 Z" fill="#6a9a7a" stroke="#3a5a4a" stroke-width="2.5"/>
      <path d="M14 22 L48 50 M24 14 L54 40 M50 22 L16 50 M40 14 L10 40" stroke="#3a5a4a" stroke-width="1.5"/>
      <circle cx="16" cy="18" r="5" fill="#f0c840" stroke="#8a6a1a" stroke-width="1.5"/>
      <circle cx="48" cy="18" r="5" fill="#f0c840" stroke="#8a6a1a" stroke-width="1.5"/>`),
  },
  fish: {
    name: '朝どれのアジ',
    desc: 'カニの漁師がとってきた、ぴちぴちのアジ。',
    icon: svg(`
      <path d="M8 32 Q24 14 44 26 L56 16 L54 32 L56 48 L44 38 Q24 50 8 32 Z" fill="#9ab4cc" stroke="#3a5a7a" stroke-width="2.5" stroke-linejoin="round"/>
      <circle cx="18" cy="29" r="3" fill="#1a2a3a"/>
      <path d="M26 34 q8 2 16 -2" stroke="#e8f0f8" stroke-width="2" fill="none"/>`),
  },
  oil: {
    name: '灯台の油',
    desc: '灯台のランプに入れる、すきとおった油の小びん。',
    icon: svg(`
      <path d="M26 8 h12 v8 l6 6 v30 a4 4 0 0 1 -4 4 h-16 a4 4 0 0 1 -4 -4 v-30 l6 -6 z" fill="#f4dc8a" stroke="#8a6a2a" stroke-width="2.5" stroke-linejoin="round"/>
      <rect x="24" y="4" width="16" height="6" rx="2" fill="#8a5a3a"/>
      <path d="M22 34 h20 v16 h-20 z" fill="#e8b840" opacity=".7"/>
      <path d="M28 26 q4 -6 8 0 q-4 6 -8 0" fill="#fff4c0"/>`),
  },
  // ---- 勇者の城下町 ----
  maletter: {
    name: '魔界の手紙',
    desc: '「魔」の封ろうのむらさきの手紙。星をつないだような文字で書かれている。もう一度押すと読める。',
    icon: svg(`
      <rect x="8" y="16" width="48" height="34" rx="3" fill="#6a3a8a" stroke="#2a1a3a" stroke-width="2.5"/>
      <path d="M8 18 L32 36 L56 18" fill="none" stroke="#2a1a3a" stroke-width="2.5"/>
      <circle cx="32" cy="36" r="7" fill="#c8303a" stroke="#6a1a1a" stroke-width="2"/>
      <text x="32" y="40" font-size="9" text-anchor="middle" fill="#f8e0a0" font-weight="900">魔</text>`),
  },
  moonflower: {
    name: '月光草',
    desc: '月の光でひらく、白く光る花。薬の材料になる。',
    icon: svg(`
      <path d="M32 58 V30" stroke="#3a7a3a" stroke-width="4"/>
      <path d="M32 46 q-12 -2 -14 -10 q10 0 14 8" fill="#5aa85a"/>
      <g fill="#eef4ff" stroke="#8ab0e8" stroke-width="2">
        <ellipse cx="32" cy="14" rx="6" ry="9"/><ellipse cx="22" cy="24" rx="9" ry="6"/><ellipse cx="42" cy="24" rx="9" ry="6"/></g>
      <circle cx="32" cy="24" r="5" fill="#f8f0a0"/>`),
  },
  gold: {
    name: 'ゴールド袋',
    desc: 'ゴールドの入った小さな袋。町のつぼやたるの中で見つけた。',
    stack: true,
    stackMax: 5,
    icon: svg(`
      <path d="M20 22 q12 -8 24 0 l6 24 a6 6 0 0 1 -6 8 H20 a6 6 0 0 1 -6 -8 z" fill="#c89a5a" stroke="#6a4a1a" stroke-width="2.5"/>
      <path d="M22 22 q10 4 20 0" stroke="#6a4a1a" stroke-width="3" fill="none"/>
      <circle cx="32" cy="38" r="8" fill="#f0c840" stroke="#8a6416" stroke-width="2"/>
      <text x="32" y="42" font-size="10" text-anchor="middle" fill="#8a6416" font-weight="900">G</text>`),
  },
  sword: {
    name: '勇者の剣',
    desc: 'ドラゴンの火で鍛えた、青白く光る剣。勇者にとどけよう。',
    icon: svg(`
      <path d="M44 6 L52 12 L24 44 L18 40 Z" fill="#e8f0fc" stroke="#5a6a8a" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M12 36 L28 52" stroke="#f0c840" stroke-width="6" stroke-linecap="round"/>
      <path d="M14 50 L8 56" stroke="#6a4428" stroke-width="6" stroke-linecap="round"/>
      <path d="M46 10 L28 32" stroke="#a8d8ff" stroke-width="2"/>`),
  },
  potions: {
    name: '薬のセット',
    desc: '回復薬・毒消し・元気の素。スライムといっしょにつくった。勇者にとどけよう。',
    icon: svg(`
      <g stroke="#3a2a2a" stroke-width="2.5">
        <path d="M12 26 h10 v6 l4 6 v14 a4 4 0 0 1 -4 4 h-10 a4 4 0 0 1 -4 -4 v-14 l4 -6 z" fill="#b8d860"/>
        <path d="M27 18 h10 v8 l4 6 v20 a4 4 0 0 1 -4 4 h-10 a4 4 0 0 1 -4 -4 v-20 l4 -6 z" fill="#a85ad8"/>
        <path d="M42 26 h10 v6 l4 6 v14 a4 4 0 0 1 -4 4 h-10 a4 4 0 0 1 -4 -4 v-14 l4 -6 z" fill="#f07a3a"/></g>`),
  },
};
