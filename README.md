# CLOSELINE

スマートフォンとPCのブラウザで遊べる、線を使った陣取りゲームです。React、TypeScript、Vite、HTML Canvasで実装しています。バックエンドは不要です。

## 起動方法

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
```

## テスト

```bash
npm run test
npm run lint
```

## 使用技術

- React
- TypeScript
- Vite
- HTML Canvas
- localStorage
- Vitest

## ディレクトリ構成

- `src/components`: UIとCanvas描画
- `src/game`: ゲームロジック
- `src/game/geometry`: 幾何計算
- `src/game/cpu`: CPU候補生成と評価
- `src/game/rules`: 配置、得点、勝敗
- `src/hooks`: React hooks
- `src/types`: 共有型
- `docs`: 仕様と設計メモ

## 現在の制限事項

- CPUは完全探索ではなく、合法手候補を評価するヒューリスティック方式です。
- 領域侵入判定は線分上の複数点サンプルで行います。通常操作では十分ですが、極端に細い領域では保守的な判定になる可能性があります。
- オンライン対戦は未対応です。
