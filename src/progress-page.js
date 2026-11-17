import data from "virtual:progress-data";
import "./progress.css";
const $ = (selector) => document.querySelector(selector);
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
$("#project-note").textContent = data.note;
$("#focus").textContent = data.focus;
$("#area-count").textContent = String(data.areas.length).padStart(2, "0");
$("#reference").textContent = `REFERENCE: WA ${data.reference}`;
$("#excluded").textContent = `${data.excluded.join(" · ")}.`;
const date = (value) =>
  new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
$("#build").textContent =
  `${data.commits[0].sha.slice(0, 7)} · ${date(data.commits[0].date)}`;
for (const [index, area] of data.areas.entries()) {
  const card = el("article", "area");
  const heading = el("div", "area-heading");
  heading.append(
    el("span", "area-index", String(index + 1).padStart(2, "0")),
    el("h3", "", area.title),
  );
  card.append(
    heading,
    el("span", "label", "CURRENT STATE"),
    el("p", "current", area.live),
    el("span", "label remaining-label", "STILL TO DO"),
    el("p", "remaining", area.remaining),
  );
  if (area.evidence.length) {
    const details = el("details", "evidence");
    details.append(
      el("summary", "", `Technical evidence (${area.evidence.length})`),
    );
    for (const entry of area.evidence)
      details.append(el("h4", "", entry.title), el("p", "", entry.note));
    card.append(details);
  }
  $("#areas").append(card);
}
function renderChanges() {
  const query = $("#search").value.trim().toLowerCase();
  const commits = data.commits.filter((commit) =>
    `${commit.title} ${commit.sha} ${commit.date}`
      .toLowerCase()
      .includes(query),
  );
  $("#changes").replaceChildren();
  for (const commit of commits) {
    const item = el("li", "change");
    const time = el("time", "", date(commit.date));
    time.dateTime = commit.date;
    const link = el("a", "", commit.title);
    link.href = `https://github.com/rnaud/pocket-siege/commit/${commit.sha}`;
    item.append(time, link, el("code", "", commit.sha.slice(0, 7)));
    $("#changes").append(item);
  }
  $("#result-count").textContent = commits.length
    ? `${commits.length} change${commits.length === 1 ? "" : "s"}${query ? " found" : " in this build"}`
    : "No matching changes.";
}
$("#search").addEventListener("input", renderChanges);
renderChanges();
