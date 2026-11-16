import { decodeSprite, spriteFrameRGBA } from "./sprite.js";
const $ = (s) => document.querySelector(s),
  base = `${import.meta.env.BASE_URL}armageddon/`;
const [sprites, effects, voices] = await Promise.all(
  ["sprites", "sounds", "voices"].map(async (name) => {
    const response = await fetch(`${base}${name}.json`);
    if (!response.ok) throw new Error(name);
    return response.json();
  }),
);
function options(select, values) {
  select.replaceChildren(...values.map((value) => new Option(value, value)));
}
options($("#sprite"), sprites);
$("#sprite").value = "wbrth1";
for (const bank of Object.keys(voices))
  $("#bank").add(new Option(bank.toUpperCase(), bank));
let current,
  paused = false,
  frame = 0,
  last = 0,
  generation = 0;
function draw() {
  if (!current) return;
  const canvas = $("#preview");
  canvas.width = current.width;
  canvas.height = current.height;
  canvas.style.width = `${current.width * Number($("#scale").value)}px`;
  canvas.style.height = `${current.height * Number($("#scale").value)}px`;
  canvas
    .getContext("2d")
    .putImageData(
      new ImageData(
        spriteFrameRGBA(current, frame),
        current.width,
        current.height,
      ),
      0,
      0,
    );
  $("#frame").value = frame;
  $("#details").textContent =
    `${$("#sprite").value} · ${current.width} × ${current.height} pixels · FRAME ${frame + 1} / ${current.frames.length} · preview 25 fps`;
}
async function load() {
  const token = ++generation;
  try {
    const response = await fetch(`${base}sprites/${$("#sprite").value}.spr`);
    if (!response.ok) throw new Error("Sprite unavailable");
    const sprite = decodeSprite(await response.arrayBuffer());
    if (token !== generation) return;
    current = sprite;
    frame = 0;
    $("#frame").max = sprite.frames.length - 1;
    draw();
  } catch (error) {
    $("#status").textContent = error.message;
  }
}
$("#sprite").onchange = load;
$("#scale").onchange = draw;
$("#pause").onclick = () => {
  paused = !paused;
  $("#pause").textContent = paused ? "RESUME" : "PAUSE";
};
$("#frame").oninput = () => {
  paused = true;
  $("#pause").textContent = "RESUME";
  frame = Number($("#frame").value);
  draw();
};
function animate(now) {
  requestAnimationFrame(animate);
  if (current && !paused && now - last >= 40) {
    frame = (frame + 1) % current.frames.length;
    last = now;
    draw();
  }
}
function selectSound() {
  $("#audio").src =
    $("#bank").value === "effects"
      ? `${base}sounds/${$("#sound").value}`
      : `${base}voices/${$("#bank").value}/${$("#sound").value}`;
}
function selectBank() {
  options(
    $("#sound"),
    $("#bank").value === "effects" ? effects : voices[$("#bank").value],
  );
  selectSound();
}
$("#bank").onchange = selectBank;
$("#sound").onchange = selectSound;
$("#play").onclick = () =>
  $("#audio")
    .play()
    .catch((error) => {
      $("#status").textContent = error.message;
    });
$("#status").textContent =
  `${sprites.length} animations · ${effects.length} effects · ${Object.keys(voices).length} voice banks`;
selectBank();
await load();
requestAnimationFrame(animate);
