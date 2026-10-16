# 佐賀駅の造形資料

2026-10-16 に参照。写真をゲームに取り込まず、コードの形状と手続きテクスチャで制作。

## 確認した資料

- Google Maps「佐賀駅」検索。HTTP 200 を確認。ただし HTTP の初期 HTML には外観写真の実データが含まれず、造形の目視根拠には下記の公開写真を併用した。
  - https://www.google.com/maps/search/?api=1&query=佐賀駅
- JR九州「佐賀駅」。高架駅・駅の案内を照合。
  - https://www.jrkyushu.co.jp/railway/station/1191602_1601.html
- 日本語Wikipediaの座標API。駅中心の公開座標を地理配置の参考に確認。
  - https://ja.wikipedia.org/w/api.php?action=query&titles=佐賀駅&prop=coordinates&format=json
  - 応答は緯度 `33.26423889`、経度 `130.29716389`。ユーザー提供の住宅座標 `33.324335,130.326075` は駅から北約6.68km・東約2.69km（北から東へ約22度）にある。模型では地域間の距離を圧縮するが、住宅を駅の北東側に置く根拠にする。
- Wikimedia Commons「Saga Station south entrance December 2023」。原寸写真を取得し、実際に画像を開いて南口を確認。
  - https://commons.wikimedia.org/wiki/File:Saga_Station_south_entrance_December_2023.jpg
- Wikimedia Commons「Saga Station south square August 2023」。原寸写真を取得し、駅名・白い帯・広場の大屋根を正面から確認。
  - https://commons.wikimedia.org/wiki/File:Saga_Station_south_square_August_2023.jpg
- Wikimedia Commons「Saga Station Platform Track 2 and 3 2021-10」。原寸写真を取得し、対面するホーム・黄色い点字帯・鉄骨柱・梁・架線を確認。
  - https://commons.wikimedia.org/wiki/File:Saga_Station_Platform_Track_2_and_3_2021-10.jpg

## 写真から確認して反映した特徴

- 南口は横長で低層。上半分には濃い遮音・日除け面が連続し、細い茶色の縦桟と白い上端がある。
- 白い横帯に黒字の「佐賀駅」、その下に「SAGA Station」。左隣に赤い弧の「えきマチ1丁目」看板がある。駅名の横に架空の大きな JR ロゴは足さない。
- 地上の店舗・入口は帯の下に奥まって並び、前面には白い細柱の水平な庇が続く。
- 駅前東側には、白い外周・細い白柱・暖色の木格子を持つ大きな切妻屋根がある。駅本体を切妻駅舎に置き換えず、独立した広場の屋根として置く。
- 高架は島式ホーム2面4線。ホーム上は鉄骨柱・低い庇・吊り案内・黄色い点字帯を持ち、架線が東西へ走る。

## 寸法と解釈の範囲

`src/stages/saga/station.js` は 1 unit をおよそ1mとして、写真内の扉高・一般的な線路軌間・柱間隔を基準に比率を構成。測量・竣工図に基づく厳密な実測値ではない。

- 駅本体の見せる範囲：幅94m、奥行32m、軒高約11m。
- ホーム・架線を含めた幅96m、高さ約14m。
- 南口の大屋根：幅28m、奥行22m、棟高8.8m。中心は駅本体から東27m・南26m。
- 近接する駅全体の範囲：x=-48〜48、z=-16.5〜37.2。南口は+z。
- 線路レール天端は local `y=5.375`、ホーム天端は `y=6.12`。縮尺変更後にレールと接続する場合はこの値を変換する。
- 推奨正面カメラ（縮尺前）：位置 `(0,12,61)`、注視点 `(0,5.3,15)`。
- 北口・店舗内・看板の小さいテナント名は、この資料で十分に確認できないため細かい実在情報を推測で付加していない。背面は高架の構造と防護面のみ。
- 大屋根と本体は写真の要点を優先した縮尺模型。広域ステージでは `R.root` を一括縮尺して配置する。
