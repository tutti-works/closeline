import type { CpuCandidate, Difficulty, Move, PlayerId } from '../../types/game';

const LOG_KEY = 'closeline.v2.aiDecisionLogs';
const MAX_LOGS = 120;

export type AiDecisionLogEntry = {
  id: string;
  createdAt: string;
  seed: string;
  turn: number;
  playerId: PlayerId;
  difficulty: Difficulty;
  candidateCount: number;
  selected: {
    move: Move;
    score: number;
    gainedArea: number;
    triangles: number;
    intersections: number;
  };
  topCandidates: Array<{
    move: Move;
    score: number;
    gainedArea: number;
    triangles: number;
    intersections: number;
  }>;
};

const summarize = (candidate: CpuCandidate) => ({
  move: candidate.move,
  score: Number(candidate.score.toFixed(3)),
  gainedArea: Number(candidate.evaluation.gainedArea.toFixed(5)),
  triangles: candidate.evaluation.previewTriangles.length,
  intersections: candidate.evaluation.intersections.length,
});

export const readAiDecisionLogs = (): AiDecisionLogEntry[] => {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) as AiDecisionLogEntry[] : [];
  } catch {
    return [];
  }
};

export const appendAiDecisionLog = (entry: Omit<AiDecisionLogEntry, 'id' | 'createdAt' | 'selected' | 'topCandidates'> & {
  selected: CpuCandidate;
  topCandidates: CpuCandidate[];
}) => {
  const next: AiDecisionLogEntry = {
    ...entry,
    id: `${Date.now()}-${entry.playerId}-${entry.turn}`,
    createdAt: new Date().toISOString(),
    selected: summarize(entry.selected),
    topCandidates: entry.topCandidates.map(summarize),
  };
  localStorage.setItem(LOG_KEY, JSON.stringify([next, ...readAiDecisionLogs()].slice(0, MAX_LOGS)));
};

export const clearAiDecisionLogs = () => {
  localStorage.removeItem(LOG_KEY);
};
