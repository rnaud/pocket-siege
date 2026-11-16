// Full-screen front end built around the original imported menu bitmaps.
// Existing controls retain their IDs and native form/dialog behavior.
export function mountArmageddonFrontend() {
  const menu = document.querySelector("#menu"),
    form = menu.querySelector("form");
  const grid = form.querySelector(".menu-grid");
  const fields = [...grid.children];
  const portrait = form.querySelector(".menu-art");
  const manual = form.querySelector(".instructions");
  const delays = form.querySelector(".weapon-delay-options");
  const meta = form.querySelector(".menu-meta");
  const header = document.createElement("header");
  header.className = "frontend-header";
  header.innerHTML =
    '<div class="frontend-title">POCKET SIEGE</div><div class="frontend-subtitle">MATCH SETUP</div>';
  const content = document.createElement("div");
  content.className = "frontend-panels";
  const panel = (title, className) => {
    const el = document.createElement("section");
    el.className = `frontend-panel ${className}`;
    const h = document.createElement("h2");
    h.textContent = title;
    el.append(h);
    content.append(el);
    return el;
  };
  const game = panel("GAME", "frontend-game");
  const art = document.createElement("img");
  art.className = "frontend-game-art";
  art.alt = "";
  const updateArt = () => {
    art.src = `${import.meta.env.BASE_URL}armageddon/media/graphics/mainmenu/${document.querySelector("#mode").value === "local" ? "multiplayer" : "singleplayer"}.bmp`;
  };
  game.append(art, ...fields.slice(0, 3), portrait);
  const terrain = panel("LANDSCAPE", "frontend-terrain");
  const terrainArt = document.createElement("img");
  terrainArt.className = "frontend-terrain-art";
  terrainArt.alt = "";
  terrainArt.src = `${import.meta.env.BASE_URL}armageddon/media/graphics/multiplay/custterrain.bmp`;
  terrain.append(terrainArt, fields[3]);
  const rules = panel("GAME OPTIONS", "frontend-rules");
  rules.append(...fields.slice(4), delays);
  const footer = document.createElement("div");
  footer.className = "frontend-footer";
  const actions = document.createElement("div");
  actions.className = "frontend-actions";
  const start = form.querySelector("#start"),
    close = form.querySelector(".close-help");
  start.textContent = "START GAME";
  close.textContent = "RETURN TO GAME";
  actions.append(close, form.querySelector("#surrender"), start);
  footer.append(meta, manual, actions);
  form.replaceChildren(header, content, footer);
  menu.setAttribute("aria-label", "Match setup");
  document.querySelector("#mode").addEventListener("change", updateArt);
  updateArt();
}
