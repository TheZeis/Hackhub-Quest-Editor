QE24 ModSettings Probe — API v2 variant 1.0.0 (r240)

Why this exists
  The v1 probe's settings were read back perfectly by the game, but Zeis
  could not find any UI to change them: the in-game Settings app has no
  Mods section. The game logs "current API v2" and runs v1 mods in
  compatibility mode (docs/03 §19), so one candidate explanation is that
  the settings UI only appears for apiVersion 2 mods. This is the same
  probe with apiVersion 2 — identical code, identical six settings — so
  any difference in behaviour is the apiVersion's doing.

Install INSTEAD of the v1 probe
  Remove the QE24 ModSettings Probe (v1) mod folder first, so the two do
  not compete for the same setting keys. (This one is safe to leave
  beside it in a pinch — its objectives are prefixed ms2- and its quest
  is a different one — but the clean read comes from one at a time.)

How to run it
  1. Restart the game. Then check the log for the boot line:
     - no "uses API v1 ... compatibility mode" line for this mod
       (= v2 was accepted), or
     - a new/different warning (record it), or
     - the mod fails to load (record the error).
  2. Look in the SAME place you look to enable/disable mods (the Mods
     list) and in the Settings app again. Do the settings appear now?
  3. Accept the "QA probe (r240, API v2)" feed post if it appears, and
     work the seven ms2- rows exactly like the v1 checklist.

The six settings are unchanged (all labels start with "Probe:"):
  toggle (default ON) / toggle (default OFF) / select Red-Green-Blue-Violet
  / text "hello probe" / number 7 / slider 0-100 step 5

Either answer is useful
  Settings appear under v2 -> the surface is v2-only; the editor's future
  settings feature must wait for a v2-capable SDK.
  Still no settings UI  -> it is a UI-location question, not an API one;
  the remaining hunt is where the Mods list lives.
