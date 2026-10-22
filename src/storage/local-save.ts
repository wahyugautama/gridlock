import { parseSave, serializeSave, type LoadResult } from '../engine/save';
import type { GameState } from '../types/game';

export const SAVE_KEY = 'gridlock.active-run';
export const loadLocalRun = (): LoadResult => {
  try { return parseSave(window.localStorage.getItem(SAVE_KEY)); }
  catch { return { status: 'unavailable', state: null }; }
};
export const saveLocalRun = (state: GameState): boolean => {
  try { window.localStorage.setItem(SAVE_KEY, serializeSave(state)); return true; }
  catch { return false; }
};
export const clearLocalRun = (): boolean => {
  try { window.localStorage.removeItem(SAVE_KEY); return true; }
  catch { return false; }
};
