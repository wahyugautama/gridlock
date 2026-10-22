import type { GameState } from '../types/game';
import { getRemainingMoves, getRoundTarget, isRoundComplete } from './game';
import { scoreBoard } from './scoring';

/** Live status; final results and cumulative statistics are recorded by the engine. */
export const getRoundStatus = (state: GameState) => {
  const breakdown = scoreBoard(state.board, state.modifiers);
  const complete = isRoundComplete(state);
  const target = state.round > 0 ? getRoundTarget(state.round) : 0;
  return {
    breakdown,
    remainingMoves: getRemainingMoves(state),
    target,
    complete,
    outcome: complete ? ((state.roundResult?.cleared ?? (breakdown.totalScore >= target)) ? 'target-reached' : 'target-missed') : null,
  } as const;
};
