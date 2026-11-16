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

// Complete media catalog, including native terrain and map containers.
const { decodeImage, imageRGBA } = await import("./image.js");
const catalog = await fetch(`${base}media.json`).then((response) => {
  if (!response.ok) throw new Error("Media catalog unavailable");
  return response.json();
});
let media,
  mediaToken = 0;
function drawMedia() {
  if (!media) return;
  const canvas = $("#media-preview"),
    context = canvas.getContext("2d");
  const frame = +$("#media-frame").value;
  canvas.width = media.width;
  canvas.height = media.height;
  const scale = +$("#media-scale").value;
  canvas.style.width = `${media.width * scale}px`;
  canvas.style.height = `${media.height * scale}px`;
  context.imageSmoothingEnabled = false;
  if (media.bitmap) context.drawImage(media.bitmap, 0, 0);
  else {
    const pixels = media.sprite
      ? spriteFrameRGBA(media.sprite, frame)
      : imageRGBA(media.image, $("#media-transparent").checked);
    context.putImageData(
      new ImageData(pixels, media.width, media.height),
      0,
      0,
    );
  }
  $("#media-details").textContent =
    `${media.asset.id} · ${media.width} × ${media.height} original pixels · ${media.asset.format.toUpperCase()} · frame ${frame + 1}/${media.sprite?.frames.length || 1}`;
}
async function loadMedia() {
  const asset = catalog.assets.find(
    (item) => item.id === $("#media-asset").value,
  );
  if (!asset) return;
  const token = ++mediaToken;
  try {
    const response = await fetch(base + asset.path);
    if (!response.ok) throw new Error("Media unavailable");
    let decoded;
    if (asset.format === "bmp") {
      const bitmap = await createImageBitmap(await response.blob());
      decoded = { bitmap, width: bitmap.width, height: bitmap.height };
    } else {
      const buffer = await response.arrayBuffer();
      const image =
        asset.format === "spr" ? decodeSprite(buffer) : decodeImage(buffer);
      decoded = {
        width: image.width,
        height: image.height,
        [asset.format === "spr" ? "sprite" : "image"]: image,
      };
    }
    if (token !== mediaToken) {
      decoded.bitmap?.close();
      return;
    }
    media?.bitmap?.close();
    media = { ...decoded, asset };
    $("#media-frame").value = 0;
    $("#media-frame").max = (media.sprite?.frames.length || 1) - 1;
    drawMedia();
  } catch (error) {
    if (token === mediaToken) $("#media-details").textContent = error.message;
  }
}
function filterMedia() {
  const group = $("#media-group").value,
    query = $("#media-search").value.trim().toLowerCase();
  const filtered = catalog.assets.filter(
    (asset) => (!group || asset.group === group) && asset.id.includes(query),
  );
  options(
    $("#media-asset"),
    filtered.map((asset) => asset.id),
  );
  $("#media-count").textContent =
    `${filtered.length} matches / ${catalog.assets.length} original visual assets`;
  if (filtered.length) loadMedia();
  else {
    mediaToken++;
    $("#media-details").textContent = "No matching assets";
  }
}
$("#media-group").onchange = filterMedia;
$("#media-search").oninput = filterMedia;
$("#media-asset").onchange = loadMedia;
$("#media-frame").oninput = drawMedia;
$("#media-scale").onchange = drawMedia;
$("#media-transparent").onchange = drawMedia;
filterMedia();
