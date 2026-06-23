import type { Difficulty, GameSettings } from '../types/game';

type Props = {
  settings: GameSettings;
  onChange: (settings: GameSettings) => void;
  onStart: (newSeed?: boolean) => void;
};

export function SetupPanel({ settings, onChange, onStart }: Props) {
  const patch = (next: Partial<GameSettings>) => onChange({ ...settings, ...next });
  return (
    <section className="panel setup-panel">
      <div>
        <p className="eyebrow">CLOSELINE</p>
        <h1>交点でドットを作り、実在する線で三角形を囲む陣取りゲーム</h1>
      </div>
      <label>
        CPU難易度
        <select value={settings.difficulty} onChange={(event) => patch({ difficulty: event.target.value as Difficulty })}>
          <option>EASY</option>
          <option>NORMAL</option>
          <option>HARD</option>
        </select>
      </label>
      <label>
        最大ターン
        <input type="number" min="6" max="80" value={settings.maxTurns} onChange={(event) => patch({ maxTurns: Number(event.target.value) })} />
      </label>
      <label>
        線の長さ
        <input type="range" min="0.16" max="0.38" step="0.01" value={settings.lineLength} onChange={(event) => patch({ lineLength: Number(event.target.value) })} />
        <span>{Math.round(settings.lineLength * 100)}%</span>
      </label>
      <label>
        最低三角形面積
        <select value={settings.minTriangleAreaRatio} onChange={(event) => patch({ minTriangleAreaRatio: Number(event.target.value) })}>
          <option value={0.005}>0.5%</option>
          <option value={0.01}>1.0%</option>
          <option value={0.015}>1.5%</option>
          <option value={0.02}>2.0%</option>
          <option value={0.03}>3.0%</option>
        </select>
      </label>
      <label>
        ランダムシード
        <input value={settings.seed} onChange={(event) => patch({ seed: event.target.value })} />
      </label>
      <div className="switches">
        <label><input type="checkbox" checked={settings.guides} onChange={(event) => patch({ guides: event.target.checked })} /> 配置ガイド</label>
        <label><input type="checkbox" checked={settings.sound} onChange={(event) => patch({ sound: event.target.checked })} /> 効果音</label>
      </div>
      <div className="button-row">
        <button className="primary" onClick={() => onStart(false)}>同じ盤面で開始</button>
        <button onClick={() => onStart(true)}>新しいランダム盤面</button>
      </div>
    </section>
  );
}
