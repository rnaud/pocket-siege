import {
  paintNativeHUDFrame,
  paintNativeTeamHealth,
} from "./armageddon/hud-frame.js";
import { loadNativeFont, paintNativeText } from "./armageddon/font.js";

const frames = new Set();
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
  controls.append(document.querySelector("#special-weapons"));
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
    if (event.key === "Escape") closeInventory();
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
  frame(document.querySelector("#menu"), true);
  document.querySelector(".team-lime b").textContent = "MOSS";
  document.querySelector(".team-coral b").textContent = "CORAL";
  for (const [selector, fontName] of [
    [".team-lime b", "stdgrn1"],
    [".team-coral b", "stdred1"],
  ]) {
    const label = document.querySelector(selector);
    loadNativeFont(fontName)
      .then((font) => {
        const canvas = document.createElement("canvas");
        canvas.className = "native-team-name";
        canvas.setAttribute("aria-hidden", "true");
        label.setAttribute("aria-label", label.textContent);
        paintNativeText(canvas, font, label.textContent);
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
    button.append(key);
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
    const health = panel.querySelector(".native-team-health");
    if (health)
      paintNativeTeamHealth(health, hp, 300, t ? "#ff8080" : "#80ff80");
    panel.setAttribute(
      "aria-label",
      `${t ? "Coral" : "Moss"}: ${hp} health, ${alive} worms alive`,
    );
  });
}
