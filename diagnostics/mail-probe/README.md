# QE Mail Probe

A **diagnostic mod**, not content. Delete it when we have an answer.

## Why it exists

The editor's exported quests call `this.sendMail(index)` exactly as the SDK
documents it. Running an exported `dist/mod.js` against a stub engine shows the
call being reached with the right arguments:

```
sendMail:0:i.faber@ghostmail.io
```

…and in-game no mail arrives — while quests from other authors deliver mail
fine. So the difference is something about *how* our quest asks, and the only
way to find it is to ask every possible way in the real game and see which one
lands.

## Install

1. Copy the whole `mail-probe` folder into the game's `mods/` directory.
2. Start HackHub and load any save. The probe quest starts on its own.
3. Wait about **40 seconds** without closing the game — the attempts are spaced
   out so each one can be judged separately.
4. Open the mail app and see which PROBE mails are there.
5. Send the log (and, if you like, a screenshot of the inbox).
6. Delete the folder.

## What it tries

| Attempt | Call | Tells us |
|---|---|---|
| 1 | `this.sendMail(0)` in `OnStart` | whether plain quest mail works at all |
| 2 | `this.sendMail(1, from)` in `OnStart` | whether the `from` address is what breaks it |
| 3 | `this.sendMail(2)` in `OnObjectivesStart` | whether `OnStart` is simply too early |
| 4 | `Mail.send({subject, content})` | whether the global API works when quest mail does not |
| 5 | `this.sendMail(3, from, to)` | whether an explicit recipient is required |
| 6 | `Mail.send({subject, content, from, to})` | the fully addressed global call |

Every attempt logs the inbox size before and after, so the log alone says which
paths delivered:

```
[mail-probe] attempt 1 (this.sendMail(0)) — inbox after: 3  ==> DELIVERED
[mail-probe] attempt 2 (this.sendMail(1, "probe@ghostmail.io")) — inbox after: 3  ==> nothing arrived
```

It also prints, at the top of `OnStart`:

- whether `OnStart` runs at all (if this line is missing, nothing else matters),
- whether `this._sendMailInternal` is wired — that is the engine's own hook, and
  if it is `undefined` we are holding an instance the engine is not driving,
- what `Mail.getPlayerEmail()` returns.

Whatever the log says, the editor's runtime gets changed to do only the thing
that works.
