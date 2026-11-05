import * as THREE from "three";
import "./style.css";
import {
  Terrain,
  W,
  H,
  WATER,
  launch,
  integrate,
  shotGeometry,
} from "./physics.js";
import {
  createWeaponRig,
  createStars,
  createProjectile,
  createAimOverlay,
} from "./combat-visuals.js";
const $ = (s) => document.querySelector(s);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const arena = $("#arena"),
  menu = $("#menu");
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
$("#scene").appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color("#344e64");
const camera = new THREE.OrthographicCamera(0, W, H, 0, 0.1, 2000);
camera.position.z = 1000;
scene.add(new THREE.AmbientLight(0xffffff, 2));
const sun = new THREE.DirectionalLight(0xffe4bc, 2.5);
sun.position.set(-300, 600, 600);
scene.add(sun);
const group = new THREE.Group();
scene.add(group);
const canvas = document.createElement("canvas");
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext("2d");
const texture = new THREE.CanvasTexture(canvas);
texture.colorSpace = THREE.SRGBColorSpace;
texture.minFilter = THREE.LinearFilter;
const land = new THREE.Mesh(
  new THREE.PlaneGeometry(W, H),
  new THREE.MeshBasicMaterial({ map: texture, transparent: true }),
);
land.position.set(W / 2, H / 2, 0);
group.add(land);
const colors = [0xc3eb87, 0xff8b78],
  names = [
    ["Sprout", "Moss", "Pickle"],
    ["Pepper", "Toast", "Chilli"],
  ];
let terrain,
  worms = [],
  current = 0,
  team = 0,
  round = 1,
  phase = "menu",
  projectile = null,
  particles = [],
  wind = 0,
  time = 45,
  shotWait = 0,
  turnCount = [0, 0],
  mode = "ai",
  weapon = "rocket",
  move = 0,
  angle = 45,
  power = 65,
  aiWait = 0,
  sound = false,
  audio,
  announceUntil = 0,
  last = performance.now(),
  accumulator = 0,
  explosions = 0,
  shakeUntil = 0;
function flatShape(points, color, z) {
  const s = new THREE.Shape();
  points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  const mesh = new THREE.Mesh(
    new THREE.ShapeGeometry(s),
    new THREE.MeshBasicMaterial({ color }),
  );
  mesh.position.z = z;
  group.add(mesh);
  return mesh;
}
// Original generated art, loaded once and shared by all six soldiers.
let assetsReady = false;
const manager = new THREE.LoadingManager();
const loader = new THREE.TextureLoader(manager);
function artTexture(file) {
  const map = loader.load(`${import.meta.env.BASE_URL}art/${file}.webp`);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return map;
}
const backdropMap = artTexture("fern-islands");
const soldierMaps = [artTexture("moss-body"), artTexture("coral-body")];
const hurtMaps = [artTexture("moss-hurt"), artTexture("coral-hurt")];
const backdrop = new THREE.Mesh(
  new THREE.PlaneGeometry(W, H),
  new THREE.MeshBasicMaterial({ map: backdropMap }),
);
backdrop.position.set(W / 2, H / 2, -180);
group.add(backdrop);
manager.onLoad = () => {
  assetsReady = true;
  resize();
};
const motes = [];
for (let i = 0; i < 26; i++) {
  const mote = new THREE.Mesh(
    new THREE.CircleGeometry(1 + (i % 3), 6),
    new THREE.MeshBasicMaterial({
      color: 0xfff6be,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    }),
  );
  mote.position.z = 8;
  group.add(mote);
  motes.push(mote);
}
const water = flatShape(
  [
    [0, 0],
    [1200, 0],
    [1200, WATER],
    [0, WATER],
  ],
  "#167e86",
  20,
);
water.material.transparent = true;
water.material.opacity = 0.82;
const waterLines = [];
for (let i = 0; i < 25; i++) {
  const l = new THREE.Mesh(
    new THREE.PlaneGeometry(20 + (i % 5) * 9, 1),
    new THREE.MeshBasicMaterial({
      color: 0x9cd3ce,
      transparent: true,
      opacity: 0.28,
    }),
  );
  l.position.set((i * 53) % 1200, 15 + ((i * 17) % 65), 22);
  group.add(l);
  waterLines.push(l);
}
function paintTerrain() {
  terrain.surfaceCache = Array.from({ length: W }, (_, x) =>
    terrain.surface(x),
  );
  const image = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!terrain.solid(x, y)) continue;
      const i = ((H - 1 - y) * W + x) * 4;
      const grass = !terrain.solid(x, y + 7);
      const rim = !terrain.solid(x, y + 15);
      const hash = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      const noise = (hash - Math.floor(hash)) * 9 - 4.5;
      const strata = Math.sin(y * 0.055 + Math.sin(x * 0.009) * 2.2);
      const depth = Math.min(1, (terrain.surfaceCache[x] - y) / 150);
      const edge =
        !terrain.solid(x - 4, y) ||
        !terrain.solid(x + 4, y) ||
        !terrain.solid(x, y - 4);
      let c = grass
        ? [133, 177, 64]
        : rim
          ? [67, 101, 45]
          : [
              127 + strata * 13 - depth * 21,
              83 + strata * 10 - depth * 17,
              47 + strata * 8 - depth * 7,
            ];
      if (grass && !terrain.solid(x, y + 3)) c = [194, 211, 101];
      if (edge && !grass && !rim) c = c.map((v) => v * 0.67);
      image.data[i] = c[0] + noise;
      image.data[i + 1] = c[1] + noise;
      image.data[i + 2] = c[2] + noise;
      image.data[i + 3] = 255;
    }
  ctx.putImageData(image, 0, 0);
  // Details are clipped to the current collision mask, so craters erase them too.
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  for (let i = 0; i < 250; i++) {
    const x = (i * 137 + 17) % W,
      y = (i * 83 + 91) % H;
    if (!terrain.solid(x, y)) continue;
    ctx.fillStyle = i % 3 ? "#a8784e" : "#61442d";
    ctx.beginPath();
    ctx.ellipse(x, H - y, 3 + (i % 8), 2 + (i % 4), 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Fine grass tufts grow only on intact surface, never on the crater walls.
  ctx.lineWidth = 1.3;
  for (let x = 55; x < W - 55; x += 5) {
    const y = terrain.surfaceCache[x];
    if (y < WATER + 30 || Math.abs(y - terrain.surfaceCache[x + 3]) > 4)
      continue;
    ctx.strokeStyle = x % 3 ? "#8baa44" : "#c6d67a";
    ctx.beginPath();
    ctx.moveTo(x, H - y + 1);
    ctx.lineTo(x - 2, H - y - 3 - (x % 4));
    ctx.stroke();
  }
  texture.needsUpdate = true;
}
function sphere(r, color, x, y, z, sx = 1, sy = 1) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, 16, 12),
    new THREE.MeshStandardMaterial({ color, roughness: 0.82 }),
  );
  m.position.set(x, y, z);
  m.scale.set(sx, sy, 1);
  return m;
}
function createWorm(t, i, x) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: soldierMaps[t],
      transparent: true,
      alphaTest: 0.03,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  body.position.set(0, 22, 4);
  body.scale.set(64, 64, 1);
  g.add(body);
  const rig = createWeaponRig(t);
  rig.pivot.position.z = 10;
  g.add(rig.pivot);
  const stars = createStars();
  g.add(stars);
  stars.visible = false;
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(14, 24),
    new THREE.MeshBasicMaterial({
      color: 0x263722,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    }),
  );
  shadow.scale.y = 0.22;
  shadow.position.set(0, -9, 2);
  g.add(shadow);
  const label = document.createElement("div");
  label.className = "worm-label";
  label.style.color = t ? "#ffb0a1" : "#d2efa8";
  label.innerHTML = `${names[t][i]}<strong>100</strong>`;
  $("#labels").appendChild(label);
  group.add(g);
  return {
    team: t,
    name: names[t][i],
    hp: 100,
    x,
    y: terrain.surface(x) + 12,
    vx: 0,
    vy: 0,
    g,
    body,
    rig,
    stars,
    hurt: 0,
    recoil: 0,
    dying: 0,
    hitDirection: 1,
    hits: 0,
    shadow,
    facing: t ? -1 : 1,
    label,
    ground: true,
  };
}
const aimHUD = createAimOverlay(arena);
let lastAim = null;
let bannerTime = 0;
function shot(w, a = angle, kind = weapon) {
  return shotGeometry(
    w,
    a,
    arena.clientHeight / H / (arena.clientWidth / W),
    w.visualSize || 64,
    kind,
  );
}
function launchPoint(w, a, kind) {
  const result = shot(w, a, kind),
    { pivot, muzzle } = result;
  // A long weapon must not teleport a projectile through a nearby wall.
  for (let i = 1; i <= 24; i++) {
    const x = pivot.x + ((muzzle.x - pivot.x) * i) / 24,
      y = pivot.y + ((muzzle.y - pivot.y) * i) / 24;
    if (terrain.solid(x, y))
      return { ...result, muzzle: { x, y }, blocked: true };
  }
  return { ...result, blocked: false };
}
function previewShot(w) {
  const origin = launchPoint(w, angle, weapon);
  const p = { ...origin.muzzle, ...launch(angle, power) };
  const points = [screen(p.x, p.y)];
  let impact = origin.blocked;
  for (let i = 0; i < 1440 && !impact; i++) {
    integrate(p, 1 / 120, weapon === "rocket" ? wind : wind * 0.25);
    impact =
      terrain.solid(p.x, p.y) ||
      worms.some(
        (other) =>
          other.hp > 0 &&
          (other !== w || i > 42) &&
          Math.hypot(other.x - p.x, other.y + 5 - p.y) < 12,
      );
    if (i % 5 === 0 || impact) points.push(screen(p.x, p.y));
    if (p.y < WATER || p.x < 0 || p.x > W || (weapon === "grenade" && i >= 359))
      break;
  }
  return { origin, points, impact, endpoint: screen(p.x, p.y) };
}
function updateAimHUD() {
  const visible = phase === "aim" && !menu.open && worms[current]?.hp > 0;
  aimHUD.guide.style.display = visible ? "" : "none";
  if (visible) {
    const result = previewShot(worms[current]);
    const path = result.points
      .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ");
    aimHUD.arc.setAttribute("d", path);
    aimHUD.shadow.setAttribute("d", path);
    const origin = screen(result.origin.pivot.x, result.origin.pivot.y);
    const r = (angle * Math.PI) / 180,
      dx = (Math.cos(r) * arena.clientWidth) / W,
      dy = (-Math.sin(r) * arena.clientHeight) / H;
    const length = Math.hypot(dx, dy),
      reach = Math.min(100, arena.clientWidth * 0.23);
    const ux = dx / length,
      uy = dy / length;
    const distance = Math.max(
      0,
      Math.min(
        reach,
        Math.abs(ux) < 0.0001
          ? Infinity
          : ((ux > 0 ? arena.clientWidth - 24 : 24) - origin.x) / ux,
        Math.abs(uy) < 0.0001
          ? Infinity
          : ((uy > 0 ? arena.clientHeight - 45 : 45) - origin.y) / uy,
      ),
    );
    const target = { x: origin.x + ux * distance, y: origin.y + uy * distance };
    aimHUD.reticle.setAttribute(
      "transform",
      `translate(${target.x},${target.y})`,
    );
    aimHUD.text.textContent = `${Math.round(angle)}° · ${Math.round(power)}%`;
    const end = result.endpoint;
    aimHUD.impact.style.display = result.impact ? "" : "none";
    aimHUD.impact.setAttribute("transform", `translate(${end.x},${end.y})`);
    aimHUD.caption.setAttribute(
      "x",
      Math.max(55, Math.min(arena.clientWidth - 55, end.x)),
    );
    aimHUD.caption.setAttribute(
      "y",
      Math.max(18, Math.min(arena.clientHeight - 15, end.y + 25)),
    );
    aimHUD.caption.textContent = result.impact
      ? weapon === "rocket"
        ? "IMPACT"
        : "FIRST BOUNCE"
      : "";
    lastAim = {
      ...result.origin,
      reticle: target,
      angle,
      power,
      impact: result.impact,
    };
  }
  aimHUD.tag.hidden = !projectile;
  if (projectile) {
    const p = screen(projectile.x, projectile.y);
    aimHUD.tag.style.left =
      Math.max(48, Math.min(arena.clientWidth - 48, p.x)) + "px";
    aimHUD.tag.style.top =
      Math.max(14, Math.min(arena.clientHeight - 25, p.y - 22)) + "px";
    aimHUD.tag.textContent =
      projectile.kind === "grenade"
        ? `✹ ${Math.max(0, 3 - projectile.age).toFixed(1)}s`
        : p.y < 0
          ? "↑ ROCKET"
          : "➶";
    aimHUD.trail.setAttribute(
      "d",
      projectile.trail
        .map((v, i) => {
          const t = screen(v.x, v.y);
          return `${i ? "L" : "M"}${t.x},${t.y}`;
        })
        .join(" "),
    );
  } else aimHUD.trail.setAttribute("d", "");
}
function announce(text) {
  $("#announcement").textContent = text;
  $("#announcement").style.opacity = 1;
  announceUntil = performance.now() + 2200;
}
function tone(freq, duration = 0.1, type = "sine") {
  if (!sound) return;
  audio ??= new (window.AudioContext || window.webkitAudioContext)();
  audio.resume();
  const o = audio.createOscillator(),
    g = audio.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, audio.currentTime);
  o.frequency.exponentialRampToValueAtTime(
    Math.max(30, freq * 0.2),
    audio.currentTime + duration,
  );
  g.gain.setValueAtTime(0.12, audio.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  o.connect(g);
  g.connect(audio.destination);
  o.start();
  o.stop(audio.currentTime + duration);
}
function reset() {
  for (const w of worms) {
    dispose(w.g);
    w.label.remove();
  }
  if (projectile) dispose(projectile.mesh);
  projectile = null;
  for (const p of particles) dispose(p.mesh);
  particles = [];
  terrain = new Terrain(2 + Math.floor(Math.random() * 40));
  paintTerrain();
  worms = [
    ...names[0].map((_, i) => createWorm(0, i, [180, 340, 490][i])),
    ...names[1].map((_, i) => createWorm(1, i, [710, 860, 1020][i])),
  ];
  team = 0;
  round = 1;
  turnCount = [0, 0];
  ((explosions = 0), (shakeUntil = 0));
  announceUntil = 0;
  setWeapon("rocket");
  mode = $("#mode").value;
  beginTurn();
  resize();
}
function dispose(obj) {
  group.remove(obj);
  obj.traverse((o) => {
    o.geometry?.dispose();
    if (o.material) o.material.dispose();
  });
}
function beginTurn() {
  const living = worms.filter((w) => w.hp > 0 && w.team === team);
  if (!living.length) return endGame();
  const active = living[turnCount[team]++ % living.length];
  current = worms.indexOf(active);
  phase = "aim";
  time = 45;
  wind = (Math.random() - 0.5) * 28;
  angle = team ? 135 : 45;
  power = 65;
  move = 0;
  aiWait = 1.6;
  updateSliders();
  $("#round").textContent = `ROUND ${String(round).padStart(2, "0")}`;
  $("#turn-label").textContent =
    mode === "ai"
      ? team
        ? "COMPUTER TURN"
        : "YOUR MOVE"
      : team
        ? "CORAL’S MOVE"
        : "MOSS’S MOVE";
  $("#wind").textContent =
    `WIND ${wind < 0 ? "←" : "→"} ${Math.abs(wind / 5).toFixed(1)}`;
  $("#status").textContent =
    `${active.name} is up. ${team && mode === "ai" ? "Taking aim…" : "Pick your angle. Make a little chaos."}`;
  bannerTime = 1.8;
  $("#turn-banner").textContent =
    `${team ? "CORAL CREW" : "MOSS COMPANY"} · ${active.name.toUpperCase()}`;
  updateUI();
}
function updateUI() {
  for (let t = 0; t < 2; t++) {
    let hp = worms.filter((w) => w.team === t).reduce((s, w) => s + w.hp, 0);
    $("#score" + t).textContent = hp;
    $("#health" + t).style.width = hp / 3 + "%";
  }
  for (let i = 0; i < worms.length; i++) {
    const w = worms[i];
    w.g.visible = w.hp > 0 || w.dying > 0;
    w.label.style.display = w.hp > 0 ? "block" : "none";
    w.label.querySelector("strong").textContent = w.hp;
    w.label.style.setProperty("--hp", w.hp + "%");
    w.label.classList.toggle("active", i === current && phase !== "over");
  }
  const disabled = !canAct();
  $("#fire").disabled = disabled;
  $("#angle").disabled = disabled;
  $("#power").disabled = disabled;
  document
    .querySelectorAll("[data-weapon],[data-move],#jump")
    .forEach((b) => (b.disabled = disabled));
}
function canAct() {
  return phase === "aim" && !(team === 1 && mode === "ai") && !menu.open;
}
function updateSliders() {
  $("#angle").value = angle;
  $("#power").value = power;
  $("#angle-value").textContent = Math.round(angle) + "°";
  $("#power-value").textContent = Math.round(power) + "%";
}
function fire() {
  if (phase !== "aim") return;
  const w = worms[current],
    origin = launchPoint(w, angle, weapon),
    v = launch(angle, power);
  w.recoil = 0.3;
  projectile = {
    ...origin.muzzle,
    ...v,
    age: 0,
    kind: weapon,
    mesh: createProjectile(weapon),
    trail: [],
    blocked: origin.blocked,
  };
  projectile.mesh.position.set(projectile.x, projectile.y, 40);
  group.add(projectile.mesh);
  phase = "flight";
  bannerTime = 0;
  $("#status").textContent =
    weapon === "rocket"
      ? "Rocket away. Incoming!"
      : "Grenade thrown. Three-second fuse.";
  move = 0;
  shotWait = 0;
  tone(550, 0.2, "triangle");
  updateUI();
}
function explode(x, y, kind) {
  const radius = kind === "grenade" ? 66 : 53;
  terrain.carve(x, y, radius);
  paintTerrain();
  explosions++;
  shakeUntil = performance.now() + 350;
  impactFlash(x, y);
  tone(85, 0.6, "sawtooth");
  for (let i = 0; i < 46; i++) {
    const a = Math.random() * Math.PI * 2,
      s = 40 + Math.random() * 210;
    const mesh = sphere(
      2 + Math.random() * 6,
      i % 3 ? 0xc4a578 : 0xffce70,
      x,
      y,
      35,
    );
    group.add(mesh);
    particles.push({
      mesh,
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.5 + Math.random() * 0.8,
      max: 1.3,
    });
  }
  const reports = [];
  for (const w of worms) {
    if (w.hp <= 0) continue;
    const d = Math.hypot(w.x - x, w.y - y);
    if (d < radius + 40) {
      const damage = Math.max(1, Math.round((1 - d / (radius + 40)) * 65));
      w.hp = Math.max(0, w.hp - damage);
      w.hurt = 1.4;
      w.hits++;
      w.hitDirection = Math.sign(w.x - x) || 1;
      if (w.hp === 0) w.dying = 1.2;
      reports.push(`${w.name} −${damage}${w.hp === 0 ? " · KO" : ""}`);
      w.vx = ((w.x - x) / Math.max(d, 1)) * 170;
      w.vy = 100 + (1 - d / (radius + 40)) * 110;
      w.ground = false;
      damageLabel(w, damage);
    }
  }
  $("#status").textContent = reports.length
    ? reports.join("   /   ")
    : "Terrain destroyed. No worms hit.";
  updateUI();
}
function impactFlash(x, y) {
  const p = screen(x, y),
    flash = document.createElement("span");
  flash.className = "impact-flash";
  flash.style.left = p.x + "px";
  flash.style.top = p.y + "px";
  $("#damage").appendChild(flash);
  setTimeout(() => flash.remove(), 600);
}
function damageLabel(w, n) {
  const p = screen(w.x, w.y + 30),
    el = document.createElement("span");
  el.className = "damage-number";
  el.textContent = "−" + n;
  el.style.left = p.x + "px";
  el.style.top = p.y + "px";
  $("#damage").appendChild(el);
  setTimeout(() => el.remove(), 1300);
}
function endGame() {
  phase = "over";
  aimHUD.guide.style.display = "none";
  const a = worms.some((w) => w.team === 0 && w.hp > 0),
    b = worms.some((w) => w.team === 1 && w.hp > 0);
  announce(
    a && !b
      ? "MOSS COMPANY WINS!"
      : b && !a
        ? "CORAL CREW WINS!"
        : "MUTUAL DESTRUCTION!",
  );
  announceUntil = Infinity;
  $("#turn-label").textContent = "MATCH COMPLETE";
  $("#status").textContent = "Good game. Tap New match for another round.";
  updateUI();
}
function nextTurn() {
  if ([0, 1].some((t) => !worms.some((w) => w.team === t && w.hp > 0)))
    return endGame();
  team = 1 - team;
  if (team === 0) round++;
  beginTurn();
}
function jump() {
  if (!canAct()) return;
  const w = worms[current];
  if (w.ground) {
    w.vy = 145;
    w.vx = move * 75;
    w.ground = false;
    tone(300, 0.1);
  }
}
function aiShoot() {
  const w = worms[current],
    targets = worms.filter((t) => t.team !== team && t.hp > 0);
  let best = { score: Infinity, angle: 135, power: 65 };
  for (let a = 12; a <= 168; a += 4)
    for (let p = 25; p <= 100; p += 5) {
      const q = { ...launchPoint(w, a, "rocket").muzzle, ...launch(a, p) };
      for (let i = 0; i < 500; i++) {
        integrate(q, 0.025, wind);
        if (q.y < WATER || q.x < 0 || q.x > W) break;
        if (terrain.solid(q.x, q.y)) {
          const score =
            Math.min(...targets.map((t) => Math.hypot(t.x - q.x, t.y - q.y))) +
            (Math.hypot(w.x - q.x, w.y - q.y) < 65 ? 130 : 0);
          if (score < best.score) best = { score, angle: a, power: p };
          break;
        }
      }
    }
  angle = best.angle + (Math.random() - 0.5) * 3;
  power = best.power;
  weapon = "rocket";
  setWeapon(weapon);
  updateSliders();
  fire();
}
function step(dt) {
  if (menu.open || document.hidden) return;
  bannerTime = Math.max(0, bannerTime - dt);
  if (phase === "aim") {
    time -= dt;
    if (time <= 0) {
      phase = "settle";
      shotWait = 1.4;
      move = 0;
    }
    if (team === 1 && mode === "ai") {
      aiWait -= dt;
      if (aiWait <= 0 && phase === "aim") aiShoot();
    }
    if (canAct() && move) {
      const w = worms[current],
        nx = w.x + move * 48 * dt;
      if (nx > 12 && nx < W - 12) {
        let stepY = 0;
        while (stepY < 12 && terrain.solid(nx, w.y - 8 + stepY)) stepY++;
        if (stepY < 12) {
          w.x = nx;
          w.y += stepY;
        }
      }
    }
  }
  for (const w of worms) {
    w.hurt = Math.max(0, w.hurt - dt);
    w.recoil = Math.max(0, w.recoil - dt);
    w.dying = Math.max(0, w.dying - dt);
    w.g.visible = w.hp > 0 || w.dying > 0;
    if (w.hp <= 0) continue;
    w.vy -= 145 * dt;
    let nx = Math.max(8, Math.min(W - 8, w.x + w.vx * dt));
    if (!terrain.solid(nx, w.y)) w.x = nx;
    else w.vx *= -0.2;
    w.vx *= Math.pow(0.15, dt);
    let ny = w.y + w.vy * dt;
    w.ground = false;
    if (w.vy <= 0 && terrain.solid(w.x, ny - 10)) {
      while (terrain.solid(w.x, ny - 10) && ny < H) ny += 1;
      w.vy = 0;
      w.ground = true;
    }
    if (w.vy <= 0 && terrain.solid(w.x, ny - 11)) {
      w.ground = true;
      w.vy = 0;
    }
    w.y = ny;
    if (w.y < WATER) {
      w.hp = 0;
      w.dying = 1;
      w.hurt = 1;
      impactFlash(w.x, WATER);
      tone(150, 0.3);
      damageLabel(w, "SPLASH");
      if (w === worms[current] && phase === "aim") {
        phase = "settle";
        shotWait = 0;
        move = 0;
      }
      updateUI();
    }
    w.g.position.set(w.x, w.y, 15);
  }
  if (projectile) {
    const p = projectile;
    const ox = p.x,
      oy = p.y;
    integrate(p, dt, p.kind === "rocket" ? wind : wind * 0.25);
    p.age += dt;
    let hit = p.blocked;
    p.blocked = false;
    const distance = Math.hypot(p.x - ox, p.y - oy),
      steps = Math.max(1, Math.ceil(distance / 2));
    for (let s = 1; s <= steps && !hit; s++) {
      const x = ox + ((p.x - ox) * s) / steps,
        y = oy + ((p.y - oy) * s) / steps;
      if (
        terrain.solid(x, y) ||
        worms.some(
          (w, i) =>
            w.hp > 0 &&
            (i !== current || p.age > 0.35) &&
            Math.hypot(w.x - x, w.y + 5 - y) < 12,
        )
      ) {
        p.x = x;
        p.y = y;
        hit = true;
        break;
      }
    }
    let boom =
      (p.kind === "rocket" && hit) || (p.kind === "grenade" && p.age >= 3);
    if (hit && p.kind === "grenade") {
      if (terrain.solid(p.x, oy)) {
        p.vx *= -0.55;
      } else {
        p.vy *= -0.55;
        p.vx *= 0.72;
      }
      p.x = ox;
      p.y = oy;
    }
    p.mesh.position.set(p.x, p.y, 40);
    p.mesh.rotation.z =
      p.kind === "rocket" ? Math.atan2(p.vy, p.vx) : p.age * 5;
    if (Math.floor(p.age * 60) !== Math.floor((p.age - dt) * 60)) {
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 28) p.trail.shift();
    }
    if (boom || p.y < WATER || p.x < -50 || p.x > W + 50 || p.age > 12) {
      if (boom && p.y > WATER) explode(p.x, p.y, p.kind);
      dispose(p.mesh);
      projectile = null;
      phase = "settle";
      shotWait = 0;
    }
  }
  if (phase === "settle") {
    shotWait += dt;
    if (
      shotWait > 1.6 &&
      worms.every((w) => w.hp <= 0 || w.ground || shotWait > 5)
    )
      nextTurn();
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    integrate(p, dt);
    p.life -= dt;
    p.mesh.position.set(p.x, p.y, 35);
    p.mesh.scale.setScalar(Math.max(0.01, p.life / p.max));
    if (p.life <= 0) {
      dispose(p.mesh);
      particles.splice(i, 1);
    }
  }
}
function screen(x, y) {
  return {
    x: (x / W) * arena.clientWidth,
    y: ((H - y) / H) * arena.clientHeight,
  };
}
function resize() {
  renderer.setSize(arena.clientWidth, arena.clientHeight, false);
  const correction = arena.clientHeight / H / (arena.clientWidth / W);
  const aspect = arena.clientWidth / arena.clientHeight;
  const imageAspect = backdropMap.image
    ? backdropMap.image.width / backdropMap.image.height
    : 16 / 9;
  backdropMap.repeat.set(
    Math.min(1, aspect / imageAspect),
    Math.min(1, imageAspect / aspect),
  );
  backdropMap.offset.set(
    (1 - backdropMap.repeat.x) / 2,
    (1 - backdropMap.repeat.y) / 2,
  );
  for (const w of worms) {
    w.g.scale.x = correction;
    w.visualSize = Math.max(64, (29 * H) / arena.clientHeight);
  }
}
new ResizeObserver(() => requestAnimationFrame(resize)).observe(arena);
function frame(now) {
  requestAnimationFrame(frame);
  accumulator += Math.min((now - last) / 1000, 0.1);
  last = now;
  while (accumulator >= 1 / 120) {
    step(1 / 120);
    accumulator -= 1 / 120;
  }
  const labelBoxes = [];
  for (const w of worms) {
    const size = w.visualSize || 64;
    const active = w === worms[current];
    if (active && phase === "aim")
      w.facing = move || (Math.cos((angle * Math.PI) / 180) < 0 ? -1 : 1);
    const facing = w.facing * (w.team ? -1 : 1);
    const moving = active && move && canAct();
    const bounce =
      menu.open || reducedMotion
        ? 0
        : Math.sin(now * (moving ? 0.019 : 0.003) + w.x) * (moving ? 3 : 1.2);
    w.body.scale.set(
      size * facing * (1 + bounce * 0.008),
      size * (1 - bounce * 0.006),
      1,
    );
    w.body.position.y = size / 2 - 12 + bounce;
    w.body.rotation.z = moving
      ? Math.sin(now * 0.02) * 0.065
      : Math.max(-0.15, Math.min(0.15, -w.vx * 0.001));
    const hurt = w.hurt / 1.4,
      flinch = reducedMotion ? 0 : Math.sin(hurt * Math.PI * 5) * hurt;
    w.body.scale.x *= 1 + Math.abs(flinch) * 0.14;
    w.body.scale.y *= 1 - Math.abs(flinch) * 0.16;
    w.body.rotation.z += flinch * 0.32 * w.hitDirection;
    w.body.material.map =
      w.hurt > 0.35 ? hurtMaps[w.team] : soldierMaps[w.team];
    w.body.material.color.setHex(
      w.hurt > 0.75 && Math.floor(w.hurt * 14) % 2 ? 0xff806c : 0xffffff,
    );
    w.body.material.opacity = w.hp > 0 ? 1 : Math.min(1, w.dying * 1.4);
    if (w.hp <= 0) {
      w.body.rotation.z += (1 - w.dying) * w.hitDirection * 1.7;
      w.body.position.y -= 20 * (1 - w.dying);
    }
    const a = active ? angle : w.facing < 0 ? 155 : 25,
      geometry = shot(w, a);
    w.rig.pivot.position.set(
      (Math.cos((a * Math.PI) / 180) < 0 ? -1 : 1) * size * 0.09,
      size * 0.25,
      10,
    );
    w.rig.pivot.rotation.z = geometry.visualAngle;
    w.rig.pivot.scale.set(
      size / 64,
      ((Math.cos((a * Math.PI) / 180) < 0 ? -1 : 1) * size) / 64,
      1,
    );
    w.rig.pivot.visible = w.hp > 0 && w.hurt < 0.75;
    w.rig.barrel.visible = !active || weapon === "rocket";
    w.rig.grenade.visible = active && weapon === "grenade";
    w.rig.barrel.position.x = -Math.sin((w.recoil / 0.3) * Math.PI) * 7;
    w.rig.flash.visible = w.recoil > 0.19 && weapon === "rocket";
    w.rig.flash.scale.setScalar(0.8 + Math.sin(now * 0.09) * 0.2);
    w.stars.visible = w.hp > 0 && w.hurt > 0;
    w.stars.position.set(0, size + 30, 20);
    w.stars.children.forEach((star, i) => {
      const a = now * 0.007 + (i * Math.PI * 2) / 3;
      star.position.set(Math.cos(a) * 17, Math.sin(a) * 5, 0);
      star.rotation.z = a;
    });
    w.label.classList.toggle("hurt", w.hurt > 0);
    w.shadow.visible = w.ground && w.hp > 0;
    const p = screen(w.x, w.y + size - 7);
    if (w.hp > 0) {
      const width = w.label.offsetWidth,
        height = w.label.offsetHeight;
      p.x = Math.max(
        width / 2 + 4,
        Math.min(arena.clientWidth - width / 2 - 4, p.x),
      );
      while (
        labelBoxes.some(
          (b) =>
            Math.abs(b.x - p.x) < (b.width + width) / 2 + 3 &&
            Math.abs(b.y - p.y) < Math.max(b.height, height) + 3,
        )
      )
        p.y -= height + 5;
      labelBoxes.push({ x: p.x, y: p.y, width, height });
    }
    w.label.style.left = p.x + "px";
    w.label.style.top = p.y + "px";
  }
  updateAimHUD();
  $("#turn-banner").classList.toggle("shown", bannerTime > 0 && !menu.open);
  $("#timer").innerHTML = `${Math.max(0, Math.ceil(time))}<small> SEC</small>`;
  if (now > announceUntil) $("#announcement").style.opacity = 0;
  waterLines.forEach(
    (l, i) => (l.position.x = ((i * 53 + now * 0.004) % 1250) - 25),
  );
  motes.forEach((m, i) => {
    m.position.x = (i * 127 + now * 0.007) % W;
    m.position.y = 150 + ((i * 73) % 450) + Math.sin(now * 0.0007 + i) * 12;
  });
  const shake = reducedMotion ? 0 : Math.max(0, shakeUntil - now) / 350;
  camera.position.x = shake * Math.sin(now * 0.09) * 5;
  camera.position.y = shake * Math.cos(now * 0.07) * 4;
  renderer.render(scene, camera);
}
function setWeapon(kind) {
  weapon = kind;
  document
    .querySelectorAll("[data-weapon]")
    .forEach((b) => b.classList.toggle("selected", b.dataset.weapon === kind));
}
$("#angle").addEventListener("input", (e) => {
  angle = +e.target.value;
  updateSliders();
});
$("#power").addEventListener("input", (e) => {
  power = +e.target.value;
  updateSliders();
});
$("#fire").onclick = () => {
  if (canAct()) fire();
};
$("#jump").onclick = jump;
document.querySelectorAll("[data-weapon]").forEach(
  (b) =>
    (b.onclick = () => {
      if (canAct()) setWeapon(b.dataset.weapon);
    }),
);
document.querySelectorAll("[data-move]").forEach((b) => {
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (canAct()) {
      move = +b.dataset.move;
      b.setPointerCapture(e.pointerId);
    }
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    b.addEventListener(event, () => (move = 0));
});
let aiming = false;
function pointerAim(e) {
  if (!canAct()) return;
  const rect = arena.getBoundingClientRect(),
    x = ((e.clientX - rect.left) / rect.width) * W,
    y = H - ((e.clientY - rect.top) / rect.height) * H,
    w = worms[current];
  angle = Math.max(
    -85,
    Math.min(
      265,
      (() => {
        const a = (Math.atan2(y - shot(w).pivot.y, x - w.x) * 180) / Math.PI;
        return a < -90 ? a + 360 : a;
      })(),
    ),
  );
  power = Math.max(15, Math.min(100, Math.hypot(x - w.x, y - w.y) / 4));
  updateSliders();
}
arena.addEventListener("pointerdown", (e) => {
  aiming = true;
  arena.setPointerCapture(e.pointerId);
  pointerAim(e);
});
arena.addEventListener("pointermove", (e) => {
  if (aiming) pointerAim(e);
});
for (const event of ["pointerup", "pointercancel"])
  arena.addEventListener(event, () => (aiming = false));
window.addEventListener("keydown", (e) => {
  if (["INPUT", "SELECT"].includes(document.activeElement.tagName) || !canAct())
    return;
  if (["ArrowLeft", "ArrowRight", "ArrowUp", " "].includes(e.key))
    e.preventDefault();
  if (e.key === "ArrowLeft" || e.key === "a") move = -1;
  if (e.key === "ArrowRight" || e.key === "d") move = 1;
  if ((e.key === "ArrowUp" || e.key === "w") && !e.repeat) jump();
  if (e.key === " " && !e.repeat) fire();
  if (e.key.toLowerCase() === "q") {
    angle = Math.min(265, angle + 2);
    updateSliders();
  }
  if (e.key.toLowerCase() === "e") {
    angle = Math.max(-85, angle - 2);
    updateSliders();
  }
  if (e.key === "1") setWeapon("rocket");
  if (e.key === "2") setWeapon("grenade");
});
window.addEventListener("keyup", (e) => {
  if (["ArrowLeft", "ArrowRight", "a", "d"].includes(e.key)) move = 0;
});
window.addEventListener("blur", () => (move = 0));
document.addEventListener("visibilitychange", () => {
  move = 0;
  last = performance.now();
});
$("#help").onclick = () => {
  $(".instructions").open = true;
  menu.showModal();
  updateUI();
};
$("#restart").onclick = () => {
  $(".instructions").open = false;
  menu.showModal();
  updateUI();
};
$("#sound").onclick = () => {
  sound = !sound;
  $("#sound").setAttribute("aria-pressed", String(sound));
  $("#sound").style.color = sound ? "#c3eb87" : "";
  tone(440);
};
$("#start").onclick = () => {
  reset();
};
menu.addEventListener("close", () => {
  if (phase === "menu") reset();
  updateUI();
});
reset();
menu.showModal();
updateUI();
resize();
requestAnimationFrame(frame);
// Read-only diagnostics for regression checks and reproducible bug reports.
window.siege = {
  getState: () => ({
    assetsReady,
    aim: lastAim,
    phase,
    team,
    round,
    wind,
    explosions,
    weapon,
    terrainPixels: terrain.data.reduce((a, b) => a + b, 0),
    worms: worms.map(({ name, hp, x, y, ground, hurt, hits, recoil, rig }) => ({
      name,
      hp,
      x,
      y,
      ground,
      hurt,
      hits,
      recoil,
      weaponRotation: rig.pivot.rotation.z,
      pose: hurt > 0.35 ? "hurt" : recoil > 0 ? "fire" : "idle",
    })),
    projectile: projectile ? { x: projectile.x, y: projectile.y } : null,
  }),
};
