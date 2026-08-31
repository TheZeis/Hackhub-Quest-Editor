# HackHub Quest Mod Editor

A visual, no-code editor for building **quest mods** for
[HackHub — Ultimate Hacker Simulator](https://store.steampowered.com/app/2980270/HackHub__Ultimate_Hacker_Simulator/).

Non-coders design branching quests on a node canvas, build in-game websites in a
WYSIWYG editor, script phone calls / e-mail / Kisscord / WeeChat conversations, and
export a complete, game-ready mod project.

---

## Status

**Step 1 of 4 — analysis & architecture. Complete.**

| Step | Deliverable | Status |
|---|---|---|
| **1** | Schema analysis, tech stack, architecture | ✅ [docs/01-analysis-and-architecture.md](docs/01-analysis-and-architecture.md) |
| **2** | Scaffolding + node editor canvas | ⬜ |
| **3** | Website Builder + conversation editors | ⬜ |
| **4** | Export engine + templates | ⬜ |

---

## Read this first

[`docs/01-analysis-and-architecture.md`](docs/01-analysis-and-architecture.md) is the
foundation for everything that follows. The three findings that shape the whole design:

1. **A HackHub mod is a TypeScript project, not a data package.**
   `QuestObjectiveTrigger.condition` is a *function*; message chains take `onSent`
   callbacks; dynamic website pages take a `metadata(context)` function. So the export
   engine is a **code generator**, and `npm install && npm run build` is the step that
   produces the `dist/mod.js` the game actually loads.

2. **The docs' event payload table is stale for roughly half the 92 events.**
   The guide says `Terminal.NmapScan` is `{ ip, ports }`; it is `{ ip, versionScan? }`.
   It says `Quest.Claimed` is `{ questName }`; it is `{ name, id }`. An editor built
   from that table would generate triggers that never fire. The full diff is in
   [§7.2](docs/01-analysis-and-architecture.md#72-payloads-where-the-events-guide-page-is-wrong).

3. **There is no SMS API.** Phone *calls* exist (`Quest.Dialog`); text messages do not.
   The requested "phone text messages" editor has to be mapped onto a real primitive —
   see the open decisions below.

---

## Repository layout

```
docs/
  01-analysis-and-architecture.md   # Step 1 deliverable — schema, stack, architecture
reference/
  generate-event-catalogue.mjs      # parses the SDK's index.d.ts → event palette data
  hackhub-events.json               # all 92 events with verified payloads (generated)
```

### Regenerating the event catalogue

The trigger palette is generated from the SDK's own type declarations rather than
transcribed from the docs, so it cannot drift silently:

```bash
npm i -D @hotbunny/hackhub-content-sdk
node reference/generate-event-catalogue.mjs
# or, against an arbitrary declarations file:
node reference/generate-event-catalogue.mjs --sdk path/to/index.d.ts
```

The generator has an integrity gate: it refuses to write (exit 1) and prints a
diagnostic if a future SDK version introduces a shape the parser mishandles. A
silently-wrong palette would be much worse than a failed regeneration.

---

## Open decisions

Four decisions materially change the architecture and are being settled before Step 2
begins:

1. **Delivery form** — browser app with ZIP export, or a desktop shell that writes
   straight into the game's `mods/` folder?
2. **SMS mapping** — Kisscord-backed, a custom "Messages" phone app, or
   author-selectable per conversation?
3. **Mod granularity** — one mod per quest, or one mod containing a whole campaign?
4. **Generated-code ownership** — always regenerate, or preserve hand-edits?

---

## License

MIT — see [LICENSE](LICENSE).

HackHub and the HackHub Content SDK are © HotBunny Interactive Entertainment Inc.
This project is an independent third-party tool and is not affiliated with or endorsed
by HotBunny.
