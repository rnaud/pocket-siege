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
const milestones = data.areas.flatMap((area) => area.milestones);
const complete = milestones.filter((item) => item.done).length;
$("#overall-value").textContent =
  `${Math.round((complete / milestones.length) * 100)}%`;
$("#overall-count").textContent =
  `${complete} of ${milestones.length} playable milestones complete`;
$("#measurement").textContent = data.measurement;
for (const [index, area] of data.areas.entries()) {
  const card = el("article", "area");
  const heading = el("div", "area-heading");
  heading.append(
    el("span", "area-index", String(index + 1).padStart(2, "0")),
    el("h3", "", area.title),
  );
  const done = area.milestones.filter((item) => item.done).length;
  const percent = Math.round((done / area.milestones.length) * 100);
  heading.append(el("strong", "area-percent", `${percent}%`));
  const meter = el("progress");
  meter.max = area.milestones.length;
  meter.value = done;
  meter.setAttribute(
    "aria-label",
    `${area.title}: ${done} of ${meter.max} milestones complete`,
  );
  card.append(
    heading,
    meter,
    el("span", "label", "WHAT WORKS"),
    el("p", "current", area.plain.now),
    el("span", "label remaining-label", "WHAT’S NEXT"),
    el("p", "remaining", area.plain.next),
  );
  const checklist = el("details", "milestones");
  checklist.append(
    el(
      "summary",
      "",
      `Why ${percent}%? ${done} of ${area.milestones.length} milestones`,
    ),
  );
  const list = el("ul");
  for (const item of area.milestones)
    list.append(
      el(
        "li",
        item.done ? "done" : "pending",
        `${item.done ? "Done" : "To finish"} — ${item.title}`,
      ),
    );
  checklist.append(list);
  card.append(checklist);
  {
    const details = el("details", "evidence");
    details.append(
      el("summary", "", `Technical evidence (${area.evidence.length})`),
    );
    details.append(el("p", "", area.live), el("p", "", area.remaining));
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
