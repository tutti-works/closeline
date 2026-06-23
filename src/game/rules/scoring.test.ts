import { describe, expect, it } from 'vitest';
import { createInitialState, defaultSettings } from '../state';
import { getWinner } from './scoring';

describe('winner scoring', () => {
  it('uses largest region mode for two players', () => {
    const state = createInitialState({ ...defaultSettings, playerCount: 2 });
    state.regions = [
      { id: 'a', ownerId: 'p1', points: [], area: 10, createdBySegmentId: 's1' },
      { id: 'b', ownerId: 'p2', points: [], area: 8, createdBySegmentId: 's2' },
      { id: 'c', ownerId: 'p2', points: [], area: 8, createdBySegmentId: 's3' },
    ];
    expect(getWinner(state).playerIds).toEqual(['p1']);
  });

  it('uses total area mode for three or more players', () => {
    const state = createInitialState({ ...defaultSettings, playerCount: 3 });
    state.regions = [
      { id: 'a', ownerId: 'p1', points: [], area: 10, createdBySegmentId: 's1' },
      { id: 'b', ownerId: 'p2', points: [], area: 8, createdBySegmentId: 's2' },
      { id: 'c', ownerId: 'p2', points: [], area: 8, createdBySegmentId: 's3' },
    ];
    expect(getWinner(state).playerIds).toEqual(['p2']);
  });
});
