# 吉野ヶ里遺跡の縮景

2026-10-18確認。公式サイトの説明と公開写真を取得し、物見櫓・竪穴住居・倉庫・門の写真を目で確認した。写真自体はゲームに貼らず、すべてコードで造形する。茅の繊維も手続き描画のテクスチャである。

- 公式・復元建物紹介：https://www.yoshinogari.jp/introduction/restore/
- 南内郭（物見櫓・竪穴住居）：https://www.yoshinogari.jp/introduction/restore/minaminaikaku/
- 物見櫓の写真：https://www.yoshinogari.jp/.assets/minaminaikaku-3.jpg
- 竪穴住居と南内郭の写真：https://www.yoshinogari.jp/.assets/minaminaikaku-2.jpg
- 櫓門の写真：https://www.yoshinogari.jp/.assets/minaminaikaku-8.jpg
- 倉と市：https://www.yoshinogari.jp/introduction/restore/kuratoichi/
- 倉と市の写真：https://www.yoshinogari.jp/.assets/kuratoichi-1.png
- 高床倉庫の写真：https://www.yoshinogari.jp/.assets/kuratoichi-13.jpg
- 環壕入口（空堀・土橋・鳥形の門）：https://www.yoshinogari.jp/introduction/restore/moat-encircled-village/

`src/stages/saga/yoshinogari.js`。ラウンドワンの北側、中心(61,-43)、幅27・奥行25の区画に代表的な復元建築の縮景を置く。草の土塁、乾いた環壕、尖った木柵、入口の土橋と鳥形、細い柱で支えた物見櫓、茅葺の竪穴住居、高床倉庫の鼠返し・階段・木組みを参照する。

現実の公園全体の配置や寸法、発掘時の建築そのものを忠実に復元する模型ではない。歴史公園で現在見られる復元建物の外観をもとに、箱庭の区画へまとめ直したもの。環壕は水路にせず、低い土の斜面として表す。人の像や新しい大きな案内看板は置かない。立ち寄りは任意で、必須の五つの謎や既存セーブの達成条件に追加しない。
