import * as THREE from "three";

// The barrel is a separate articulated part, not pixels baked into the soldier.
export function createWeaponRig(team) {
  const pivot = new THREE.Group();
  const barrel = new THREE.Group();
  const paint = team ? 0xc86450 : 0x6c8148;
  const ink = 0x17383b,
    cream = 0xeadcb8,
    wood = 0x9a7047;
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0x142f33,
    transparent: true,
    opacity: 0.9,
  });
  const addInk = (mesh) => {
    mesh.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry),
        edgeMaterial,
      ),
    );
  };
  const box = (w, h, x, y, color, z = 0) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, 3),
      new THREE.MeshStandardMaterial({ color, roughness: 0.9 }),
    );
    m.position.set(x, y, z);
    addInk(m);
    barrel.add(m);
    return m;
  };
  box(35, 12, 9, 0, ink);
  box(33, 9, 9, 0, paint, 2);
  box(5, 14, 27, 0, cream, 3);
  box(2, 10, 30, 0, ink, 4);
  box(4, 11, -7, 0, wood, 3);
  box(3, 10, 9, -8, 0x6f4f38, 2);
  box(5, 3, 15, 8, ink, 3);
  box(20, 1, 8, 3, 0xdce39a, 4);
  // Hands travel with the weapon, preserving the grip at every angle.
  for (const x of [-2, 17]) {
    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(4, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0xf0c69f, roughness: 0.9 }),
    );
    hand.position.set(x, -4, 6);
    hand.scale.y = 0.85;
    barrel.add(hand);
  }
  const grenade = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(7, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x9baf58, roughness: 0.9 }),
  );
  shell.scale.set(0.8, 1, 1);
  shell.position.set(17, 0, 4);
  grenade.add(shell);
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(6, 3, 4),
    new THREE.MeshStandardMaterial({ color: 0xd9a05c }),
  );
  cap.position.set(17, 7, 4);
  grenade.add(cap);
  const hand = new THREE.Mesh(
    new THREE.SphereGeometry(4, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0xf0c69f }),
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
        color: kind === "mortar" ? 0x9b7b58 : 0xe5d3a8,
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
      new THREE.MeshBasicMaterial({ color: 0xd4e36c }),
    );
    tail.rotation.z = Math.PI / 2;
    tail.position.x = -10;
    g.add(tail);
  } else {
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(6, 12, 10),
      new THREE.MeshStandardMaterial({
        color: kind === "sticky" ? 0xe96e57 : 0x9caf59,
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
  svg.innerHTML = `<g id="aim-guide"><g id="aim-reticle"><circle class="reticle-charge" r="24" transform="rotate(-90)"/><circle class="reticle-rim" r="14"/><circle class="reticle-ring" r="10"/><path d="M-21 0H-7M7 0H21M0-21V-7M0 7V21"/><circle class="reticle-dot" r="2"/><text y="38" text-anchor="middle"></text></g></g><path class="projectile-trail"/><g id="replay-group" style="display:none"><path class="replay-path"/><circle class="replay-dot" r="5"/></g>`;
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
    replay: {
      group: svg.querySelector("#replay-group"),
      path: svg.querySelector(".replay-path"),
      dot: svg.querySelector(".replay-dot"),
    },
    tag,
  };
}

export function createCrate(kind, image = null) {
  const colors = {
    health: 0x9ef28b,
    grenade: 0xe6b56d,
    mortar: 0xa8b4d8,
    sticky: 0xf393b5,
  };
  const color = colors[kind] ?? 0xd8c48a;
  const group = new THREE.Group();
  if (image) {
    const art = new THREE.Mesh(
      new THREE.PlaneGeometry(54, 54),
      new THREE.MeshBasicMaterial({
        map: image,
        transparent: true,
        depthWrite: false,
      }),
    );
    art.position.set(0, 17, 2);
    group.add(art);
  } else {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(30, 20, 18),
      new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.85 }),
    );
    group.add(body);
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(31, 6, 19),
      new THREE.MeshStandardMaterial({ color, roughness: 0.5 }),
    );
    band.position.y = 2;
    group.add(band);
    const lid = new THREE.Mesh(
      new THREE.BoxGeometry(32, 4, 20),
      new THREE.MeshStandardMaterial({ color: 0x5f472f, roughness: 0.9 }),
    );
    lid.position.y = 11;
    group.add(lid);
  }
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(2, 4, 42, 8),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
  );
  beam.position.y = 34;
  group.add(beam);
  const beacon = new THREE.Mesh(
    new THREE.OctahedronGeometry(6),
    new THREE.MeshBasicMaterial({ color, depthWrite: false }),
  );
  beacon.position.y = 27;
  group.add(beacon);
  const groundGlow = new THREE.Mesh(
    new THREE.RingGeometry(19, 25, 28),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  groundGlow.position.y = -11;
  group.add(groundGlow);
  group.userData.beacon = beacon;
  return group;
}

export function createMine(image = null) {
  const group = new THREE.Group();
  if (image) {
    const art = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 28),
      new THREE.MeshBasicMaterial({
        map: image,
        transparent: true,
        depthWrite: false,
      }),
    );
    art.position.set(0, 17, 2);
    group.add(art);
    return group;
  }
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(8, 11, 5, 16),
    new THREE.MeshStandardMaterial({ color: 0x35433f, roughness: 0.8 }),
  );
  group.add(base);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(9, 1.5, 6, 18),
    new THREE.MeshBasicMaterial({ color: 0xff8b78 }),
  );
  ring.position.y = 3;
  group.add(ring);
  const light = new THREE.Mesh(
    new THREE.SphereGeometry(3, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xff6b5b }),
  );
  light.position.y = 7;
  group.add(light);
  group.userData.light = light;
  return group;
}
