export const SERIES_TARGET = 2;

export function nextSeriesWins(wins, winner) {
  const next = [...wins];
  if (Number.isInteger(winner) && winner >= 0) next[winner] = (next[winner] ?? 0) + 1;
  return next;
}

export function seriesWinner(wins) {
  const winner = wins.findIndex((count) => count >= SERIES_TARGET);
  return winner < 0 ? null : winner;
}
