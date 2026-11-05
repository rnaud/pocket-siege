import * as THREE from "three";
import "./style.css";
import { Terrain, W, H, WATER, launch, integrate } from "./physics.js";
const $ = (s) => document.querySelector(s);
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
  explosions = 0;
announceUntil = 0;
setWeapon("rocket");
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
// Layered silhouettes keep the battlefield legible without image assets.
flatShape(
  [
    [0, 0],
    [0, 300],
    [90, 375],
    [160, 340],
    [265, 465],
    [355, 370],
    [445, 407],
    [560, 320],
    [680, 440],
    [815, 340],
    [935, 430],
    [1045, 345],
    [1200, 390],
    [1200, 0],
  ],
  "#405b6b",
  -130,
);
flatShape(
  [
    [0, 0],
    [0, 220],
    [120, 300],
    [240, 270],
    [335, 340],
    [430, 290],
    [580, 360],
    [720, 280],
    [850, 330],
    [980, 275],
    [1100, 325],
    [1200, 270],
    [1200, 0],
  ],
  "#3d606b",
  -110,
);
const disc = new THREE.Mesh(
  new THREE.CircleGeometry(43, 64),
  new THREE.MeshBasicMaterial({
    color: 0xc5d9cc,
    transparent: true,
    opacity: 0.6,
  }),
);
disc.position.set(960, 505, -180);
group.add(disc);
for (let i = 0; i < 18; i++) {
  const cloud = new THREE.Mesh(
    new THREE.PlaneGeometry(60 + (i % 4) * 35, 2),
    new THREE.MeshBasicMaterial({
      color: 0xa8c6cc,
      transparent: true,
      opacity: 0.12,
    }),
  );
  cloud.position.set((i * 173) % 1200, 405 + ((i * 29) % 200), -90);
  group.add(cloud);
}
const water = flatShape(
  [
    [0, 0],
    [1200, 0],
    [1200, WATER],
    [0, WATER],
  ],
  "#508a96",
  20,
);
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
  const image = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!terrain.solid(x, y)) continue;
      const i = ((H - 1 - y) * W + x) * 4;
      const grass = !terrain.solid(x, y + 7);
      const rim = !terrain.solid(x, y + 15);
      const noise = ((x * 13 + y * 31) % 19) - 9;
      const stripe = Math.sin(y * 0.09 + x * 0.005) > 0.6;
      let c = grass
        ? [145, 177, 93]
        : rim
          ? [85, 116, 68]
          : stripe
            ? [95, 83, 66]
            : [109, 94, 72];
      if ((x * 73 + y * 37) % 503 < 8 && !grass) c = [137, 121, 91];
      image.data[i] = c[0] + noise;
      image.data[i + 1] = c[1] + noise;
      image.data[i + 2] = c[2] + noise;
      image.data[i + 3] = 255;
    }
  ctx.putImageData(image, 0, 0);
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
  g.add(sphere(9, 0xeac4a2, 0, 1, 3, 1, 1.3), sphere(10, 0xf5d2b0, 0, 12, 3));
  g.add(sphere(10, colors[t], 0, 19, 3, 1, 0.4));
  for (const ex of [-3.8, 3.8]) {
    g.add(sphere(3, 0xffffff, ex, 13, 11, 1, 1.15));
    g.add(sphere(1.35, 0x152c32, ex + 1, 13, 13.5));
  }
  g.add(sphere(4, 0xb67f68, 1, 6, 11, 1, 0.3));
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
    label,
    ground: true,
  };
}
const aimGeo = new THREE.BufferGeometry();
const aimLine = new THREE.Line(
  aimGeo,
  new THREE.LineDashedMaterial({
    color: 0xe5f4c4,
    dashSize: 4,
    gapSize: 7,
    transparent: true,
    opacity: 0.7,
  }),
);
aimLine.position.z = 30;
group.add(aimLine);
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
  explosions = 0;
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
    w.g.visible = w.hp > 0;
    w.label.style.display = w.hp > 0 ? "block" : "none";
    w.label.querySelector("strong").textContent = w.hp;
    w.label.classList.toggle("active", i === current && phase !== "over");
  }
  const disabled = !canAct();
  $("#fire").disabled = disabled;
  $("#angle").disabled = disabled;
  $("#power").disabled = disabled;
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
    v = launch(angle, power);
  const r = (angle * Math.PI) / 180;
  projectile = {
    x: w.x + Math.cos(r) * 19,
    y: w.y + 12 + Math.sin(r) * 19,
    ...v,
    age: 0,
    kind: weapon,
    mesh: sphere(
      weapon === "rocket" ? 4 : 6,
      weapon === "rocket" ? 0xffe4a0 : 0xa5bf76,
      0,
      0,
      40,
    ),
  };
  group.add(projectile.mesh);
  phase = "flight";
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
  for (const w of worms) {
    if (w.hp <= 0) continue;
    const d = Math.hypot(w.x - x, w.y - y);
    if (d < radius + 40) {
      const damage = Math.max(1, Math.round((1 - d / (radius + 40)) * 65));
      w.hp = Math.max(0, w.hp - damage);
      w.vx = ((w.x - x) / Math.max(d, 1)) * 170;
      w.vy = 100 + (1 - d / (radius + 40)) * 110;
      w.ground = false;
      damageLabel(w, damage);
    }
  }
  updateUI();
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
  aimLine.visible = false;
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
      const r = (a * Math.PI) / 180,
        q = {
          x: w.x + Math.cos(r) * 19,
          y: w.y + 12 + Math.sin(r) * 19,
          ...launch(a, p),
        };
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
  if (menu.open) return;
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
    let hit = false;
    const distance = Math.hypot(p.x - ox, p.y - oy),
      steps = Math.max(1, Math.ceil(distance / 2));
    for (let s = 1; s <= steps; s++) {
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
  disc.scale.x = correction;
  for (const w of worms) w.g.scale.x = correction;
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
  for (const w of worms) {
    const p = screen(w.x, w.y + 36);
    w.label.style.left = p.x + "px";
    w.label.style.top = p.y + "px";
  }
  aimLine.visible = phase === "aim";
  if (aimLine.visible && worms[current]) {
    const w = worms[current],
      r = (angle * Math.PI) / 180,
      p = {
        x: w.x + Math.cos(r) * 19,
        y: w.y + 12 + Math.sin(r) * 19,
        ...launch(angle, power),
      },
      points = [];
    for (let i = 0; i < 22; i++) {
      points.push(new THREE.Vector3(p.x, p.y, 0));
      integrate(p, 0.035, wind);
    }
    aimGeo.setFromPoints(points);
    aimLine.computeLineDistances();
  }
  $("#timer").innerHTML = `${Math.max(0, Math.ceil(time))}<small> SEC</small>`;
  if (now > announceUntil) $("#announcement").style.opacity = 0;
  waterLines.forEach(
    (l, i) => (l.position.x = ((i * 53 + now * 0.004) % 1250) - 25),
  );
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
    5,
    Math.min(175, (Math.atan2(y - w.y - 12, x - w.x) * 180) / Math.PI),
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
  menu.showModal();
  updateUI();
};
$("#restart").onclick = () => {
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
    phase,
    team,
    round,
    wind,
    explosions,
    weapon,
    terrainPixels: terrain.data.reduce((a, b) => a + b, 0),
    worms: worms.map(({ name, hp, x, y, ground }) => ({
      name,
      hp,
      x,
      y,
      ground,
    })),
    projectile: projectile ? { x: projectile.x, y: projectile.y } : null,
  }),
};
