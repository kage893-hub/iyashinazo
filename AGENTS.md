# AGENTS.md — ほしまわり列車 引き継ぎメモ

Codex・Claude Code など、このリポジトリで作業するエージェント向けのメモです。
ゲームの概要・操作・各ステージの謎の答え（ネタバレ）は README.md にあります。
**通しプレイで見つかった直すことのリストは PLAYTEST.md にあります。次の作業はそこから始める。**

## 1. いまの状態

- three.js（r169・`vendor/` に同梱）で作った、ビルド不要の箱庭謎解きゲーム。
- 路線（`src/data/route.js`）：1 station はざま駅 → 2 sky 天空の街 → 3 edo 江戸の宿場町 → 4 port 潮の港町 →
  5 hero 勇者の城下町 → 6 maou 魔王城 → 7 onsen 寂れた温泉街 → 8 kinoko 巨大キノコの森 →
  9 toy からくりおもちゃの街 → 10 japan 現代日本（終点）。**本編10＋追加2ステージ実装ずみ**。
- 本編クリア後は、`museum`「星あかりの博物館」（60×44、5種類の謎）と `saga`「佐賀のまち」（160×156、五つの寄り道）を順不同に選べる。追加は `EXTRA_ROUTE` / `EXTRA_STAGES` に登録し、本編 `ROUTE` の終点は変えない。
- saga は佐賀駅・モラージュ佐賀・指定された川久保の建物を写真・地図から再現。施設の模型は駅0.45、モール0.16、川久保0.95の異なる縮尺で配置し、地域間の距離を圧縮している。共通縮尺の市街地図ではない。資料は [docs/saga-references.md](docs/saga-references.md) と施設ごとの参照資料にある。
- saga の住人はカササギ・ネコ・ウサギ・ツル・モモンガ・カエル・カピバラの湯案内・キツネの料理人。旅程・買物・水門・風読み・外観観察を好きな順に進め、最後は駅前のカササギへ。「佐賀の旅ノート」（sagaGuide）から各施設・北西地区・川久保の3方向・全景へ移れる。謎の入力途中は `flags.saDrafts`、達成は `sa*Done` に保存する。
- saga 北西には公式資料を参照したアマンディ佐賀と、架空の「ビストロ 翠の泡」、14の街の小景がある。休憩 `saSpaRested` と料理 `saFoamTasted` は任意の記録で、必須5謎の `STOPS` に追加しない。既存セーブ・クリア条件は維持。敷地は `R.northwestLots`、街の操作対象は `R.streetScenes`。建物追加時は地表だけでなくFIELD_RECTSの稲やクリーク護岸も重なりを確認する。
- 1 ステージ 15〜20 分の想定。箱庭の大きさは標準。ただし hero と toy は 1.5 倍、japan は 2 倍、saga は複数の実在地点を収める広域の箱庭。
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

- セーブは localStorage の `hoshimawari-save-v1`（`{stage, flags, inventory, counts, elapsed, hints, cleared, journeys}`）。旧形式を後方互換で読み込み、`journeys.main` と `journeys.extras[id]` に各旅の進行を保存する。`Game.save()` では使用中の flags の参照を差し替えない。
- `cleared` に `japan` があれば追加の旅を解放（旧セーブも尊重）。`g.goToStage(id, {resume:true})` で続きから、既定は最初から。`g.openExtraJourneys()` がタイトル・メニュー・クリア画面共通の入口。
- `journeys.extras.museum` と `journeys.extras.saga` は独立。本編・博物館・佐賀を往復しても、持ち物・メモ・時間・謎の途中状態を混ぜず、片方のやり直しでもほかの旅とクリア記録を残す。
- デバッグ用に `window.__game`（Game）が見える。`__game.stage` が今のステージ。
- ステージ切り替えはページの読み直し。

## 3. 構成

```
index.html              import map で vendor/three を参照
css/style.css           UI・パネルのスタイル（ステージ固有パネルもここ）
css/museum.css          博物館のパネル
css/saga.css            佐賀のパネル・旅ノート
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
src/stages/saga/        index・diorama・panels・visits、station・mallage・kawakubo・amandi・bistroの模型
src/lib/creatures-saga.js 佐賀のカササギ（ほかの住人は既存のCreature）
docs/saga-*-references.md 施設ごとの写真・公式資料と再現範囲
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

謎のパネルは `panels.js` で `el()` を使って HTML を組み、スタイルは `css/style.css` または専用CSS（museum・saga）に足す。
空・遠景は `backdrop.js`（kind ごと）、色調は `postfx.js` の GRADES、曲は `audio.js` の SONGS に足す。

## 5. 確認のしかた

```sh
npm install              # 初回だけ（playwright。ブラウザ本体は入れなくてよい）
npm run check            # 全 JS の構文チェック + アイテム id の重複チェック
npm run serve &          # 8123 番で配信しておく
node tools/regressions.mjs # 時間計測・パネル操作・低い画面の回帰確認（CHROMIUM も指定可）
node tools/save-regressions.mjs # ブラウザ不要：旧セーブ・本編と追加2旅の往復・再開・やり直し
node tools/museum-logic-regressions.mjs # ブラウザ不要：地層の一意性・光路・配送・水量
node tools/saga-logic-regressions.mjs # ブラウザ不要：佐賀の旅程・買物・水門・風読み・観察の条件
node tools/extra-regressions.mjs # 追加2旅の選択と実Gameの保存・導入・復帰（箱庭だけ仮の駅）
node tools/museum-regressions.mjs # 5つの謎の正誤・途中再開・縦横画面
node tools/saga-regressions.mjs # 佐賀の5パネルの正誤・途中再開・縦横画面
node tools/saga-stage-regressions.mjs # 佐賀の実箱庭・行き先・視界・保存再開・終幕の個別確認
node tools/saga-northwest-regressions.mjs # 北西の任意体験・旧セーブ保全・街角・縦横UIと既存3施設

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
- ブラウザ確認は1個ずつ実行する。`?stage=museum` / `?stage=saga` で本編未クリアでも追加の箱庭を個別に検証できる。
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
- saga：必須3地点は写真の外観・敷地内配置を優先する。川久保の未確認の背面・内部や居住者の設定を作らない。模型の推奨視点にはVector3と数値配列があり、`modelView`で吸収する。縦画面の距離と`interiorAt`の角度制約も整合させる。
- 実機スマホでの重さはまだ確かめていない。
