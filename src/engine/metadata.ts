import type { GameMetadata } from '../types/game';

/** Pure presentation metadata helper; independent of React and browser APIs. */
export const getGameIdentity = (metadata: GameMetadata): string =>
  `${metadata.title} v${metadata.version}`;
