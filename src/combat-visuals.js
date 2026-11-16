export function createAimOverlay(arena) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.id = "aim-overlay";
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = `<g id="aim-guide"><g id="aim-reticle"><rect class="reticle-charge" x="-20" y="-20" width="40" height="40" pathLength="100"/><path class="reticle-corners" d="M-8 -14H-14V-8 M8 -14H14V-8 M14 8V14H8 M-8 14H-14V8"/><path d="M-22 0H-8M8 0H22M0-22V-8M0 8V22"/><rect class="reticle-dot" x="-2" y="-2" width="4" height="4"/><text y="34" text-anchor="middle"></text></g></g><path class="projectile-trail"/><g id="replay-group" style="display:none"><path class="replay-path"/><circle class="replay-dot" r="5"/></g>`;
  const reticle = svg.querySelector("#aim-reticle");
  const sprite = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "foreignObject",
  );
  sprite.setAttribute("x", "-30");
  sprite.setAttribute("y", "-30");
  sprite.setAttribute("width", "60");
  sprite.setAttribute("height", "60");
  const crosshair = document.createElement("canvas");
  crosshair.className = "original-crosshair";
  crosshair.width = crosshair.height = 60;
  sprite.append(crosshair);
  reticle.prepend(sprite);
  const chargeHolder = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "foreignObject",
  );
  const chargeSprites = document.createElement("canvas");
  chargeSprites.className = "original-charge-blobs";
  chargeHolder.append(chargeSprites);
  svg.querySelector("#aim-guide").prepend(chargeHolder);
  arena.appendChild(svg);
  const tag = document.createElement("div");
  tag.id = "projectile-tag";
  arena.appendChild(tag);
  return {
    svg,
    guide: svg.querySelector("#aim-guide"),
    reticle,
    crosshair,
    chargeSprites,
    charge: svg.querySelector(".reticle-charge"),
    text: svg.querySelector("#aim-reticle text"),
    trail: svg.querySelector(".projectile-trail"),
    replay: {
      group: svg.querySelector("#replay-group"),
      path: svg.querySelector(".replay-path"),
      dot: svg.querySelector(".replay-dot"),
    },
    tag,
  };
}
