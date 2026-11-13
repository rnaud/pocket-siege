// The reference island's stepped shoulders and low central saddle, in 480×270.
export const ISLAND_RIDGE = [
  [5, 142],
  [13, 131],
  [23, 123],
  [34, 120],
  [48, 120],
  [57, 126],
  [65, 139],
  [78, 151],
  [105, 151],
  [116, 155],
  [134, 171],
  [151, 181],
  [168, 185],
  [186, 185],
  [201, 179],
  [217, 176],
  [235, 167],
  [248, 156],
  [266, 150],
  [285, 150],
  [297, 145],
  [313, 137],
  [335, 135],
  [355, 137],
  [375, 130],
  [398, 128],
  [413, 122],
  [438, 120],
  [458, 121],
  [470, 132],
  [476, 155],
];
export function islandTop(x, seed = 42) {
  if (x < 5 || x > 476) return 270;
  let i = 0;
  while (i < ISLAND_RIDGE.length - 2 && x > ISLAND_RIDGE[i + 1][0]) i++;
  const a = ISLAND_RIDGE[i],
    b = ISLAND_RIDGE[i + 1];
  return (
    a[1] +
    ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]) +
    Math.sin(x * 0.09 + seed) * 1.2
  );
}
