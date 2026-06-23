type Props = {
  open: boolean;
  onClose: () => void;
};

export function Tutorial({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="modal-backdrop">
      <section className="modal">
        <h2>遊び方</h2>
        <ol>
          <li>初期盤面には中立線が3本あります。</li>
          <li>同じ長さの線を交互に引きます。</li>
          <li>新しい線は既存線と交差させます。</li>
          <li>交点は、後から線を引いたプレイヤーのドットになります。</li>
          <li>自分のドット3点が実在する線で囲まれると三角形を獲得します。</li>
          <li>一手で複数できた場合はすべて獲得します。</li>
          <li>獲得面積の合計で勝敗を決めます。</li>
          <li>獲得済み陣地には線を引けません。</li>
          <li>縦方向に近い線は禁止です。</li>
        </ol>
        <button className="primary" onClick={onClose}>閉じる</button>
      </section>
    </div>
  );
}
