# Public progress page

`progress.html` is published alongside the game. The game menu links to it.

- `docs/art-direction/progress-summary.json` contains the readable area summaries and current focus. Update these when integration status or remaining scope changes.
- `docs/art-direction/armageddon-port.json` remains the detailed evidence tracker. Summary evidence keys must exist under `verified`; a missing key fails the build.
- `scripts/progress-page.mjs` embeds those summaries, selected evidence notes, and the latest 100 Git commits at build time. Deployment checks out full history so the changelog describes the deployed checkout, without runtime GitHub requests.
- Public percentages count explicit completed playable `milestones`, equally weighted. They do not measure effort, code decompiled or exact parity. Review `plain.now`, `plain.next` and milestone status each release; isolated verification does not complete a playable milestone. Technical summaries stay inside expandable details.
- Verified routines are not counted as completed gameplay features. Do not infer percentage completion from function, test, or commit counts. Online play remains excluded.

The progress page has a separate Vite entry and does not load the game, original media, or physics bundle.

## Every release

Before pushing main, review the public summary against the changes being released. For parity advances or scope changes, update the canonical evidence tracker and the affected public areas together, including the current focus and evidence references where needed. Describe separately what is verified and what is integrated into live play. Housekeeping and test-only releases can leave still-accurate parity summaries unchanged.

Run `npm run build` after changing progress data to validate references and generate the page. Use descriptive commit subjects: each deployment automatically refreshes the changelog from its own checkout. The deployment must succeed before those updates appear at `https://rnaud.github.io/pocket-siege/progress.html`.

The root `AGENTS.md` records this ongoing release requirement for future repository work. Readable parity summaries require review; they are not inferred automatically from commits.
