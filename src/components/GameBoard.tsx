import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { GameState, Point } from '../types/game';
import { makeFixedSegment, snapPoint } from '../game/geometry/segments';
import { validateSegment } from '../game/rules/placement';

type Props = {
  state: GameState;
  onPlace: (a: Point, b: Point) => string | null;
};

type Draft = {
  start: Point;
  end: Point;
  valid: boolean;
  reason: string | null;
};

const toBoardPoint = (canvas: HTMLCanvasElement, event: PointerEvent | ReactPointerEvent): Point => {
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  return {
    x: (event.clientX - rect.left) * scale,
    y: (event.clientY - rect.top) * scale,
  };
};

const drawPolygon = (ctx: CanvasRenderingContext2D, points: Point[]) => {
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
};

export function GameBoard({ state, onPlace }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const currentPlayer = useMemo(() => state.players.find((player) => player.id === state.currentPlayerId)!, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);

    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#e2e8f0';
    for (let i = 100; i < state.boardSize; i += 100) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, state.boardSize);
      ctx.moveTo(0, i);
      ctx.lineTo(state.boardSize, i);
      ctx.stroke();
    }
    ctx.restore();

    for (const region of state.regions) {
      const owner = state.players.find((player) => player.id === region.ownerId)!;
      drawPolygon(ctx, region.points);
      ctx.fillStyle = `${owner.color}33`;
      ctx.fill();
      ctx.strokeStyle = `${owner.color}88`;
      ctx.lineWidth = 2;
      ctx.stroke();
      const label = region.points.reduce((acc, point) => ({ x: acc.x + point.x / region.points.length, y: acc.y + point.y / region.points.length }), { x: 0, y: 0 });
      ctx.fillStyle = owner.color;
      ctx.font = '28px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(String(Math.round(region.area)), label.x, label.y);
    }

    for (const segment of state.segments) {
      const owner = state.players.find((player) => player.id === segment.ownerId)!;
      ctx.strokeStyle = owner.color;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(segment.a.x, segment.a.y);
      ctx.lineTo(segment.b.x, segment.b.y);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      for (const point of [segment.a, segment.b]) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    if (draft) {
      ctx.strokeStyle = draft.valid ? currentPlayer.color : '#ef4444';
      ctx.lineWidth = 8;
      ctx.setLineDash([18, 10]);
      ctx.beginPath();
      ctx.moveTo(draft.start.x, draft.start.y);
      ctx.lineTo(draft.end.x, draft.end.y);
      ctx.stroke();
      ctx.setLineDash([]);
      if (state.settings.guides) {
        ctx.fillStyle = draft.valid ? `${currentPlayer.color}22` : '#ef444422';
        ctx.beginPath();
        ctx.arc(draft.end.x, draft.end.y, 22, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [currentPlayer, draft, state]);

  const updateDraft = (start: Point, pointer: Point) => {
    const [rawA, rawB] = makeFixedSegment(start, pointer, state.settings.lineLength);
    const a = snapPoint(rawA, state.segments, state.boardSize).point;
    const b = snapPoint(rawB, state.segments, state.boardSize).point;
    const reason = validateSegment(state, a, b);
    const nextDraft = { start: a, end: b, valid: !reason, reason };
    setDraft(nextDraft);
    return nextDraft;
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (currentPlayer.kind !== 'human' || state.phase !== 'playing') return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const start = snapPoint(toBoardPoint(event.currentTarget, event), state.segments, state.boardSize).point;
    updateDraft(start, start);
    setMessage(null);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!draft) return;
    updateDraft(draft.start, toBoardPoint(event.currentTarget, event));
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!draft) return;
    const nextDraft = updateDraft(draft.start, toBoardPoint(event.currentTarget, event));
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (!nextDraft.valid) {
      setMessage(nextDraft.reason);
      return;
    }
    const reason = onPlace(nextDraft.start, nextDraft.end);
    setMessage(reason);
    if (!reason) setDraft(null);
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    cancel();
  };

  const confirm = () => {
    if (!draft) return;
    const reason = onPlace(draft.start, draft.end);
    setMessage(reason);
    if (!reason) setDraft(null);
  };

  const cancel = () => {
    setDraft(null);
    setMessage(null);
  };

  return (
    <main className="board-wrap">
      <canvas
        ref={canvasRef}
        width={state.boardSize}
        height={state.boardSize}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="game-canvas"
      />
      <div className="board-tools">
        {draft ? (
          <>
            <button className="primary" disabled={!draft.valid} onClick={confirm}>配置</button>
            <button onClick={cancel}>キャンセル</button>
            <span className={draft.valid ? 'ok' : 'bad'}>{draft.valid ? '配置できます' : draft.reason}</span>
          </>
        ) : (
          <span>{currentPlayer.kind === 'cpu' ? 'CPU思考中...' : '盤面をドラッグして配置'}</span>
        )}
      </div>
      {message && <div className="toast">{message}</div>}
    </main>
  );
}
