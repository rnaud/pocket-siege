import { createWater } from "./water.js";
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
  bodyBlocked,
  hitsWorm,
  blastImpulse,
  walkWorm,
  stepWorm,
  terrainNormal,
  reflectVelocity,
  chargePower,
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
  power = 0,
  aiWait = 0,
  sound = false,
  audio,
  announceUntil = 0,
  last = performance.now(),
  accumulator = 0,
  explosions = 0,
  shakeUntil = 0;
let aiPower = 100;
let charging = false,
  chargeSeconds = 0,
  chargeSource = null,
  aimInput = 0,
  retreat = 0,
  fuse = 3,
  bounce = 0.55,
  firedPower = 0,
  shotCount = 0,
  lastJump = { kind: null, time: -1 },
  jumpClock = 0;
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
const water = createWater(W, WATER);
group.add(water);
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
    y:
      Math.max(...[-16, -8, 0, 8, 16].map((dx) => terrain.surface(x + dx))) +
      12,
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
    ground: false,
    knocked: false,
    deathPending: false,
    drowned: false,
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
function updateAimHUD() {
  const visible = phase === "aim" && !menu.open && worms[current]?.hp > 0;
  aimHUD.guide.style.display = visible ? "" : "none";
  if (visible) {
    const geometry = shot(worms[current]);
    const origin = screen(geometry.pivot.x, geometry.pivot.y);
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
    aimHUD.text.textContent = charging
      ? `${Math.round(power)}%`
      : `${Math.round(angle)}°`;
    aimHUD.charge.style.display = charging ? "" : "none";
    aimHUD.charge.setAttribute("stroke-dasharray", `${power * 1.508} 150.8`);
    lastAim = { ...geometry, reticle: target, angle };
  }
  aimHUD.tag.hidden = !projectile;
  if (projectile) {
    const p = screen(projectile.x, projectile.y);
    aimHUD.tag.style.left =
      Math.max(48, Math.min(arena.clientWidth - 48, p.x)) + "px";
    aimHUD.tag.style.top =
      Math.max(14, Math.min(arena.clientHeight - 25, p.y - 22)) + "px";
    aimHUD.tag.textContent = ["grenade", "sticky"].includes(projectile.kind)
      ? `✹ ${Math.max(0, projectile.fuse - projectile.age).toFixed(1)}s`
      : p.y < 0
        ? projectile.kind === "mortar"
          ? "↑ MORTAR"
          : "↑ ROCKET"
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
  cancelCharge();
  move = 0;
  aimInput = 0;
  retreat = 0;
  shotCount = 0;
  fuse = 3;
  bounce = 0.55;
  $("#fuse").value = "3";
  $("#bounce").value = "0.55";
  lastJump = { kind: null, time: -1 };
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
  for (let i = 0; i < 240; i++)
    for (const w of worms) stepWorm(w, terrain, 1 / 120);
  for (const w of worms) w.g.position.set(w.x, w.y, 15);
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
  const roster = worms.filter((w) => w.team === team);
  if (!roster.some((w) => w.hp > 0)) return endGame();
  let next = turnCount[team] % roster.length;
  while (roster[next].hp <= 0) next = (next + 1) % roster.length;
  const active = roster[next];
  turnCount[team] = (next + 1) % roster.length;
  current = worms.indexOf(active);
  phase = "aim";
  time = 45;
  wind = (Math.random() - 0.5) * 28;
  angle = team ? 135 : 45;
  active.facing = team ? -1 : 1;
  cancelCharge();
  power = 0;
  retreat = 0;
  aimInput = 0;
  firedPower = 0;
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
  $("#fire").disabled = !canAct() || worms[current]?.knocked;
  $("#angle").disabled = !canAct() || charging;
  document
    .querySelectorAll("[data-weapon],#fuse,#bounce")
    .forEach((b) => (b.disabled = !canAct() || charging));
  document
    .querySelectorAll("[data-move],#jump,#backflip")
    .forEach((b) => (b.disabled = !canMove()));
}
function canAct() {
  return (
    phase === "aim" &&
    !(team === 1 && mode === "ai") &&
    !menu.open &&
    worms[current]?.hp > 0
  );
}
function canMove() {
  return (
    (canAct() ||
      (retreat > 0 && !(team === 1 && mode === "ai") && !menu.open)) &&
    !charging &&
    worms[current]?.hp > 0 &&
    !worms[current]?.knocked
  );
}
function updateSliders() {
  $("#angle").value = angle;
  $("#angle-value").textContent = Math.round(angle) + "°";
  $("#fire").classList.toggle("charging", charging);
  $("#fire-label").textContent = charging ? "RELEASE TO FIRE" : "HOLD TO FIRE";
}
function startCharge(source) {
  if (charging || !canAct() || !worms[current].ground || worms[current].knocked)
    return;
  charging = true;
  chargeSeconds = 0;
  power = 0;
  move = 0;
  aimInput = 0;
  chargeSource = source;
  updateSliders();
  updateUI();
}
function cancelCharge() {
  if (chargeSource === "ai") aiWait = 0.3;
  charging = false;
  chargeSeconds = 0;
  power = 0;
  chargeSource = null;
}
function releaseCharge(source) {
  if (!charging || source !== chargeSource) return;
  charging = false;
  chargeSource = null;
  if (canAct()) fire();
  updateSliders();
  updateUI();
}
function turnFacing(direction) {
  const w = worms[current];
  if (!w || w.facing === direction) return;
  w.facing = direction;
  angle = 180 - angle;
  updateSliders();
}
function setMove(direction) {
  if (canMove()) {
    move = direction;
    turnFacing(direction);
  }
}
function adjustAim(direction, dt) {
  if (!canAct() || charging) return;
  const facing = worms[current].facing,
    elevation = facing > 0 ? angle : 180 - angle;
  const next = Math.max(-85, Math.min(90, elevation + direction * 65 * dt));
  angle = facing > 0 ? next : 180 - next;
  updateSliders();
}
function injure(w, damage) {
  if (w.hp <= 0 || damage <= 0) return;
  w.hp = Math.max(0, w.hp - damage);
  w.hurt = 1.4;
  w.hits++;
  if (w.hp === 0) w.deathPending = true;
  damageLabel(w, damage);
  if (w === worms[current]) {
    cancelCharge();
    retreat = 0;
    move = 0;
    aimInput = 0;
    if (phase === "aim") {
      phase = "settle";
      shotWait = 0;
    }
  }
  updateUI();
}
function fire() {
  if (phase !== "aim") return;
  const w = worms[current],
    origin = launchPoint(w, angle, weapon),
    v = launch(angle, power);
  if (weapon === "mortar") {
    v.vx *= 0.7;
    v.vy *= 0.7;
  }
  w.recoil = 0.3;
  charging = false;
  chargeSource = null;
  firedPower = power;
  shotCount++;
  retreat = 3;
  projectile = {
    ...origin.muzzle,
    ...v,
    age: 0,
    fuse,
    bounce,
    owner: current,
    sleeping: false,
    stuck: false,
    attached: null,
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
      : weapon === "mortar"
        ? "Mortar away. Heavy impact incoming!"
        : `${weapon === "sticky" ? "Sticky bomb" : "Grenade"} thrown. ${fuse}-second fuse. Retreat!`;
  move = 0;
  shotWait = 0;
  tone(550, 0.2, "triangle");
  updateUI();
}
function explode(x, y, kind) {
  const radius =
    kind === "death"
      ? 28
      : kind === "mortar"
        ? 76
        : kind === "sticky"
          ? 64
          : kind === "grenade"
            ? 60
            : 53;
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
    const factor = blastImpulse(
      w,
      x,
      y,
      radius + 34,
      kind === "death" ? 150 : 290,
    );
    if (factor > 0) {
      const damage = Math.max(
        1,
        Math.round(
          factor * (kind === "death" ? 25 : kind === "mortar" ? 65 : 50),
        ),
      );
      w.hitDirection = Math.sign(w.x - x) || 1;
      injure(w, damage);
      reports.push(`${w.name} −${damage}${w.hp === 0 ? " · KO" : ""}`);
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
function jump(kind = "forward") {
  if (!canMove()) return;
  const w = worms[current];
  const double = lastJump.kind === kind && jumpClock - lastJump.time < 0.28;
  if (!w.ground && !double) return;
  if (kind === "backflip" || (kind === "up" && double)) {
    w.vy = 190;
    w.vx = -w.facing * 50;
  } else if (kind === "up") {
    w.vy = 155;
    w.vx = 0;
  } else {
    w.vy = 140;
    w.vx = w.facing * (double ? -65 : 65);
  }
  w.ground = false;
  lastJump = { kind: double ? null : kind, time: jumpClock };
  tone(300, 0.1);
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
  aiPower = best.power;
  power = 0;
  charging = true;
  chargeSource = "ai";
  chargeSeconds = 0;
  aiWait = Infinity;
  w.facing = Math.cos((angle * Math.PI) / 180) < 0 ? -1 : 1;
  weapon = "rocket";
  setWeapon(weapon);
  updateSliders();
}
function step(dt) {
  if (menu.open || document.hidden) return;
  jumpClock += dt;
  bannerTime = Math.max(0, bannerTime - dt);
  if (retreat > 0) {
    retreat = Math.max(0, retreat - dt);
    if (retreat === 0) {
      move = 0;
      updateUI();
    }
  }
  if (phase === "aim") {
    time -= dt;
    if (time <= 0) {
      cancelCharge();
      phase = "settle";
      shotWait = 0;
      move = 0;
      aimInput = 0;
      updateUI();
    }
    if (charging) {
      chargeSeconds += dt;
      power = chargePower(chargeSeconds);
      updateSliders();
      if (power >= (chargeSource === "ai" ? aiPower : 100)) {
        charging = false;
        chargeSource = null;
        fire();
      }
    }
    if (aimInput) adjustAim(aimInput, dt);
    if (team === 1 && mode === "ai") {
      aiWait -= dt;
      if (aiWait <= 0 && phase === "aim" && worms[current].ground) aiShoot();
    }
  }
  if (canMove() && move) walkWorm(worms[current], terrain, move, dt);
  for (const w of worms) {
    w.hurt = Math.max(0, w.hurt - dt);
    w.recoil = Math.max(0, w.recoil - dt);
    if (w.dying > 0) {
      w.dying = Math.max(0, w.dying - dt);
      if (w.dying === 0 && w.deathPending) {
        w.deathPending = false;
        explode(w.x, w.y + 6, "death");
      }
    }
    w.g.visible = w.hp > 0 || w.deathPending || w.dying > 0;
    if ((w.hp <= 0 && !w.deathPending) || w.dying > 0) continue;
    const result = stepWorm(w, terrain, dt);
    if (result.fallDamage) injure(w, result.fallDamage);
    if (w.y - 10 < WATER || w.x < -30 || w.x > W + 30) {
      w.hp = 0;
      w.deathPending = false;
      w.drowned = true;
      w.dying = 0.65;
      w.hurt = 0.65;
      impactFlash(w.x, WATER);
      tone(150, 0.3);
      damageLabel(w, "SPLASH");
      if (w === worms[current]) {
        cancelCharge();
        retreat = 0;
        move = 0;
        if (phase === "aim") {
          phase = "settle";
          shotWait = 0;
        }
      }
      updateUI();
    } else if (w.deathPending && w.ground && Math.abs(w.vx) < 2) w.dying = 0.8;
    w.g.position.set(w.x, w.y, 15);
  }
  if (phase === "aim") updateUI();
  if (projectile) {
    const p = projectile;
    const ox = p.x,
      oy = p.y;
    if (!p.stuck && p.sleeping && !terrain.solid(p.x, p.y - 4))
      p.sleeping = false;
    if (p.attached) {
      p.x = p.attached.w.x + p.attached.dx;
      p.y = p.attached.w.y + p.attached.dy;
    }
    if (!p.sleeping && !p.stuck)
      integrate(p, dt, p.kind === "rocket" ? wind : 0);
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
            w.hp > 0 && (i !== p.owner || p.age > 0.25) && hitsWorm(w, x, y, 3),
        )
      ) {
        p.x = x;
        p.y = y;
        hit = true;
        break;
      }
    }
    let boom =
      (["rocket", "mortar"].includes(p.kind) && hit) ||
      (["grenade", "sticky"].includes(p.kind) && p.age >= p.fuse);
    if (hit && p.kind === "sticky" && !p.stuck) {
      p.stuck = true;
      p.vx = 0;
      p.vy = 0;
      const w = worms.find(
        (w, i) =>
          w.hp > 0 &&
          (i !== p.owner || p.age > 0.25) &&
          hitsWorm(w, p.x, p.y, 3),
      );
      if (w) p.attached = { w, dx: p.x - w.x, dy: p.y - w.y };
    }
    if (hit && p.kind === "grenade") {
      const victim = worms.find(
        (w, i) =>
          w.hp > 0 &&
          (i !== p.owner || p.age > 0.25) &&
          hitsWorm(w, p.x, p.y, 3),
      );
      let n = victim
        ? { x: p.x - victim.x, y: p.y - victim.y - 17 }
        : terrainNormal(terrain, p.x, p.y, p.vx, p.vy);
      const l = Math.hypot(n.x, n.y) || 1;
      n = { x: n.x / l, y: n.y / l };
      reflectVelocity(p, n, p.bounce);
      p.x = ox + n.x * 0.3;
      p.y = oy + n.y * 0.3;
      if (n.y > 0.5 && Math.hypot(p.vx, p.vy) < 16) {
        p.vx = 0;
        p.vy = 0;
        p.sleeping = true;
      }
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
      updateUI();
    }
  }
  if (phase === "settle") {
    const settled =
      !projectile &&
      retreat <= 0 &&
      worms.every(
        (w) =>
          !w.deathPending &&
          w.dying <= 0 &&
          (w.hp <= 0 || (w.ground && Math.abs(w.vx) < 2 && Math.abs(w.vy) < 2)),
      );
    shotWait = settled ? shotWait + dt : 0;
    if (shotWait > 0.7) nextTurn();
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

    const facing = w.facing * (w.team ? -1 : 1);
    const moving = active && move && canMove() && w.ground;
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
    w.body.material.opacity =
      w.hp > 0 || (w.deathPending && !w.dying) ? 1 : Math.min(1, w.dying * 1.4);
    if (w.hp <= 0 && w.dying > 0) {
      w.body.rotation.z += (1 - w.dying) * w.hitDirection * 1.7;
      w.body.position.y -= 20 * (1 - w.dying);
    }
    const a = active ? angle : w.facing < 0 ? 155 : 25,
      geometry = shot(w, a);
    const correction = w.g.scale.x;
    w.rig.pivot.position.set(
      (geometry.pivot.x - w.x) / correction,
      geometry.pivot.y - w.y,
      10,
    );
    w.rig.pivot.rotation.z = geometry.visualAngle;
    w.rig.pivot.scale.set(
      geometry.rigScale,
      (Math.cos((a * Math.PI) / 180) < 0 ? -1 : 1) * geometry.rigScale,
      1,
    );
    w.rig.pivot.visible = w.hp > 0 && w.hurt < 0.75;
    w.rig.barrel.visible = !active || ["rocket", "mortar"].includes(weapon);
    w.rig.grenade.visible = active && ["grenade", "sticky"].includes(weapon);
    w.rig.grenade.children[0].material.color.setHex(
      weapon === "sticky" ? 0xf393b5 : 0x647944,
    );
    w.rig.barrel.scale.y = active && weapon === "mortar" ? 1.4 : 1;
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
  $("#timer").innerHTML =
    `${retreat > 0 ? Math.ceil(retreat) : Math.max(0, Math.ceil(time))}<small> ${retreat > 0 ? "RETREAT" : "SEC"}</small>`;
  if (now > announceUntil) $("#announcement").style.opacity = 0;
  water.userData.update(reducedMotion ? 0 : now * 0.001);
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
  $("#grenade-settings").hidden = !["grenade", "sticky"].includes(kind);
  document
    .querySelectorAll("[data-weapon]")
    .forEach((b) => b.classList.toggle("selected", b.dataset.weapon === kind));
}
$("#angle").addEventListener("input", (e) => {
  if (!canAct() || charging) return;
  angle = +e.target.value;
  worms[current].facing = Math.cos((angle * Math.PI) / 180) < 0 ? -1 : 1;
  updateSliders();
});
$("#fire").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  startCharge("pointer");
  if (charging) e.currentTarget.setPointerCapture(e.pointerId);
});
$("#fire").addEventListener("pointerup", (e) => {
  e.preventDefault();
  releaseCharge("pointer");
});
for (const event of ["pointercancel", "lostpointercapture"])
  $("#fire").addEventListener(event, () => {
    if (chargeSource === "pointer") {
      cancelCharge();
      updateSliders();
      updateUI();
    }
  });
$("#fire").addEventListener("contextmenu", (e) => e.preventDefault());
$("#jump").onclick = () => jump("forward");
$("#backflip").onclick = () => jump("backflip");
$("#fuse").onchange = (e) => {
  if (canAct() && !charging) fuse = +e.target.value;
};
$("#bounce").onchange = (e) => {
  if (canAct() && !charging) bounce = +e.target.value;
};
document.querySelectorAll("[data-weapon]").forEach(
  (b) =>
    (b.onclick = () => {
      if (canAct() && !charging) setWeapon(b.dataset.weapon);
    }),
);
document.querySelectorAll("[data-move]").forEach((b) => {
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    setMove(+b.dataset.move);
    b.setPointerCapture(e.pointerId);
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    b.addEventListener(event, () => (move = 0));
});
let aiming = false;
function pointerAim(e) {
  if (!canAct() || charging) return;
  const rect = arena.getBoundingClientRect(),
    x = ((e.clientX - rect.left) / rect.width) * W,
    y = H - ((e.clientY - rect.top) / rect.height) * H,
    w = worms[current];
  let a =
    (Math.atan2(y - shot(w).pivot.y, x - shot(w).pivot.x) * 180) / Math.PI;
  if (a < -90) a += 360;
  angle = Math.max(-85, Math.min(265, a));
  w.facing = Math.cos((angle * Math.PI) / 180) < 0 ? -1 : 1;
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
  if (menu.open) return;
  const controlled = [
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    " ",
    "Enter",
    "Backspace",
    "F1",
    "F2",
    "F3",
    "F4",
    "w",
    "s",
    "W",
    "S",
  ];
  if (controlled.includes(e.key)) e.preventDefault();
  if (e.key === " ") {
    if (!e.repeat) startCharge("keyboard");
    return;
  }
  if (e.key === "ArrowLeft" || e.key === "a") setMove(-1);
  if (e.key === "ArrowRight" || e.key === "d") setMove(1);
  if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") aimInput = 1;
  if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") aimInput = -1;
  if (e.key === "Enter" && !e.repeat) jump("forward");
  if (e.key === "Backspace" && !e.repeat) jump("up");
  if (canAct() && !charging) {
    if (e.key === "F1") setWeapon("rocket");
    if (e.key === "F2") setWeapon("grenade");
    if (e.key === "F3") setWeapon("mortar");
    if (e.key === "F4") setWeapon("sticky");
    if (["grenade", "sticky"].includes(weapon) && /^[1-5]$/.test(e.key)) {
      fuse = +e.key;
      $("#fuse").value = fuse;
    }
    if (
      ["grenade", "sticky"].includes(weapon) &&
      ["+", "=", "-"].includes(e.key)
    ) {
      bounce = e.key === "-" ? 0.3 : 0.7;
      $("#bounce").value = bounce;
    }
  }
});
window.addEventListener("keyup", (e) => {
  if (e.key === " ") {
    e.preventDefault();
    releaseCharge("keyboard");
  }
  if (["ArrowLeft", "ArrowRight", "a", "d"].includes(e.key)) move = 0;
  if (["ArrowUp", "ArrowDown", "w", "s", "W", "S"].includes(e.key))
    aimInput = 0;
});
function releaseInputs() {
  move = 0;
  aimInput = 0;
  cancelCharge();
  updateSliders();
  updateUI();
}
window.addEventListener("blur", releaseInputs);
document.addEventListener("visibilitychange", () => {
  releaseInputs();
  last = performance.now();
});
$("#help").onclick = () => {
  releaseInputs();
  $(".instructions").open = true;
  menu.showModal();
  updateUI();
};
$("#restart").onclick = () => {
  releaseInputs();
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
    charging,
    power,
    firedPower,
    shotCount,
    retreat,
    fuse,
    bounce,
    current,
    team,
    round,
    wind,
    explosions,
    weapon,
    terrainPixels: terrain.data.reduce((a, b) => a + b, 0),
    worms: worms.map(
      ({
        name,
        hp,
        x,
        y,
        vx,
        vy,
        ground,
        knocked,
        hurt,
        hits,
        recoil,
        rig,
        deathPending,
      }) => ({
        name,
        hp,
        x,
        y,
        vx,
        vy,
        ground,
        knocked,
        deathPending,
        hurt,
        hits,
        recoil,
        weaponRotation: rig.pivot.rotation.z,
        pose: hurt > 0.35 ? "hurt" : recoil > 0 ? "fire" : "idle",
      }),
    ),
    projectile: projectile
      ? {
          x: projectile.x,
          y: projectile.y,
          vx: projectile.vx,
          vy: projectile.vy,
          age: projectile.age,
          fuse: projectile.fuse,
          kind: projectile.kind,
          stuck: projectile.stuck,
        }
      : null,
  }),
};
