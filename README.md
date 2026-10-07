# HackHub Quest Mod Editor

A browser-based, no-code editor for building quest mods for
[HackHub — Ultimate Hacker Simulator](https://store.steampowered.com/app/2980270/HackHub__Ultimate_Hacker_Simulator/).

Create quests on a visual map. Add objectives, game-world changes, conversations,
websites, player choices, rewards, and quest endings. Export a `.zip` that you can
install in HackHub. You do not need to write code.

## Install and run

You need the LTS version of [Node.js](https://nodejs.org/).

### Windows one-click launch

Clone or download this repository, then double-click `Launch.bat`.

The launcher installs the pinned dependencies, starts the editor, and opens it in
your browser. Keep the editor terminal open while you work.

### Any operating system

Open a terminal in this repository and run:

```bash
npm ci
npm run dev
```

Open the address Vite prints, usually `http://localhost:5173`.

To make a production build, run:

```bash
npm run build
```

## Make a quest mod

1. Open **Templates** and choose a starter quest, or create a blank project.
2. Drag nodes from the node library onto the quest map.
3. Connect node sockets with wires.
4. Select a node and fill in its settings in the inspector.
5. Use **Dialogues**, **Websites**, **Dry run**, and the other editor tools when your quest needs them.
6. Click **Export mod**.
7. Unzip the exported mod into HackHub's `mods/` directory.
8. Start HackHub and play the quest.

The editor autosaves your draft in the browser. Save a project file when you want
to move the draft to another machine or share it with another author.

## Handbook

Open [`public/manual.html`](public/manual.html) for the offline, searchable handbook.
It explains the editor screen, every node and setting, common messages, recipes,
exporting, installing, and troubleshooting.

The handbook is also available at [`public/manual/index.html`](public/manual/index.html).

## Addon and compatibility references

The [`reference/`](reference/) directory contains compatibility material for mod
authors, including the [tool-pack format](reference/ToolPack-Format.md), example
packs, Recon-NG data, official quest references, and the editor's generated event
catalogue.

The development branch contains the full test and maintenance environment. It is
not required to run the editor.

## Update the editor

Pull the latest changes, then run:

```bash
npm ci
npm run dev
```

Your saved project stays in the browser unless you clear its site data. Export a
project file before updating if you need a portable backup.

## Troubleshooting

- If the launcher says Node.js is missing, install the current Node.js LTS release.
- If the editor does not open, keep the terminal visible and open the address it prints.
- If a mod does not appear in HackHub, check that the `.zip` was unpacked into the game's `mods/` directory and that the mod is enabled in the game's Mods list.
- If a quest does not start, open **Dry run** and read the warning shown for the first unwired or unreachable step.
- Open the handbook from `public/manual.html` when you need a field explanation or a fix for an editor message.

## License

This project is released under the MIT License. See [LICENSE](LICENSE).
