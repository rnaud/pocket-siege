import missionNames from './mission-names.json' with {type:'json'};
import { resolveScenarioMatch } from './scenario-match.js';
import { isScenarioComplete, readScenarioProgress, readScenarioScores, readScenarioMedal, readScenarioAttempts, scenarioMissionBound } from './scenario-progress.js';
// Medal status 1-3 (0x6f528c) uses the original mission-menu medal bitmaps.
const MEDALS = ['none', 'bronze', 'silver', 'gold'];
const medalArt = (medal, big = false) =>
  `${import.meta.env.BASE_URL}armageddon/media/graphics/missionmenu/missionmedal${MEDALS[medal] ?? 'none'}${big ? 'big' : ''}.bmp`;
// Full-screen front end built around the original imported menu bitmaps.
// Screens: "home" picks a mode, "mode" shows that mode's setup or scenario
// list, "help" shows controls. Existing controls retain their IDs.
export function mountArmageddonFrontend(host = {}) {
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
    '<button type="button" class="frontend-back">← MODES</button><div class="frontend-title">POCKET SIEGE</div><div class="frontend-subtitle"></div>';
  const back = header.querySelector(".frontend-back");
  const subtitle = header.querySelector(".frontend-subtitle");
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
  const field = id => fields.find(el => el.querySelector(id));
  // The mode cards choose the mode; the select stays as the settings source.
  const modeField = field('#mode');
  modeField.hidden = true;
  const game = panel("TEAMS", "frontend-game");
  // Each team's controller (local play only) sits above its voice and flag.
  game.append(modeField, field('#difficulty'), field('#team-count'),
    ...[0, 1, 2, 3].flatMap(t => [field(`#team-control-${t}`), field(`#team-voice-${t}`), field(`#team-flag-${t}`)]), portrait);
  const terrain = panel("LANDSCAPE", "frontend-terrain");
  terrain.append(field("#map-layout"));
  const rules = panel("GAME OPTIONS", "frontend-rules");
  rules.append(...fields.filter(el => el.parentElement === grid), delays);
  // Delay options lived inside the manual; the manual itself is help-only.
  manual.querySelector("summary")?.remove();
  manual.open = true;
  const help = document.createElement("section");
  help.className = "frontend-help frontend-panel";
  help.append(...manual.children);
  const footer = document.createElement("div");
  footer.className = "frontend-footer";
  const actions = document.createElement("div");
  actions.className = "frontend-actions";
  const start = form.querySelector("#start"),
    close = form.querySelector(".close-help");
  start.textContent = "START GAME";
  close.textContent = "RETURN TO GAME";
  actions.append(close, form.querySelector("#surrender"), start);
  meta.querySelector(".progress-link")?.remove();
  meta.classList.add("frontend-home-extras");
  footer.append(actions);
  const navigation = document.createElement('nav');
  navigation.className = 'frontend-modes';
  navigation.setAttribute('aria-label', 'Game mode');
  const modes = [
    ['ai', 'Single player', 'Play against the computer', 'mainmenu/singleplayer'],
    ['local', 'Multiplayer', 'Play together on this device', 'mainmenu/multiplayer'],
    ['missions', 'Missions', 'The original campaign', '1upmenu/missions0'],
    ['training', 'Training', 'Original weapon challenges', '1upmenu/training0'],
  ];
  const campaign = document.createElement('section');
  campaign.className = 'frontend-campaign frontend-panel';
  campaign.hidden = true;
  const campaignTitle = document.createElement('h2');
  const notice = document.createElement('p');
  notice.className = 'frontend-availability';
  const campaignBody = document.createElement('div');
  campaignBody.className = 'frontend-campaign-body';
  const list = document.createElement('div');
  list.className = 'frontend-mission-list';
  const preview = document.createElement('div');
  preview.className = 'frontend-mission-preview';
  campaignBody.append(list, preview);
  campaign.append(campaignTitle, notice, campaignBody);
  const modeSelect = game.querySelector('#mode');
  let campaignRequest = 0, mode = modeSelect.value, screen = "home";
  async function showCampaign(kind, selectPath = null) {
    const request = ++campaignRequest;
    const training = kind === 'training';
    campaignTitle.textContent = training ? 'TRAINING' : 'MISSIONS';
    list.replaceChildren(); preview.replaceChildren();
    notice.hidden = false;
    notice.textContent = 'Loading original scenarios…';
    let originalMissionPresentation;
    try { ({originalMissionPresentation} = await import('./mission-presentation.js')); }
    catch {
      if (request === campaignRequest && menu.dataset.frontendMode === kind)
        notice.textContent = 'Scenarios could not load. Select this mode again to retry.';
      return;
    }
    if (request !== campaignRequest || menu.dataset.frontendMode !== kind) return;
    notice.hidden = true;
    const paths = Object.keys(missionNames).filter(path => path.startsWith(`mission/${training ? 'training' : 'mission'}`)).sort((a,b) => a.localeCompare(b,undefined,{numeric:true}));
    const completedPaths = readScenarioProgress();
    const completedCount = paths.filter((path) => completedPaths.has(path)).length;
    campaignTitle.textContent = `${training ? 'TRAINING' : 'MISSIONS'} · ${completedCount}/${paths.length} COMPLETE`;
    const bound = training ? Infinity : scenarioMissionBound(paths);
    paths.forEach((path, index) => {
      const scenario = originalMissionPresentation(path);
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.scenario = path;
      const label = scenario.title || `${training ? 'Training' : 'Mission'} ${index + 1}`;
      const medal = readScenarioMedal(path);
      const icon = document.createElement('img');
      icon.className = 'frontend-medal'; icon.alt = medal ? `${MEDALS[medal]} medal` : '';
      icon.src = medalArt(medal);
      const text = document.createElement('span');
      // Completions recorded before medal status existed keep their check mark.
      text.textContent = `${label}${!medal && isScenarioComplete(path) ? ' ✓' : ''}`;
      button.append(icon, text);
      if (isScenarioComplete(path)) button.classList.add('completed');
      if (index > bound) {
        // Beyond the menu's reachable bound: visible, but not playable yet.
        button.disabled = true;
        button.classList.add('locked');
        text.textContent = `${label} · LOCKED`;
        list.append(button);
        return;
      }
      button.addEventListener('click', () => {
        for (const item of list.children) item.setAttribute('aria-pressed', String(item === button));
        const title = document.createElement('h3');title.textContent = label;
        const note = document.createElement('p');note.className = 'frontend-briefing';
        note.textContent = scenario.briefing || 'This original scenario has no briefing text.';
        preview.replaceChildren(title);
        if (!training) {
          const image = document.createElement('img'); image.alt = `Landscape for ${button.textContent}`;
          image.src = `${import.meta.env.BASE_URL}armageddon/media/${scenario.thumbnail}`;
          preview.append(image);
        }
        preview.append(note);
        const composition = resolveScenarioMatch(path);
        if (composition) {
          const meta = document.createElement('p');
          meta.className = 'frontend-scenario-meta';
          const best = readScenarioScores().get(path);
          const failed = readScenarioAttempts(path);
          meta.textContent = `${composition.teams} team${composition.teams === 1 ? '' : 's'} · ${composition.worms} worm${composition.worms === 1 ? '' : 's'} · ${composition.turnTime}s turns${best === undefined ? '' : ` · best ${best}`}${failed ? ` · ${failed} failed attempt${failed === 1 ? '' : 's'}` : ''}`;
          preview.append(meta);
          if (medal) {
            const award = document.createElement('img');
            award.className = 'frontend-medal-big'; award.alt = `${MEDALS[medal]} medal`;
            award.src = medalArt(medal, true);
            preview.append(award);
          }
        }
        const play = document.createElement('button');
        play.type = 'button';
        play.className = 'frontend-play-scenario';
        play.textContent = 'PLAY SCENARIO';
        play.addEventListener('click', async () => {
          const match = resolveScenarioMatch(path);
          if (!match?.terrain || !host.playScenario) {
            notice.hidden = false;
            notice.textContent = 'This scenario cannot start yet.';
            return;
          }
          document.body.dataset.scenarioTraining = training ? "1" : "0";
          host.setScenarioTraining?.(training);
          await host.playScenario({ ...match, training: training || match.training,
            title: label, briefing: scenario.briefing });
          if (training) host.applyTrainingRoster?.();
        });
        preview.append(play);
      });
      list.append(button);
    });
    // A finished scenario reopens on itself so its updated result is shown;
    // otherwise open on the furthest reachable entry, as the original selects
    // the current mission.
    const finished = selectPath && [...list.children].find(item => item.dataset.scenario === selectPath && !item.disabled);
    (finished ?? (Number.isFinite(bound) ? list.children[bound] : list.firstElementChild))?.click();
  }
  function render() {
    const isCampaign = mode === 'missions' || mode === 'training';
    menu.dataset.frontendMode = mode;
    menu.dataset.frontendScreen = screen;
    back.hidden = screen === "home";
    navigation.hidden = screen === "help";
    meta.hidden = screen !== "home";
    content.hidden = screen !== "mode" || isCampaign;
    campaign.hidden = screen !== "mode" || !isCampaign;
    help.hidden = screen !== "help";
    start.hidden = screen !== "mode" || isCampaign;
    subtitle.textContent = screen === "help" ? "HOW TO PLAY"
      : screen === "home" ? "CHOOSE A MODE" : modes.find(entry => entry[0] === mode)[1].toUpperCase();
    for (const button of navigation.children)
      button.setAttribute('aria-pressed', String(screen === "mode" && button.dataset.mode === mode));
  }
  function selectMode(kind, update = false) {
    const changed = kind !== mode || menu.dataset.frontendMode !== kind;
    mode = kind;
    render();
    if (kind === 'missions' || kind === 'training') { if (changed || !list.children.length) showCampaign(kind); }
    else if (update && modeSelect.value !== kind) {
      modeSelect.value = kind; modeSelect.dispatchEvent(new Event('change', {bubbles:true}));
    }
  }
  function showScreen(next) {
    screen = next;
    render();
    menu.scrollTop = 0;
  }
  for (const [kind, label, description, asset] of modes) {
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.mode = kind;
    const image = document.createElement('img');image.alt = '';image.src = `${import.meta.env.BASE_URL}armageddon/media/graphics/${asset}.bmp`;
    const title = document.createElement('strong');title.textContent = label;
    const hint = document.createElement('span');hint.textContent = description;
    button.append(image, title, hint);
    button.addEventListener('click', () => { screen = "mode"; selectMode(kind, true); menu.scrollTop = 0; });
    navigation.append(button);
  }
  back.addEventListener("click", () => showScreen("home"));
  modeSelect.addEventListener('change', () => {
    if (mode === 'missions' || mode === 'training') return;
    selectMode(modeSelect.value);
  });
  form.replaceChildren(header, navigation, meta, content, campaign, help, footer);
  menu.setAttribute("aria-label", "Match setup");
  selectMode(modeSelect.value);
  showScreen("home");
  return {
    showHome: () => showScreen("home"),
    showHelp: () => showScreen("help"),
    // The original game exits to the frontend when a mission ends, where the
    // result is evaluated; reopen that mission list on the finished scenario.
    showScenarioResult: (kind, path) => {
      mode = kind;
      showScreen("mode");
      return showCampaign(kind, path);
    },
  };
}
