type Props = {
  open: boolean;
  onClose: () => void;
};

export function Tutorial({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="modal-backdrop">
      <section className="modal">
        <p className="eyebrow">Tutorial</p>
        <h2>遊び方</h2>
        <ol>
          <li>同じ長さの線を交互に置きます。</li>
          <li>既存の線とは交差できません。端点だけ接続できます。</li>
          <li>最後の1本で閉じた未獲得領域を、その手番のプレイヤーが取ります。</li>
          <li>2人なら最大領域、3人以上なら合計面積で勝敗を決めます。</li>
        </ol>
        <button className="primary" onClick={onClose}>閉じる</button>
      </section>
    </div>
  );
}
