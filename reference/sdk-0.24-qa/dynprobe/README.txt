QE24 Dynamic Page Probe 1.1.0 (r246 rebuild)

What changed since 1.0.0 (which you may have already run)
  - The beat is now fired by a TERMINAL COMMAND instead of an HTTP event.
    The old one hung off Http.Response, which never reaches a mod for its
    own site - so the beat could never fire and rows DP-06/07/08 only ever
    ran their "before" half.
  - /form now PRINTS what Mail.send returned (null = refused, an id =
    accepted). The old page threw that away and printed its own "sent".
  - /form has a SECOND button that sends through the documented workaround
    (the page only emits; a top-level listener does the real send).
  - Http.Response is now logged BEFORE any filtering, and `qedyn status`
    prints every event the mod was offered.

How to run it
  1. Restart the game after installing.
  2. Open Hackhub and accept the "QA probe (r238)" feed post (or claim
     QEDynProbeQuest from the sandbox group). A mail arrives with the same
     instructions - that mail is itself part of the test.
  3. Work the quest tracker top to bottom. Rows that say WRITE DOWN need
     the exact text.
  4. When you reach DP-06, type `qedyn beat` in the in-game terminal. Then
     re-open /news (DP-07) - the UPDATE article must be on top and the old
     three drop a slot. That is the bcc.com comparison.
  5. On /form, click BOTH buttons and write down what each reports. Check
     the inbox for both mails.
  6. Finish with `qedyn status` (DP-13): it prints how many Http.Response
     events the mod was offered and every one of them. Zero is the expected
     result - write the line down anyway.

The terminal command
  qedyn beat              fire the quest's beat (DP-06)
  qedyn status            print everything the probe recorded (DP-13)
  qedyn tick <row-name>   check a row off by hand, e.g.
                          qedyn tick dp-05-news-before
                          (most rows cannot tick themselves - Http.Response
                          never reaches the mod, by design or by bug)

The site: http://qe24-dyn.test

Cleanup
  The quest is abandonable. Abandoning it and removing the mod folder
  takes the site and the feed post with it.
