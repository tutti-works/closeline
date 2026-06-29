type Props = {
  open: boolean;
  onClose: () => void;
};

export function Tutorial({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="modal-backdrop">
      <section className="modal">
        <h2>ルール</h2>
        <ol>
          <li>盤面には最初から中立線が3本あります。</li>
          <li>あなたとCPUが、固定長の線を1本ずつ交互に引きます。</li>
          <li>新しい線は、既存線と1回以上交差する必要があります。</li>
          <li>交点は、最初にその交点を作ったプレイヤーのドットになります。</li>
          <li>自分のドット3点が線で囲まれると、三角形を獲得します。</li>
          <li>小さすぎる三角形は獲得できません。設定の最小面積以上が必要です。</li>
          <li>三角形の辺には、中立線・自分の線・相手の線を使えます。</li>
          <li>獲得済み陣地の内部・辺・頂点には、新しい線を引けません。</li>
          <li>縦方向に近い線、既存線と重なる線、盤面外へ出る線は禁止です。</li>
          <li>勝敗は、獲得した三角形の面積合計で決まります。</li>
        </ol>
        <button className="primary" onClick={onClose}>閉じる</button>
      </section>
    </div>
  );
}
