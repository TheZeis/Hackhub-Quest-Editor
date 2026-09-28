QE24 ModSettings Probe 1.0.0 (r239)

What this is
  A QA probe for declarative mod settings (the kind a mod declares and the
  game renders in the Mods menu). This is the first in-game look at how
  that surface looks and functions. Nothing here is player-facing content.

How to run it
  1. Restart the game after installing. The mod logs an "MS-load 1" line
     with the default values - the game's debug log is the evidence
     ledger for this probe.
  2. Open Hackhub and accept the "QA probe (r239)" feed post (or claim
     QEModSettingsProbeQuest from the sandbox group).
  3. Work the quest tracker TOP TO BOTTOM: MS-01..MS-04 are in the Mods
     menu (find, look, change, write down), MS-05 is a game restart,
     MS-06 is a re-claim after the restart (the log lines are the proof
     the mod reads back your values), MS-07 is one more look around.
  4. Rows that say WRITE DOWN need the exact answer - screenshots are
     welcome for MS-01 (the layout).

The six settings (all labels start with "Probe:")
  Probe: toggle (default ON)         - a switch, on by default
  Probe: toggle (default OFF)        - a switch, off by default
  Probe: select (pick one)           - a list: Red / Green / Blue / Violet
  Probe: text (type something)       - a text box, "hello probe"
  Probe: number (any whole number)   - a number box, 7
  Probe: slider (0-100, steps of 5)  - a slider, 50

Cleanup
  The quest is abandonable. Abandoning it and removing the mod folder
  takes the feed post with it; the settings go with the mod.
