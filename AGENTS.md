# Release progress maintenance

Keep the public changelog and remaining offline parity work current with every release to main.

- When parity advances or scope changes, update `docs/art-direction/armageddon-port.json` with the evidence and integration status, and update the affected areas in `docs/art-direction/progress-summary.json` in the same change. Review its current focus, remaining work and evidence links before pushing main.
- Distinguish executable-verified routines from features integrated into live gameplay. Do not claim completion from routine counts or invent completion percentages. Online play remains out of scope.
- The changelog is generated automatically from the deployed Git history by `scripts/progress-page.mjs`. Use descriptive commit subjects; do not maintain a duplicate manual changelog.
- Housekeeping and test-only changes do not require artificial parity updates. Review the summaries and leave accurate statements unchanged.
- Run `npm run build` for progress data changes; it validates that public evidence references exist in the canonical tracker. Follow the existing related-test hook for code changes; documentation maintenance alone does not call for new browser or iPhone tests.

See `docs/art-direction/progress-page.md` for publishing and maintenance details.
