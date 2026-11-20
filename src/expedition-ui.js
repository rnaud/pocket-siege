// Expedition screen: route, squad, supplies and rewards between islands.
// The match itself is started and reported by the host (main.js).
import {
  EXPEDITION_LENGTH, MUTATORS, REWARDS, newRun, routeOptions, chooseIsland, stageConfig,
  resolveBattle, takeReward, expeditionScore, expeditionDailySeed, loadRun, saveRun,
  readBest, recordBest,
} from "./expedition.js";
import "./expedition.css";

const LAYOUT_LABELS = {
  fern: "Open island", highlands: "Rolling highlands", archipelago: "Broken archipelago",
  forts: "Twin forts", caverns: "Caverns", bridges: "Fragile bridges",
};
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const button = (label, className, onClick) => {
  const node = el("button", className, label);
  node.type = "button";
  node.addEventListener("click", onClick);
  return node;
};

export function mountExpedition(host) {
  const dialog = el("dialog");
  dialog.id = "expedition";
  dialog.setAttribute("aria-label", "Expedition");
  document.body.append(dialog);
  let run = loadRun();
  let busy = false, notice = "";

  const commit = (next) => { run = next; saveRun(run); render(); };

  function squadPanel() {
    const panel = el("section", "expedition-squad");
    panel.append(el("h3", null, "SQUAD"));
    for (const worm of run.squad) {
      const card = el("div", `expedition-worm${worm.alive ? "" : " fallen"}`);
      card.append(el("b", null, worm.name), el("span", "expedition-stripes", "★".repeat(worm.stripes)));
      if (worm.alive) {
        const track = el("div", "expedition-health");
        const fill = el("i");
        fill.style.width = `${Math.round((worm.hp / worm.maxHp) * 100)}%`;
        track.append(fill);
        card.append(track, el("small", null, `${worm.hp} / ${worm.maxHp}`));
      } else card.append(el("small", null, "FALLEN"));
      panel.append(card);
    }
    const supplies = el("div", "expedition-supplies");
    supplies.append(el("h3", null, "SUPPLIES"));
    if (!run.rewards.length) supplies.append(el("p", null, "Standard issue only. Win islands to add supplies."));
    const counts = new Map();
    for (const id of run.rewards) counts.set(id, (counts.get(id) ?? 0) + 1);
    for (const [id, count] of counts)
      supplies.append(el("span", "expedition-chip", `${REWARDS[id].label}${count > 1 ? ` ×${count}` : ""}`));
    panel.append(supplies);
    return panel;
  }

  function track() {
    const row = el("ol", "expedition-track");
    for (let i = 0; i < EXPEDITION_LENGTH; i++) {
      const pip = el("li", i < run.index ? "done" : i === run.index && run.status !== "won" ? "here" : "", i === 3 || i === 7 ? "☠" : String(i + 1));
      pip.title = i === 3 || i === 7 ? `Island ${i + 1}: stronghold` : `Island ${i + 1}`;
      row.append(pip);
    }
    return row;
  }

  function islandCard(node, action, label) {
    const config = stageConfig({ ...run, current: node });
    const card = el("article", `expedition-card${node.risky ? " risky" : ""}${node.boss ? " boss" : ""}`);
    card.append(
      el("small", "expedition-kicker", node.boss ? "STRONGHOLD" : node.risky ? "RISKY ROUTE" : "SAFE ROUTE"),
      el("h3", null, node.name),
      el("p", null, `${LAYOUT_LABELS[node.layout] ?? node.layout} · ${node.theme} terrain`),
      el("p", null, `3 ${config.difficulty} worms · ${config.enemyHp} health each`),
    );
    const list = el("ul", "expedition-mutators");
    for (const id of node.mutators) {
      const item = el("li");
      item.append(el("b", null, MUTATORS[id].label), el("span", null, MUTATORS[id].text));
      list.append(item);
    }
    if (!node.mutators.length) list.append(el("li", "plain", "No complications"));
    card.append(list);
    const picks = 1 + (node.risky ? 1 : 0) + (node.boss ? 1 : 0);
    card.append(el("p", "expedition-payout", node.index === EXPEDITION_LENGTH - 1
      ? "Final island" : `Reward: ${picks} supply pick${picks > 1 ? "s" : ""}`));
    card.append(button(label, "expedition-go", action));
    return card;
  }

  async function sail() {
    if (busy) return;
    busy = true; notice = "Charting the island…"; render();
    const started = await host.startStage(stageConfig(run), run);
    busy = false;
    if (started) { notice = ""; if (dialog.open) dialog.close(); }
    else { notice = "The island could not load. Try again."; render(); }
  }

  function body() {
    const main = el("section", "expedition-main");
    if (run.status === "route") {
      main.append(el("h2", null, run.index === 0 ? "Choose your landing" : "Choose the next island"));
      const row = el("div", "expedition-choices");
      routeOptions(run).forEach((node, option) => row.append(islandCard(node, () => {
        if (busy) return;
        commit(chooseIsland(run, option));
        sail();
      }, "SET SAIL")));
      main.append(row);
    } else if (run.status === "battle") {
      main.append(el("h2", null, "Island in progress"));
      const row = el("div", "expedition-choices");
      row.append(islandCard(run.current, sail, "RETURN TO THE ISLAND"));
      main.append(row, el("p", "expedition-note", "Returning restarts this island with the squad as it landed."));
    } else if (run.status === "draft") {
      main.append(el("h2", null, `Island taken. Choose supplies${run.picks > 1 ? ` (${run.picks} picks left)` : ""}`));
      const row = el("div", "expedition-choices");
      run.offers.forEach((id, offer) => {
        const card = el("article", "expedition-card reward");
        card.append(el("h3", null, REWARDS[id].label), el("p", null, REWARDS[id].text),
          button("TAKE", "expedition-go", () => commit(takeReward(run, offer))));
        row.append(card);
      });
      main.append(row);
    } else {
      const won = run.status === "won";
      const score = expeditionScore(run), best = recordBest(score);
      main.append(
        el("h2", null, won ? "Expedition complete" : "The expedition is lost"),
        el("p", "expedition-result", won
          ? `All ${EXPEDITION_LENGTH} islands taken with ${run.squad.filter((worm) => worm.alive).length} of 3 worms standing.`
          : `The squad fell on island ${run.index + 1} of ${EXPEDITION_LENGTH}.`),
        el("p", "expedition-score", `SCORE ${score} · BEST ${best}`),
      );
    }
    return main;
  }

  function intro() {
    const main = el("section", "expedition-main expedition-intro");
    main.append(
      el("h2", null, "Eight islands. One squad."),
      el("p", null, "Sail a chain of generated islands against the computer. Your three worms keep their wounds between battles, earn a stripe (and +10 maximum health) for each island they survive, and rest a little at camp."),
      el("p", null, "After each win, choose a supply that is re-issued on every island for the rest of the run. Risky routes add a complication and pay an extra pick. Islands 4 and 8 are strongholds. Lose a battle and the expedition is over."),
      el("p", "expedition-score", `BEST ${readBest()}`),
    );
    const actions = el("div", "expedition-actions");
    actions.append(
      button("NEW EXPEDITION", "expedition-go", () => commit(newRun(crypto.getRandomValues(new Uint32Array(1))[0]))),
      button("DAILY EXPEDITION", "expedition-go", () => {
        const { key, seed } = expeditionDailySeed();
        commit(newRun(seed, { daily: key }));
      }),
    );
    main.append(actions);
    return main;
  }

  function render() {
    const header = el("header", "expedition-header");
    const title = el("div");
    title.append(el("h1", null, "EXPEDITION"));
    if (run) title.append(el("small", null,
      `${run.daily ? `DAILY ${run.daily}` : `SEED ${run.seed.toString(36).toUpperCase()}`} · SCORE ${expeditionScore(run)}`));
    header.append(title);
    const tools = el("div", "expedition-tools");
    if (run && (run.status === "won" || run.status === "lost"))
      tools.append(button("NEW RUN", "", () => commit(null)));
    else if (run) tools.append(button("ABANDON RUN", "danger", () => {
      if (tools.dataset.confirm === "1") commit(null);
      else { tools.dataset.confirm = "1"; tools.querySelector(".danger").textContent = "CONFIRM ABANDON"; }
    }));
    tools.append(button("← MODES", "", () => { dialog.close(); host.leave?.(); }));
    header.append(tools);
    const content = el("div", "expedition-content");
    if (run) content.append(squadPanel(), body()); else content.append(intro());
    const status = el("p", "expedition-notice", notice);
    status.setAttribute("role", "status");
    dialog.replaceChildren(header, ...(run ? [track()] : []), content, status);
  }

  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    dialog.close(); host.leave?.();
  });

  return {
    open() { notice = ""; render(); if (!dialog.open) dialog.showModal(); },
    close() { if (dialog.open) dialog.close(); },
    get isOpen() { return dialog.open; },
    state: () => (run ? JSON.parse(JSON.stringify(run)) : null),
    // The host reports the finished battle; the screen returns after a beat
    // so the result on the battlefield can be seen first.
    battleOver(result, delay = 2600) {
      if (!run || run.status !== "battle") return;
      run = resolveBattle(run, result);
      saveRun(run);
      setTimeout(() => { notice = ""; render(); if (!dialog.open) dialog.showModal(); }, delay);
    },
  };
}
