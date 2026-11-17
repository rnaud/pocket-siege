# Public progress page

`progress.html` is published alongside the game. The game menu links to it.

- `docs/art-direction/progress-summary.json` contains the readable area summaries and current focus. Update these when integration status or remaining scope changes.
- `docs/art-direction/armageddon-port.json` remains the detailed evidence tracker. Summary evidence keys must exist under `verified`; a missing key fails the build.
- `scripts/progress-page.mjs` embeds those summaries, selected evidence notes, and the latest 100 Git commits at build time. Deployment checks out full history so the changelog describes the deployed checkout, without runtime GitHub requests.
- Verified routines are not counted as completed gameplay features. Do not infer percentage completion from function, test, or commit counts. Online play remains excluded.

The progress page has a separate Vite entry and does not load the game, original media, or physics bundle.
