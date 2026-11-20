// Graphics options sheet. Every option defaults to the original presentation.
import { GRAPHICS_OPTIONS, isOriginalGraphics } from "./fx.js";
import "./graphics.css";

export function mountGraphicsPanel({ get, change, toggleAll }) {
  const dialog = document.createElement("dialog");
  dialog.id = "graphics";
  dialog.setAttribute("aria-label", "Graphics options");
  const title = document.createElement("h2");
  title.textContent = "GRAPHICS";
  const note = document.createElement("p");
  note.textContent = "Presentation only: none of these change how a match plays.";
  // Master switch: every new effect on or off at once.
  const master = document.createElement("button");
  master.type = "button"; master.id = "gfx-master"; master.className = "graphics-master";
  master.addEventListener("click", () => { toggleAll(); sync(); });
  const fields = document.createElement("div");
  fields.className = "graphics-fields";
  const selects = {};
  for (const [key, option] of Object.entries(GRAPHICS_OPTIONS)) {
    const label = document.createElement("label");
    label.textContent = option.label.toUpperCase();
    const select = document.createElement("select");
    select.id = `gfx-${key}`;
    label.htmlFor = select.id;
    for (const [value, text] of Object.entries(option.values)) select.add(new Option(text, value));
    select.addEventListener("change", () => change({ [key]: select.value }));
    selects[key] = select;
    fields.append(label, select);
  }
  const actions = document.createElement("div");
  actions.className = "graphics-actions";
  const close = document.createElement("button");
  close.type = "button"; close.id = "gfx-close"; close.textContent = "CLOSE";
  close.addEventListener("click", () => dialog.close());
  actions.append(close);
  dialog.append(title, note, master, fields, actions);
  document.body.append(dialog);
  // A click on the dimmed area outside the sheet closes it.
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  function sync() {
    const settings = get();
    for (const [key, select] of Object.entries(selects)) select.value = settings[key];
    const on = !isOriginalGraphics(settings);
    master.setAttribute("aria-pressed", String(on));
    master.textContent = on ? "NEW EFFECTS: ON  ·  SHIFT+F8" : "NEW EFFECTS: OFF  ·  SHIFT+F8";
  }
  return {
    sync,
    open() { sync(); if (!dialog.open) dialog.showModal(); },
    close() { if (dialog.open) dialog.close(); },
  };
}
