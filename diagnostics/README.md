# Twotter search-crash isolation mods

Four minimal mods that each change ONE thing, to pin down what makes in-game
Twotter **search** crash (`Cannot read properties of undefined (reading 'toLowerCase')`).

All are built with editor build r23, all use the SDK-native declarative
registration, and all use the same account (`@diagtester`, "Diag Tester").

Install them ONE AT A TIME (remove the previous one first), then in-game open
Twotter and **search `diagtester`**. Report crash / no-crash for each.

| Mod | Account? | Tweet? | Tweet's Account link | Image? |
|-----|----------|--------|----------------------|--------|
| **A** `diag-a-account-only` | yes | **none** | — | — |
| **B** `diag-b-linked` | yes | yes | **linked** (accountId set) | no |
| **C** `diag-c-empty-accountid` | yes | yes | **empty** (no account picked) | no |
| **D** `diag-d-no-account` | **none** | yes | empty | no |

What each result tells us:

- **A crashes** → the crash is in the ACCOUNT record itself; tweets are irrelevant.
- **A ok, B ok, C crashes** → the crash is the empty tweet→account link
  (every one of your crashing mods had an empty accountId). This would be a
  real editor bug we can fix by forcing the tweet to carry a valid account.
- **A ok, B crashes** → the crash is having ANY tweet in the search index.
- **D crashes but C doesn't** → it's specifically a tweet with no resolvable author.

Please also note whether the moment "RFC2822/ISO" date warning appears for
each one (it may help even when there's no crash).
