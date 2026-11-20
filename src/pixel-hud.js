import {
  paintNativeHUDFrame,
  paintNativeTeamHealth,
  nativeTeamHighlight,
  nativeTeamListRows,
} from "./armageddon/hud-frame.js";
import { loadNativeFont, paintNativeText } from "./armageddon/font.js";

const frames = new Set();
const teamFonts = new Map();
function frame(element, ornate = false) {
  const canvas = document.createElement("canvas");
  canvas.className = "pixel-panel-frame";
  canvas.setAttribute("aria-hidden", "true");
  element.prepend(canvas);
  const paint = () => {
    const w = Math.ceil(element.clientWidth / 2),
      h = Math.ceil(element.clientHeight / 2);
    if (w < 8 || h < 8) return;
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${w * 2}px`;
    canvas.style.height = `${h * 2}px`;
    paintNativeHUDFrame(canvas, w, h, "#101010");
  };
  const observer = new ResizeObserver(paint);
  observer.observe(element);
  frames.add(observer);
  paint();
}

let meter,
  caption,
  lastPower = -1,
  lastWeapon = "";
export function mountPixelHUD(arena) {
  const controls = document.querySelector(".controls");
  const weaponGrid = document.querySelector(".weapons");
  weaponGrid.append(
    ...document.querySelectorAll("#special-weapons [data-weapon]"),
    ...document.querySelectorAll("#utilities [data-utility]"),
  );
  const inventory = document.createElement("button");
  inventory.id = "inventory-toggle";
  inventory.textContent = "ARSENAL";
  inventory.setAttribute("aria-expanded", "false");
  inventory.setAttribute("aria-controls", "weapon-tray");
  document.querySelector(".weapon-panel").id = "weapon-tray";
  controls.append(inventory);
  const closeInventory = () => {
    controls.classList.remove("inventory-open");
    inventory.setAttribute("aria-expanded", "false");
  };
  document
    .querySelector("#special-toggle")
    .addEventListener("click", closeInventory);
  document
    .querySelector("#utilities-toggle")
    .addEventListener("click", closeInventory);
  inventory.onclick = () => {
    const open = controls.classList.toggle("inventory-open");
    inventory.setAttribute("aria-expanded", String(open));
  };
  document
    .querySelectorAll(".weapons button")
    .forEach((button) => button.addEventListener("click", closeInventory));
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    // A press that closes the tray is consumed; it does not also open the menu.
    if (controls.classList.contains("inventory-open")) event.preventDefault();
    closeInventory();
  });
  const overview = document.createElement("button");
  overview.id = "overview-toggle";
  overview.textContent = "MAP";
  overview.setAttribute("aria-label", "Toggle battlefield overview");
  overview.setAttribute("aria-pressed", "false");
  overview.onclick = () => {
    const on = overview.getAttribute("aria-pressed") !== "true";
    overview.setAttribute("aria-pressed", String(on));
    overview.textContent = on ? "FOLLOW" : "MAP";
    window.dispatchEvent(new CustomEvent("siege-overview", { detail: on }));
  };
  document.querySelector("#restart").before(overview);
  const charge = document.createElement("div");
  charge.id = "worm-charge";
  charge.setAttribute("aria-hidden", "true");
  charge.innerHTML = "<i></i>";
  arena.append(charge);
  const scoreboard = document.querySelector(".match-bar");
  arena.append(scoreboard);
  document.querySelector(".turn").append(document.querySelector("#timer"));
  document.querySelectorAll(".team").forEach((team, i) => {
    const health = document.createElement("canvas");
    health.className = "native-team-health";
    health.setAttribute("aria-hidden", "true");
    team.querySelector(".health-track").append(health);
  });
  document.body.classList.add("native-game-hud");
  arena.append(document.querySelector("#wind"));
  frame(document.querySelector(".controls"), true);
  document.querySelector(".team-lime b").textContent = "MOSS";
  document.querySelector(".team-coral b").textContent = "CORAL";
  for (const [selector, fontName] of [
    [".team-lime b", "stdgrn1"],
    [".team-coral b", "stdred1"],
  ]) {
    const label = document.querySelector(selector);
    Promise.all([loadNativeFont(fontName), loadNativeFont("stdwht1")])
      .then(([font, white]) => {
        teamFonts.set(fontName, font);
        teamFonts.set("stdwht1", white);
        const canvas = document.createElement("canvas");
        canvas.className = "native-team-name";
        canvas.setAttribute("aria-hidden", "true");
        label.setAttribute("aria-label", label.textContent);
        paintNativeText(canvas, font, label.textContent, 1);
        label.replaceChildren(canvas);
        label.dataset.nativeFont = fontName;
      })
      .catch((error) => console.warn("Native team font unavailable", error));
  }
  document.querySelector("#restart").textContent = "MENU";
  document.querySelector(".brand small").textContent = "";
  document.querySelector(".move-heading > span").textContent = "MOVE";
  document.querySelector("#utilities-toggle").textContent = "KIT";
  caption = document.querySelector(".loadout-heading > span");
  caption.textContent = "BAZOOKA";
  document.querySelector('.slider-label label[for="angle"]').textContent =
    "AIM";
  document.querySelectorAll(".weapons button").forEach((button, i) => {
    const label = document.createElement("span");
    label.className = "weapon-name";
    for (const node of [...button.childNodes])
      if (node.nodeType === Node.TEXT_NODE) {
        label.textContent += node.textContent.trim();
        node.remove();
      }
    button.append(label);
    button.setAttribute("aria-label", label.textContent.trim());
    const key = document.createElement("span");
    key.className = "slot-key";
    key.textContent = ["F1", "F2", "F3", "F4", "M"][i];
    key.setAttribute("aria-hidden", "true");
    if (i < 5) button.append(key);
    button.title = label.textContent.trim();
  });
  const power = document.createElement("div");
  power.className = "power-panel";
  power.innerHTML =
    '<div class="power-heading">POWER <output id="power-value">0%</output></div><div id="power-meter" role="progressbar" aria-label="Shot power" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
    "<i></i>".repeat(10) +
    "</div>";
  document.querySelector("#fire").before(power);
  meter = power.querySelector("#power-meter");
  document.querySelector("footer").innerHTML =
    "<span><kbd>← →</kbd> MOVE</span><span><kbd>ENTER</kbd> JUMP</span><span><kbd>W S</kbd> AIM</span><span><kbd>F1–F4 / M</kbd> WEAPON</span><span><kbd>SPACE</kbd> HOLD / RELEASE</span>";
}
export function updateHudPower(power, weapon) {
  const next = Math.round(power);
  if (meter && next !== lastPower) {
    lastPower = next;
    const charge = document.querySelector("#worm-charge");
    charge.classList.toggle("visible", next > 0);
    charge.firstElementChild.style.width = `${next}%`;
    meter.setAttribute("aria-valuenow", String(next));
    document.querySelector("#power-value").textContent = `${next}%`;
    [...meter.children].forEach((pip, i) =>
      pip.classList.toggle("lit", i < Math.ceil(next / 10)),
    );
  }
  if (caption && weapon !== lastWeapon) {
    lastWeapon = weapon;
    caption.textContent =
      document.querySelector(`.weapons [data-weapon="${weapon}"] .weapon-name`)
        ?.textContent || weapon.replaceAll("-", " ");
  }
}
export function updateHudTeams(worms, activeTeam) {
  document.querySelectorAll(".team").forEach((panel, t) => {
    const alive = worms.filter((w) => w.team === t && w.hp > 0).length;
    panel.classList.toggle("active-team", t === activeTeam);
    const hp = worms
      .filter((w) => w.team === t)
      .reduce((total, w) => total + Math.max(0, w.hp), 0);

    panel.setAttribute(
      "aria-label",
      `${t ? "Coral" : "Moss"}: ${hp} health, ${alive} worms alive`,
    );
  });
}

export function updateHudTeamPanel(progress, list) {
  // 004EC600 + 004EFDA0: native root-list height and animated child offsets.
  const height = list.order.length * 16;
  document.querySelector(".match-bar").style.setProperty("--team-panel-offset", `${Math.round(height * progress / 65536)}px`);
  const rows = nativeTeamListRows(list);
  document.querySelectorAll(".team").forEach((panel, id) => {
    const row = rows.find(row => row.id === id);
    panel.hidden = !row;
    if (!row) return;
    panel.style.left = `calc(50% + ${8 + Math.round(row.x / 65536)}px)`;
    panel.style.top = `calc(100% - var(--team-panel-offset, 0px) + ${Math.round(row.y / 65536)}px)`;
  });
}

export function updateHudTeamHealth(values, activeTeam = -1, tick = 0) {
  document.querySelectorAll(".team").forEach((panel, team) => {
    const highlight = nativeTeamHighlight(team ? 0 : 2, team === activeTeam, tick);
    const color = highlight.flashing ? "#ffffff" : team ? "#ff8080" : "#80ff80";
    const health = panel.querySelector(".native-team-health");
    if (health) paintNativeTeamHealth(health, values[team], color);
    const name = highlight.font === 15 ? "stdwht1" : team ? "stdred1" : "stdgrn1";
    const label = panel.querySelector("b");
    const canvas = label.querySelector(".native-team-name");
    if (canvas && teamFonts.has(name) && label.dataset.nativeFont !== name) {
      paintNativeText(canvas, teamFonts.get(name), label.getAttribute("aria-label"), 1);
      label.dataset.nativeFont = name;
    }
  });
}
