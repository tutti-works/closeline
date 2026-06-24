# CLOSELINE

固定長の線を交差させてドットを作り、実在する線で囲まれた三角形の面積を奪い合うWebゲームです。プレイヤー対CPUで遊べます。

## 起動

```powershell
npm.cmd install
npm.cmd run dev
```

表示された `http://localhost:5173/` を開きます。

## テスト

```powershell
npm.cmd run test
npm.cmd run lint
```

## ビルド

```powershell
npm.cmd run build
```

Cloudflare Pagesなどの静的ホスティングでは、ビルドコマンドを `npm run build`、出力ディレクトリを `dist` にします。

## AI学習

Node.js上で自己対戦を回し、CPU評価用の重みを `src/game/cpu/learnedWeights.json` に保存します。ブラウザ側CPUはこのJSONを読み込んで候補手評価に使います。

```powershell
npm.cmd run train:ai -- --games=200 --turns=18 --lr=0.05 --workers=8 --progressEvery=20
```

主なオプション:

- `--games`: 自己対戦ゲーム数
- `--turns`: 1ゲームの最大ターン数
- `--lr`: 学習率。200 gamesなら `0.05`、1000 gamesなら `0.03` が目安
- `--workers`: 並列worker数。Core i7-13700Fならまず `8`、余裕があれば `12`
- `--progressEvery`: 進捗表示間隔

学習は既存の `learnedWeights.json` から継続します。自己対戦では先攻をプレイヤー/CPUで交互に切り替え、学習時の候補生成にもブラウザCPUと同じ候補生成を混ぜています。少数ゲームの結果はブレやすいので、実用確認は200 games以上を推奨します。

## 使用技術

- React
- TypeScript
- Vite
- SVG
- Vitest
- localStorage

## ディレクトリ構成

- `src/components`: UIと盤面表示
- `src/game/geometry`: 幾何計算
- `src/game/initialBoard`: 初期線生成
- `src/game/rules`: 合法手と手番処理
- `src/game/triangles`: 三角形検出と陣地化
- `src/game/cpu`: CPU候補生成、評価、学習済み重み
- `src/game/persistence`: localStorage保存
- `src/types`: 型定義
- `scripts`: AI学習などの開発用スクリプト
- `docs`: 仕様と設計メモ

## 現在のルール概要

初期盤面には中立線が3本あります。プレイヤーは固定長の線を1本ずつ引き、既存線と1回以上交差させる必要があります。交点は線を引いたプレイヤーのドットになります。

3つの自分のドットが実在する線で囲まれた三角形になると、その三角形を陣地として獲得します。勝敗は獲得した三角形の面積合計で決まります。同点の場合は三角形数、最大三角形面積の順で判定します。

## 制限

- CPUは完全探索ではなく、候補生成と評価関数による近似です。
- AI学習は深層学習ではなく、自己対戦から評価重みを調整する方式です。
- 盤面やAI挙動はルール調整中です。
