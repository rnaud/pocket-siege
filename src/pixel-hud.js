import { pixelBrush } from "./pixel-draw.js";

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
    const { polygon, rect } = pixelBrush(canvas.getContext("2d"));
    const shape = (inset, color) => {
      const x = inset,
        y = inset,
        r = w - 1 - inset,
        b = h - 1 - inset,
        k = ornate ? 5 : 3;
      polygon(
        [
          [x + k, y],
          [r - k, y],
          [r - k, y + 2],
          [r - 2, y + 2],
          [r - 2, y + k],
          [r, y + k],
          [r, b - k],
          [r - 2, b - k],
          [r - 2, b - 2],
          [r - k, b - 2],
          [r - k, b],
          [x + k, b],
          [x + k, b - 2],
          [x + 2, b - 2],
          [x + 2, b - k],
          [x, b - k],
          [x, y + k],
          [x + 2, y + k],
          [x + 2, y + 2],
          [x + k, y + 2],
        ],
        color,
      );
    };
    shape(0, "#211c2b");
    shape(1, "#a8755b");
    shape(2, "#efc58b");
    shape(3, "#5e4055");
    shape(4, "#38283f");
    rect(8, 4, w - 16, 1, "#956577");
    if (ornate) {
      for (const x of [5, w - 7]) {
        rect(x, 8, 2, 2, "#edc98b");
        rect(x, h - 11, 2, 2, "#926277");
      }
    }
  };
  const observer = new ResizeObserver(paint);
  observer.observe(element);
  frames.add(observer);
  paint();
}

function roster(parent, team) {
  const group = document.createElement("div");
  group.className = "team-roster";
  group.setAttribute("aria-label", "3 worms alive");
  for (let i = 0; i < 3; i++) {
    const c = document.createElement("canvas");
    c.width = 8;
    c.height = 8;
    c.setAttribute("aria-hidden", "true");
    const { rect } = pixelBrush(c.getContext("2d"));
    rect(3, 1, 4, 5, team ? "#ee9c89" : "#b8bf6e");
    rect(2, 5, 4, 2, team ? "#ee9c89" : "#b8bf6e");
    rect(0, 5, 3, 1, team ? "#b56d76" : "#828747");
    rect(4, 2, 1, 2, "#fff0bd");
    rect(6, 2, 1, 2, "#fff0bd");
    group.append(c);
  }
  parent.append(group);
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
    frame(team, true);
    roster(team, i);
  });
  frame(document.querySelector(".turn"));
  frame(document.querySelector(".controls"), true);
  frame(document.querySelector("#menu"), true);
  document.querySelector(".team-lime b").textContent = "MOSS";
  document.querySelector(".team-coral b").textContent = "CORAL";
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
    const roster = panel.querySelector(".team-roster");
    roster.setAttribute("aria-label", `${alive} worms alive`);
    [...roster.children].forEach((icon, i) =>
      icon.classList.toggle("lost", i >= alive),
    );
  });
}
