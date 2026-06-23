import type { GameSettings } from '../types/game';
import { defaultSettings, updateSettings, winModeForPlayerCount } from '../game/state';

type Props = {
  settings: GameSettings;
  onChange: (settings: GameSettings) => void;
  onStart: () => void;
};

export function SetupPanel({ settings, onChange, onStart }: Props) {
  const set = (patch: Partial<GameSettings>) => onChange(updateSettings(settings, patch));
  const mode = winModeForPlayerCount(settings.playerCount);

  return (
    <section className="panel setup-panel">
      <div>
        <p className="eyebrow">CLOSELINE</p>
        <h1>線で囲んで領域を取る陣取りゲーム</h1>
      </div>

      <label>
        プレイヤー数
        <select value={settings.playerCount} onChange={(event) => set({ playerCount: Number(event.target.value) as 2 | 3 | 4 })}>
          <option value={2}>2人: 人間 + CPU</option>
          <option value={3}>3人: 人間 + CPU2人</option>
          <option value={4}>4人: 人間 + CPU3人</option>
        </select>
      </label>

      <label>
        CPU難易度
        <select value={settings.cpuDifficulty} onChange={(event) => set({ cpuDifficulty: event.target.value as GameSettings['cpuDifficulty'] })}>
          <option value="easy">EASY</option>
          <option value="normal">NORMAL</option>
          <option value="hard">HARD</option>
        </select>
      </label>

      <label>
        最大ターン数
        <input type="number" min={12} max={240} value={settings.maxTurns} onChange={(event) => set({ maxTurns: Number(event.target.value) })} />
      </label>

      <label>
        線の長さ
        <input type="range" min={90} max={280} value={settings.lineLength} onChange={(event) => set({ lineLength: Number(event.target.value) })} />
        <span>{settings.lineLength}</span>
      </label>

      <div className="toggles">
        <label>
          <input type="checkbox" checked={settings.effects} onChange={(event) => set({ effects: event.target.checked })} />
          効果色
        </label>
        <label>
          <input type="checkbox" checked={settings.guides} onChange={(event) => set({ guides: event.target.checked })} />
          配置ガイド
        </label>
      </div>

      <p className="mode-note">現在の勝敗モード: {mode === 'largest-region' ? '最大領域モード' : '合計面積モード'}</p>

      <div className="actions">
        <button className="primary" onClick={onStart}>開始</button>
        <button onClick={() => onChange(defaultSettings)}>初期値</button>
      </div>
    </section>
  );
}
