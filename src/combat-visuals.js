import * as THREE from "three";

// The barrel is a separate articulated part, not pixels baked into the soldier.
export function createWeaponRig(team) {
  const pivot = new THREE.Group();
  const barrel = new THREE.Group();
  const paint = team ? 0xb6543c : 0x6e8041;
  const box = (w, h, x, y, color, z = 0) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, 3),
      new THREE.MeshStandardMaterial({ color, roughness: 0.7 }),
    );
    m.position.set(x, y, z);
    barrel.add(m);
    return m;
  };
  box(35, 12, 9, 0, 0x302e24);
  box(33, 9, 9, 0, paint, 2);
  box(5, 14, 27, 0, 0xd1ad68, 3);
  box(2, 10, 30, 0, 0x222b26, 4);
  box(4, 11, -7, 0, 0xb69b60, 3);
  box(3, 10, 9, -8, 0x503c29, 2);
  box(5, 3, 15, 8, 0x272d25, 3);
  box(20, 1, 8, 3, 0xc5c47b, 4);
  // Hands travel with the weapon, preserving the grip at every angle.
  for (const x of [-2, 17]) {
    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(4, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0xf5b184, roughness: 0.8 }),
    );
    hand.position.set(x, -4, 6);
    hand.scale.y = 0.85;
    barrel.add(hand);
  }
  const grenade = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(7, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x647944, roughness: 0.7 }),
  );
  shell.scale.set(0.8, 1, 1);
  shell.position.set(17, 0, 4);
  grenade.add(shell);
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(6, 3, 4),
    new THREE.MeshStandardMaterial({ color: 0xd8bb72 }),
  );
  cap.position.set(17, 7, 4);
  grenade.add(cap);
  const hand = new THREE.Mesh(
    new THREE.SphereGeometry(4, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0xf5b184 }),
  );
  hand.position.set(12, -4, 7);
  grenade.add(hand);
  pivot.add(barrel, grenade);
  const flash = new THREE.Mesh(
    new THREE.CircleGeometry(12, 5),
    new THREE.MeshBasicMaterial({
      color: 0xfff3b0,
      transparent: true,
      depthWrite: false,
    }),
  );
  flash.position.set(34, 0, 9);
  pivot.add(flash);
  flash.visible = false;
  return { pivot, barrel, grenade, flash };
}

export function createStars() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const shape = new THREE.Shape();
    for (let j = 0; j < 10; j++) {
      const a = (j * Math.PI) / 5,
        r = j % 2 ? 2 : 5;
      const x = Math.sin(a) * r,
        y = Math.cos(a) * r;
      j ? shape.lineTo(x, y) : shape.moveTo(x, y);
    }
    const m = new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshBasicMaterial({ color: 0xffe975, depthTest: false }),
    );
    g.add(m);
  }
  return g;
}

export function createProjectile(kind) {
  const g = new THREE.Group();
  if (["rocket", "mortar"].includes(kind)) {
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 3, 14, 10),
      new THREE.MeshStandardMaterial({
        color: kind === "mortar" ? 0x9394ae : 0xe0c37e,
      }),
    );
    body.rotation.z = -Math.PI / 2;
    g.add(body);
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(3, 6, 10),
      new THREE.MeshStandardMaterial({ color: 0xc16946 }),
    );
    tip.rotation.z = -Math.PI / 2;
    tip.position.x = 10;
    g.add(tip);
    const tail = new THREE.Mesh(
      new THREE.ConeGeometry(4, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd66c }),
    );
    tail.rotation.z = Math.PI / 2;
    tail.position.x = -10;
    g.add(tail);
  } else {
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(6, 12, 10),
      new THREE.MeshStandardMaterial({
        color: kind === "sticky" ? 0xf393b5 : 0x718948,
      }),
    );
    g.add(ball);
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(5, 3, 3),
      new THREE.MeshStandardMaterial({ color: 0xdfc77d }),
    );
    cap.position.y = 6;
    g.add(cap);
  }
  if (kind === "mortar") g.scale.setScalar(1.5);
  return g;
}

export function createAimOverlay(arena) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.id = "aim-overlay";
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = `<g id="aim-guide"><g id="aim-reticle"><circle class="reticle-charge" r="24" transform="rotate(-90)"/><circle class="reticle-rim" r="14"/><circle class="reticle-ring" r="10"/><path d="M-21 0H-7M7 0H21M0-21V-7M0 7V21"/><circle class="reticle-dot" r="2"/><text y="38" text-anchor="middle"></text></g></g><path class="projectile-trail"/>`;
  arena.appendChild(svg);
  const tag = document.createElement("div");
  tag.id = "projectile-tag";
  arena.appendChild(tag);
  return {
    svg,
    guide: svg.querySelector("#aim-guide"),
    reticle: svg.querySelector("#aim-reticle"),
    charge: svg.querySelector(".reticle-charge"),
    text: svg.querySelector("#aim-reticle text"),
    trail: svg.querySelector(".projectile-trail"),
    tag,
  };
}
