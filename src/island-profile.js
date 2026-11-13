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
  [95, 128],
  [105, 128],
  [116, 155],
  [134, 171],
  [151, 181],
  [168, 185],
  [180, 164],
  [190, 164],
  [201, 179],
  [217, 176],
  [235, 167],
  [248, 156],
  [266, 150],
  [277, 119],
  [287, 119],
  [297, 145],
  [313, 137],
  [335, 135],
  [355, 137],
  [375, 153],
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

// Open-sided shelters, a traversable tunnel and a split offshore ledge.
export function islandVoid(x, y) {
  const tunnel =
    ((x - 52) / 90) ** 2 + ((y - 180 - Math.sin(x / 18) * 3) / 15) ** 2 < 1;
  const shelter =
    ((x - 440) / 100) ** 2 + ((y - 180 - Math.sin(x / 16) * 2) / 15) ** 2 < 1;
  const cleft = Math.abs(x - (452 + Math.sin(y / 17) * 3)) < 3;
  const arch = ((x - 302) / 13) ** 2 + ((y - 224) / 18) ** 2 < 1;
  return tunnel || shelter || cleft || arch;
}
