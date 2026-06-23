# CLOSELINE

固定長の線を交互に引き、交点から生まれる自分のドット3点と、盤面上に実在する線で囲まれた三角形を獲得するWebゲームです。人間1人対CPU1人で遊べます。

## 起動方法

```powershell
npm.cmd install
npm.cmd run dev
```

表示された `http://localhost:5173/` を開きます。

## 開発方法

```powershell
npm.cmd run dev
```

## テスト方法

```powershell
npm.cmd run test
npm.cmd run lint
```

## ビルド方法

```powershell
npm.cmd run build
```

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
- `src/game/initialBoard`: 初期中立線生成
- `src/game/rules`: 合法手と手番処理
- `src/game/triangles`: 三角形検出と陣地化
- `src/game/cpu`: CPU候補生成と評価
- `src/game/persistence`: localStorage
- `src/types`: 型定義
- `docs`: 仕様と設計メモ

## ゲームルール

初期盤面には中立線が3本あります。プレイヤーは固定長の線を1本ずつ引き、既存線と1回以上交差させる必要があります。交点は後から線を引いたプレイヤーのドットになり、自分が所有する3つのドットが実在する線で囲まれた三角形になると陣地として獲得します。一手で複数の三角形が成立した場合はすべて獲得します。

## 現在の制限事項

- CPUは完全探索ではなく、候補生成と評価関数による近似です。
- 三角形検出は正確性を優先した組み合わせ探索です。ドット数が極端に増えると重くなる可能性があります。
- E2Eテストは未導入で、現状はVitestによるロジックテストが中心です。
