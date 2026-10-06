# r274 — Figure accessibility structure and evidence gaps recorded

Historical summary; see the [full r274 plan](../plans/r274-manual-accessibility-and-evidence-audit.md).

The five-scene local manual prototype gained descriptive iframe titles,
outside-the-frame `<figcaption>` text, `tabindex="-1"` and inert renderer
content. JSDOM checks and Zeis's Firefox-from-disk Tab check passed for that
prototype. Screen-reader output was not tested. At r274, the 88 editor figure
references had not yet been migrated; r277 later completed that migration and
r279 added the larger-view gallery for wide workspace scenes.
