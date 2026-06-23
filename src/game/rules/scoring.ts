import type { GameState, Score, Winner } from '../../types/game';

export const getScores = (state: GameState): Score[] =>
  state.players.map((player) => {
    const regions = state.regions.filter((region) => region.ownerId === player.id);
    const totalArea = regions.reduce((sum, region) => sum + region.area, 0);
    const largestArea = regions.reduce((max, region) => Math.max(max, region.area), 0);
    return {
      playerId: player.id,
      totalArea,
      largestArea,
      regionCount: regions.length,
      coveragePercent: (totalArea / (state.boardSize * state.boardSize)) * 100,
    };
  });

export const getWinner = (state: GameState): Winner => {
  const scores = getScores(state);
  const sorted = [...scores].sort((a, b) => {
    const primary = state.winMode === 'largest-region' ? b.largestArea - a.largestArea : b.totalArea - a.totalArea;
    if (Math.abs(primary) > 0.001) return primary;
    if (b.regionCount !== a.regionCount) return b.regionCount - a.regionCount;
    return 0;
  });
  const best = sorted[0];
  const bestValue = state.winMode === 'largest-region' ? best.largestArea : best.totalArea;
  const tied = sorted.filter((score) => {
    const value = state.winMode === 'largest-region' ? score.largestArea : score.totalArea;
    return Math.abs(value - bestValue) <= 0.001 && score.regionCount === best.regionCount;
  });
  return { playerIds: tied.map((score) => score.playerId), scores };
};
