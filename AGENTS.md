# AGENTS.md — ほしまわり列車 引き継ぎメモ

Codex・Claude Code など、このリポジトリで作業するエージェント向けのメモです。
ゲームの概要・操作・各ステージの謎の答え（ネタバレ）は README.md にあります。
**通しプレイで見つかった直すことのリストは PLAYTEST.md にあります。次の作業はそこから始める。**

## 1. いまの状態

- three.js（r169・`vendor/` に同梱）で作った、ビルド不要の箱庭謎解きゲーム。
- 路線（`src/data/route.js`）：1 station はざま駅 → 2 sky 天空の街 → 3 edo 江戸の宿場町 → 4 port 潮の港町 →
  5 hero 勇者の城下町 → 6 maou 魔王城 → 7 onsen 寂れた温泉街 → 8 kinoko 巨大キノコの森 →
  9 toy からくりおもちゃの街 → 10 japan 現代日本（終点）。**全 10 ステージ実装ずみ**。
- 1 ステージ 15〜20 分の想定。箱庭の大きさは標準。ただし hero と toy は 1.5 倍、japan は 2 倍。
- japan は「江戸の宿場町の二百年後」。江戸の区画（座標）を残し、まわりに東京らしさを足している。
  持ち物の「むかし目」（koBell）を使うと江戸の箱庭が半透明で重なる。
- 外部アセットはなし。造形はすべてコード、音は Web Audio で合成。

## 2. 動かし方

```sh
npm run serve            # = python3 -m http.server 8123（リポジトリ直下で）
# http://localhost:8123/index.html
#   ?stage=japan   … そのステージから始める
#   ?low           … 軽量モード（重い端末向けの簡略化。テスト時も使う）
```

- セーブは localStorage の `hoshimawari-save-v1`（`{stage, flags, inventory, counts, elapsed, hints, cleared}`）。
- デバッグ用に `window.__game`（Game）が見える。`__game.stage` が今のステージ。
- ステージ切り替えはページの読み直し。

## 3. 構成

```
index.html              import map で vendor/three を参照
css/style.css           UI・パネルのスタイル（ステージ固有パネルもここ）
src/main.js             タイトル・HUD・起動
src/core/game.js        Game（状態・入力・カメラ・会話・アイテム）
src/core/ui.js          パネル・選択肢・トースト・バナー・フェード
src/core/audio.js       効果音と曲（SONGS）
src/core/postfx.js      ポストエフェクト（GRADES：ステージ・場面ごとの色調）
src/core/tween.js       トゥイーン
src/data/route.js       路線（順番はここだけ直せばよい）・各駅の「あいことば」（pass）
src/data/items.js       アイテム定義（SVG アイコン）。id は全ステージで一意
src/lib/                共通の造形（creatures*.js・backdrop.js・merge.js・pixel.js・util.js など）
src/stages/registry.js  実装ずみステージの登録（IMPL）
src/stages/<id>/        index.js（ステージクラス）・diorama.js（箱庭の造形）・panels.js（謎のパネル）
tools/                  動作確認用スクリプト（後述）
```

## 4. ステージクラスの約束

`src/stages/<id>/index.js` のクラスを `registry.js` の `IMPL` に登録する。主なメソッド：

| メソッド | 役割 |
| --- | --- |
| `constructor(game)` | `this.g = game` |
| `build(scene)` | 箱庭・住人・調べられる物を作る。最後に `_optimize()`（`mergeStatic`）で静的メッシュを結合 |
| `applyState()` | `g.flags` から見た目を復元（ロード直後・謎を解いた後） |
| `update(dt, t)` | 毎フレームのアニメーション |
| `quests()` | やることリスト |
| `hint()` | `H(key, ...lines)` 形式。押すたびに詳しく |
| `revealHotspots()` | ✨（調べられる場所）を返す |
| `inspectItem(item)` / `useItem(item, target)` | 持ち物を調べる・使う |
| `opening()` / `finale()` / `departure()` / `showClear()` | 導入・解決・出発・クリア画面（`showStageClear`） |
| `homeView(portrait)`・`interiorAt` | 任意。全体を見る視点、室内判定 |

Game の主な API：`g.flag(name, value)` / `g.flags` / `g.give` / `g.take` / `g.has` /
`g.note(id, title, html)` / `g.say(lines)` / `g.focusOn(target, {dist, polar, theta, keepAngle, subject})` /
`g.moveCamera` / `g.tweens.add` / `g.wait` / `g.setGrade` /
`g.ui.openPanel` / `choose` / `toast` / `banner` / `fade` / `g.audio.play(name)` / `tone()`。

`mergeStatic`（`src/lib/merge.js`）の決まり：`userData.dynamic` と `keep` のメッシュは結合しない。
調べられる物は別に結合。配列マテリアルと非表示メッシュは対象外。動かす物には必ず `dynamic` を付ける。

住人は `Creature`（`root` / `body` / `head` / `eyes` / `talk` / `hop` / `update` / `camPos`）、
hero・maou の HD-2D の住人は `PixelCreature`（`src/lib/pixel.js`）。**住人は全員人間ではない生き物**。

謎のパネルは `panels.js` で `el()` を使って HTML を組み、スタイルは `css/style.css` に足す。
空・遠景は `backdrop.js`（kind ごと）、色調は `postfx.js` の GRADES、曲は `audio.js` の SONGS に足す。

## 5. 確認のしかた

```sh
npm install              # 初回だけ（playwright。ブラウザ本体は入れなくてよい）
npm run check            # 全 JS の構文チェック + アイテム id の重複チェック
npm run serve &          # 8123 番で配信しておく

# カメラ位置ごとのスクリーンショット → shots/name0.png …
ST=kinoko node tools/shot.mjs '{"introDone":true}' '[[[0,16,26],[0,0.5,0]]]' name

# ステージのメソッドを順に動かして撮る（会話は自動送り）
ST=japan FLAGS='{"introDone":true}' INV='["koBell"]' node tools/flow.mjs '[{"run":"g.stage.talkKoma()","shot":"a"}]'
ST=japan FLAGS='{"introDone":true}' node tools/flow.mjs "$(cat tools/examples/japan-solve.json)"   # 長い手順はファイルに（japan の5つの謎を解く例）
```

- 環境変数：`ST`（ステージ id）、`FLAGS`、`INV`、`BASE`（既定 `http://localhost:8123`）、`OUT`（既定 `shots/`）、
  `CHROMIUM`（ブラウザの実行ファイル。Claude Code のクラウド環境では
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`。`npx playwright install chromium` で入れてもよい）。
- WebGL は swiftshader で描くので遅い（1 ステージの読み込みに数十秒）。
- 撮った画像は必ず目で見て確認する（`shots/` は .gitignore 済み）。
- サーバーが止まることがあるので、つながらないときは起動し直す。

## 6. ユーザーの方針（必ず守る）

- **報告は日本語**。コミットメッセージも日本語（例：「STAGE 9「からくりおもちゃの街」を追加（1.5倍）：…」）。
- 「通しでクリア出来るかどうかはこちらがまた指示するので、やらなくていいです。」
  → 通しプレイはしない。変えた場所だけスクリーンショットで確認する。
- 作りこみは減らさない。簡略化するのは重い端末（`?low`・ブルーム無効時）のときだけ。
- 住人は人間以外。ゲーム内でネタバレしない（先のステージの伏線・答えを書かない）。
- 混みすぎず、見通しよく。会話のカメラは住人の正面から、手前に何もかぶらないように。
- 物が他の物に埋まらない・ちらつかない（z-fighting を避ける）。看板の文字ははみ出さない。
- OrbitControls の基本の操作感は変えない。
- 変更したら：コミット → push。Claude Code ではゲームを Artifact としても公開している
  （https://claude.ai/artifact/QwLFLbPMNs7MvNuSJhRdDT。Codex では不要）。

## 7. Git

- 作業ブランチ：`claude/lucid-babbage-o0t6cd`（ユーザーの指示があればそれに従う）。
- PR はユーザーに頼まれたときだけ作る。

## 8. 気をつけること

- アイテム id は全ステージで一意（`npm run check` が見る）。jitte・tegata のように前のステージの物を使い回す場合は定義を共有する。
- 金属マテリアルは環境マップが無いので暗くなる。metalness は控えめに。
- スポットライトの向きは行列更新前の `lookAt` だとずれる。`setFromUnitVectors` などで決める。
- japan：首都高はカメラが低く手前にあると透ける（`R.hwMats`）。重い端末では車（`R.far`）だけ隠す。
  むかし目の江戸は depthTest なしのゴースト材質（不透明度 0.17）。
- 実機スマホでの重さはまだ確かめていない。
