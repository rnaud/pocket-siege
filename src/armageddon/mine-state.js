//004EA683: a nonzero physical state detonates after water processing.
// This path does not draw from the dud pool or repeat the proximity query.
export function nativeMineStateEvents(body, damage) {
  if (!body.state) return [];
  return [
    {
      operation: "blast",
      request: [1, body.x, (body.y + 0x100000) | 0, 100, damage, 0],
    },
    { operation: "delete", request: [1] },
  ];
}
