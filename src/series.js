export const SERIES_TARGET = 2;

export function nextSeriesWins(wins, winner) {
  const next = [...wins];
  if (winner === 0 || winner === 1) next[winner] += 1;
  return next;
}

export function seriesWinner(wins) {
  if (wins[0] >= SERIES_TARGET) return 0;
  if (wins[1] >= SERIES_TARGET) return 1;
  return null;
}
