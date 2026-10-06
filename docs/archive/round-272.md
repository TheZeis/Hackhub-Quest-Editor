# r272 — Direct-from-disk manual renderer now boots

Fixed the standalone renderer's unresolved `process.env.NODE_ENV` reference and
Firefox's sandboxed `moz-nullprincipal` origin blocking local JavaScript and CSS.
The prototype grants same-origin only for `file://`; its HTTP preview remains
scripts-only. JSDOM checks covered both policies and all five prototype scene
starts. Zeis confirmed all five scenes open from disk in Firefox without the
editor running.

At this checkpoint no live handbook figure had been replaced. The r272
implementation record is
[`../plans/r272-offline-manual-figure-renderer.md`](../plans/r272-offline-manual-figure-renderer.md).
The editor build stamp remained `2026-10-03.r267`.
