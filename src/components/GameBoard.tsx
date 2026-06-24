import { useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { GameState, MoveEvaluation, Point } from '../types/game';
import { evaluateMove, makeMoveFromStart, placeMove } from '../game/rules/placement';
import { pointKey, segmentFromCenter } from '../game/geometry/math';

type Props = {
  state: GameState;
  setState: (updater: (state: GameState) => GameState) => void;
};

type Draft = {
  anchor: Point;
  pointer: Point;
  evaluation: MoveEvaluation;
};

const toBoardPoint = (element: SVGSVGElement, event: ReactPointerEvent<SVGSVGElement>): Point => {
  const rect = element.getBoundingClientRect();
  return {
    x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
  };
};

const pathPoints = (points: Point[]) => points.map((point) => `${point.x},${point.y}`).join(' ');

export function GameBoard({ state, setState }: Props) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [clickAnchor, setClickAnchor] = useState<Point | null>(null);
  const humanTurn = state.phase === 'playing' && state.currentPlayerId === 'human';

  const evaluateDraft = (anchor: Point, pointer: Point) => {
    const startMove = makeMoveFromStart(anchor, pointer, state.settings.lineLength);
    const startEvaluation = evaluateMove(state, 'human', startMove);
    return { evaluation: startEvaluation };
  };

  const draftLine = useMemo(() => {
    if (!draft) return null;
    const move = makeMoveFromStart(draft.anchor, draft.pointer, state.settings.lineLength);
    const [a, b] = segmentFromCenter(move.center, move.angle, state.settings.lineLength);
    return { a, b, move };
  }, [draft, state.settings.lineLength]);

  const begin = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!humanTurn) return;
    const point = toBoardPoint(event.currentTarget, event);
    if (event.pointerType === 'mouse') {
      if (!clickAnchor) {
        setClickAnchor(point);
        const pointer = { x: Math.min(1, point.x + 0.1), y: point.y };
        setDraft({ anchor: point, pointer, ...evaluateDraft(point, pointer) });
        return;
      }
      setDraft({ anchor: clickAnchor, pointer: point, ...evaluateDraft(clickAnchor, point) });
      setClickAnchor(null);
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const pointer = { x: Math.min(1, point.x + 0.1), y: point.y };
    setDraft({ anchor: point, pointer, ...evaluateDraft(point, pointer) });
  };

  const move = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!humanTurn) return;
    const pointer = toBoardPoint(event.currentTarget, event);
    if (event.pointerType === 'mouse' && clickAnchor) {
      setDraft({ anchor: clickAnchor, pointer, ...evaluateDraft(clickAnchor, pointer) });
      return;
    }
    if (!draft || event.pointerType === 'mouse') return;
    setDraft({ anchor: draft.anchor, pointer, ...evaluateDraft(draft.anchor, pointer) });
  };

  const end = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const confirm = () => {
    if (!draftLine || !draft?.evaluation.valid) return;
    setState((current) => placeMove(current, 'human', draftLine.move));
    setDraft(null);
    setClickAnchor(null);
  };

  const cancel = () => {
    setDraft(null);
    setClickAnchor(null);
  };

  return (
    <section className="board-shell">
      <svg className="board" viewBox="0 0 1 1" onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={() => setDraft(null)}>
        <rect x="0" y="0" width="1" height="1" className="board-bg" />
        {state.territories.map((territory) => (
          <polygon key={territory.id} points={pathPoints(territory.points)} className={`territory ${territory.ownerId}`} />
        ))}
        {draft?.evaluation.previewTriangles.map((territory) => (
          <polygon key={`preview-${territory.id}`} points={pathPoints(territory.points)} className="territory preview" />
        ))}
        {state.lines.map((line) => (
          <line
            key={line.id}
            x1={line.a.x}
            y1={line.a.y}
            x2={line.b.x}
            y2={line.b.y}
            className={`line ${line.neutral ? 'neutral' : line.ownerId ?? ''} ${line.active ? '' : 'inactive'}`}
          />
        ))}
        {draftLine && (
          <line
            x1={draftLine.a.x}
            y1={draftLine.a.y}
            x2={draftLine.b.x}
            y2={draftLine.b.y}
            className={`line draft ${draft?.evaluation.valid ? 'valid' : 'invalid'}`}
          />
        )}
        {clickAnchor && <circle cx={clickAnchor.x} cy={clickAnchor.y} r="0.014" className="click-anchor" />}
        {state.nodes.map((node) => (
          <circle
            key={node.id}
            cx={node.point.x}
            cy={node.point.y}
            r="0.012"
            className={`dot ${node.ownerships.length > 1 ? 'shared' : node.ownerships[0]?.playerId ?? ''} ${node.active ? '' : 'inactive'}`}
          />
        ))}
        {draft?.evaluation.intersections.map((point) => (
          <circle key={`future-${pointKey(point)}`} cx={point.x} cy={point.y} r="0.012" className="dot future" />
        ))}
      </svg>
      <div className="action-bar">
        <div>
          {draft ? (
            <span className={draft.evaluation.valid ? 'ok' : 'bad'}>
              {draft.evaluation.valid
                ? `獲得予定 ${draft.evaluation.previewTriangles.length}個 / ${(draft.evaluation.gainedArea * 100).toFixed(1)}%`
                : draft.evaluation.reason}
            </span>
          ) : (
            <span>PCは始点と方向点をクリック。スマホは始点からドラッグします。</span>
          )}
        </div>
        <button disabled={!draft?.evaluation.valid} onClick={confirm}>確定</button>
        <button onClick={cancel}>キャンセル</button>
      </div>
    </section>
  );
}
