// 004E07E0: state entry and the original004D1080 drag setter.
export function nativeCrateState(input, state) {
  const body = { ...input, state };
  body.drag = state === 100 ? 0 : state === 101
    ? body.kind === 3 ? (Math.trunc((body.targetDrag << 16) / 500) + 0xcccc) | 0 : 0xe8f5
    : 65536;
  if (state === 100) body.openingProgress = 0;
  else if (state >= 101 && state <= 104) body.progress = 0;
  return body;
}

// 004E0880, including004AAFD0 water substitutions for crate/target kinds.
export function nativeCrateArt(body) {
  let sprite = 0, progress = body.progress;
  if (body.kind === 1) sprite = body.variant ? 607 : 598;
  else if (body.kind === 2) sprite = body.variant ? 608 : 599;
  else if (body.kind === 3) {
    if (body.targetStyle === 0) sprite = body.variant ? 595 : 594;
    else if (body.targetStyle === 1) sprite = body.variant ? 597 : 596;
  } else if (body.kind === 4) sprite = body.variant ? 609 : 600;
  else if (body.kind === 5) sprite = 593;
  if (body.state === 100) {
    sprite = ({ 1: 604, 2: 605, 4: 606 })[body.kind] ?? sprite;
    progress = (65536 - body.openingProgress) | 0;
  } else if (body.state === 101) {
    sprite = ({ 1: 601, 2: 602, 4: 603 })[body.kind] ?? sprite;
  } else if (body.state === 102) {
    sprite = ({ 593: 694, 594: 695, 595: 695, 598: 697, 607: 697,
      599: 698, 608: 698, 600: 699, 609: 699 })[sprite] ?? sprite;
  }
  return { sprite, progress: progress & 0xffff };
}
