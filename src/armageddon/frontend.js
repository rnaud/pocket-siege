import missionNames from './mission-names.json' with {type:'json'};
import { resolveScenarioMatch } from './scenario-match.js';
// Full-screen front end built around the original imported menu bitmaps.
// Existing controls retain their IDs and native form/dialog behavior.
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
    art.src = `${import.meta.env.BASE_URL}armageddon/media/graphics/mainmenu/${game.querySelector("#mode").value === "local" ? "multiplayer" : "singleplayer"}.bmp`;
  };
  const field = id => fields.find(el => el.querySelector(id));
  game.append(art, field('#mode'), field('#difficulty'), field('#team-voice-0'), field('#team-voice-1'), portrait);
  const terrain = panel("LANDSCAPE", "frontend-terrain");
  const terrainArt = document.createElement("img");
  terrainArt.className = "frontend-terrain-art";
  terrainArt.alt = "";
  terrainArt.src = `${import.meta.env.BASE_URL}armageddon/media/graphics/multiplay/custterrain.bmp`;
  terrain.append(terrainArt, field("#map-layout"));
  const rules = panel("GAME OPTIONS", "frontend-rules");
  rules.append(...fields.filter(el => el.parentElement === grid), delays);
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
  const navigation = document.createElement('nav');
  navigation.className = 'frontend-modes';
  navigation.setAttribute('aria-label', 'Game mode');
  const modes = [
    ['ai', 'Single player', 'Play against the computer', 'mainmenu/singleplayer'],
    ['local', 'Multiplayer', 'Play together on this device', 'mainmenu/multiplayer'],
    ['missions', 'Missions', 'Browse the original campaign', '1upmenu/missions0'],
    ['training', 'Training', 'Browse the original challenges', '1upmenu/training0'],
  ];
  const campaign = document.createElement('section');
  campaign.className = 'frontend-campaign frontend-panel';
  campaign.hidden = true;
  const campaignTitle = document.createElement('h2');
  const notice = document.createElement('p');
  notice.className = 'frontend-availability';
  notice.textContent = 'Objectives, scripted events and progression are not connected yet. PLAY opens the original landscape and turn rules as a skirmish.';
  const campaignBody = document.createElement('div');
  campaignBody.className = 'frontend-campaign-body';
  const list = document.createElement('div');
  list.className = 'frontend-mission-list';
  const preview = document.createElement('div');
  preview.className = 'frontend-mission-preview';
  campaignBody.append(list, preview);
  campaign.append(campaignTitle, notice, campaignBody);
  const modeSelect = game.querySelector('#mode');
  let campaignRequest = 0;
  async function showCampaign(kind) {
    const request = ++campaignRequest;
    const training = kind === 'training';
    campaignTitle.textContent = training ? 'TRAINING' : 'MISSIONS';
    list.replaceChildren(); preview.replaceChildren();
    notice.textContent = 'Loading original scenarios…';
    let originalMissionPresentation;
    try { ({originalMissionPresentation} = await import('./mission-presentation.js')); }
    catch {
      if (request === campaignRequest && menu.dataset.frontendMode === kind)
        notice.textContent = 'Scenarios could not load. Select this mode again to retry.';
      return;
    }
    if (request !== campaignRequest || menu.dataset.frontendMode !== kind) return;
    notice.textContent = 'Objectives, scripted events and progression are not connected yet. PLAY opens the original landscape and turn rules as a skirmish.';
    const paths = Object.keys(missionNames).filter(path => path.startsWith(`mission/${training ? 'training' : 'mission'}`)).sort((a,b) => a.localeCompare(b,undefined,{numeric:true}));
    paths.forEach((path, index) => {
      const scenario = originalMissionPresentation(path);
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = scenario.title || `${training ? 'Training' : 'Mission'} ${index + 1}`;
      button.addEventListener('click', () => {
        for (const item of list.children) item.setAttribute('aria-pressed', String(item === button));
        const title = document.createElement('h3');title.textContent = button.textContent;
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
          meta.textContent = `${composition.teams} team${composition.teams === 1 ? '' : 's'} · ${composition.worms} worm${composition.worms === 1 ? '' : 's'} · ${composition.turnTime}s turns`;
          preview.append(meta);
        }
        const play = document.createElement('button');
        play.type = 'button';
        play.className = 'frontend-play-scenario';
        play.textContent = 'PLAY SCENARIO';
        play.addEventListener('click', () => {
          const match = resolveScenarioMatch(path);
          if (!match?.terrain || !host.playScenario) {
            notice.textContent = 'This scenario cannot start yet.';
            return;
          }
          host.playScenario({ ...match, title: button.textContent, briefing: scenario.briefing });
        });
        preview.append(play);
      });
      list.append(button);
    });
    list.firstElementChild?.click();
  }
  function selectMode(kind, update = false) {
    const isCampaign = kind === 'missions' || kind === 'training';
    menu.dataset.frontendMode = kind;
    content.hidden = isCampaign; campaign.hidden = !isCampaign;
    start.hidden = isCampaign; manual.hidden = isCampaign; meta.hidden = isCampaign;
    header.querySelector('.frontend-subtitle').textContent = modes.find(mode => mode[0] === kind)[1].toUpperCase();
    for (const button of navigation.children) button.setAttribute('aria-pressed', String(button.dataset.mode === kind));
    if (isCampaign) showCampaign(kind);
    else if (update) {modeSelect.value = kind; modeSelect.dispatchEvent(new Event('change', {bubbles:true}));}
    updateArt();
  }
  for (const [kind, label, description, asset] of modes) {
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.mode = kind;
    const image = document.createElement('img');image.alt = '';image.src = `${import.meta.env.BASE_URL}armageddon/media/graphics/${asset}.bmp`;
    const title = document.createElement('strong');title.textContent = label;
    const hint = document.createElement('span');hint.textContent = description;
    button.append(image, title, hint);button.addEventListener('click', () => selectMode(kind,true));
    navigation.append(button);
  }
  modeSelect.addEventListener('change', () => selectMode(modeSelect.value));
  selectMode(modeSelect.value);
  form.replaceChildren(header, navigation, content, campaign, footer);
  menu.setAttribute("aria-label", "Match setup");
  game.querySelector("#mode").addEventListener("change", updateArt);
  updateArt();
}
