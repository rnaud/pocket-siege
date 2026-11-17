import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Generate from the checkout being deployed, never from runtime API requests.
export function progressPageData() {
  const tracker = JSON.parse(
    readFileSync(
      new URL("../docs/art-direction/armageddon-port.json", import.meta.url),
      "utf8",
    ),
  );
  const summary = JSON.parse(
    readFileSync(
      new URL("../docs/art-direction/progress-summary.json", import.meta.url),
      "utf8",
    ),
  );
  const log = execFileSync("git", ["log", "-100", "--format=%H%x09%aI%x09%s"], {
    encoding: "utf8",
  }).trim();
  const commits = log
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha, date, ...title] = line.split("\t");
      return { sha, date, title: title.join("\t") };
    });
  return {
    reference: tracker.reference_version,
    status: tracker.status,
    focus: summary.focus,
    note: summary.note,
    commits,
    excluded: tracker.scope.excluded,
    areas: summary.areas.map((area) => ({
      ...area,
      evidence: area.evidence.map((key) => {
        if (!tracker.verified[key])
          throw new Error(`Missing parity evidence: ${key}`);
        return { title: key.replaceAll("_", " "), note: tracker.verified[key] };
      }),
    })),
  };
}

export function progressPagePlugin() {
  const id = "\0virtual:progress-data";
  return {
    name: "progress-page",
    resolveId(source) {
      if (source === "virtual:progress-data") return id;
    },
    load(source) {
      if (source === id)
        return `export default ${JSON.stringify(progressPageData())}`;
    },
  };
}
