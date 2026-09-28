"use strict";

/*
 * QE24 Dynamic Page Probe (r238)
 *
 * Hand-authored QA mod for SDK 0.24's DYNAMIC website pages - the surface the
 * no-code editor does not expose yet (docs/plans/r237). It registers one site
 * (qe24-dyn.test) carrying one static control page plus seven dynamic pages,
 * each answering one or more of the open questions from the r237
 * investigation:
 *
 *   /                static control + site-level Exports from a STATIC page
 *   /echo            per-request content from the QUERY string + raw
 *                    PageContext dump (what url/params/searchStr actually
 *                    carry)
 *   /article/:id     per-request content from PATH PARAMS + a record lookup
 *                    + the null -> 404 behaviour
 *   /state           quest-state dependency + the VISIT COUNTER (the caching
 *                    probe: a cached page would never advance its counter)
 *   /news            the bcc.com pattern: a front-page article list that
 *                    gains a new top article when the quest's beat fires
 *   /form            the iframe HackhubSDK bridge - a page button that sends
 *                    a mail the quest can hear
 *   /exports         per-page Exports (functions callable in the page's
 *                    inline scripts, capturing the request)
 *   /site-exports    site-level Exports from a DYNAMIC page
 *
 * The quest's twelve objectives are the QA checklist, in the order to run
 * them (docs/plans/r238-dynamic-pages-probe.md). Nothing auto-starts; claim
 * QEDynProbeQuest from the Hackhub feed post.
 */
var sdk = require("@hotbunny/hackhub-content-sdk");

var MOD_ID = "qe-sdk-024-dynprobe";
var HOST = "qe24-dyn.test";
var MAIL_MARKER = "QE24 dynprobe: talk-back";

function log(message) {
    try { console.log("[" + MOD_ID + "] " + message); } catch (_e) {}
}

function safe(label, fn, fallback) {
    try {
        return fn();
    } catch (e) {
        log(label + " failed: " + (e && e.message ? e.message : e));
        return fallback;
    }
}

function completeObjectiveSafe(quest, name) {
    safe("completeObjective(" + name + ")", function () { quest.completeObjective(name); });
}

function sendMailSafe(subject, body) {
    safe("Mail.send(" + subject + ")", function () {
        if (sdk.Mail && sdk.Mail.send) {
            sdk.Mail.send({ from: "qa@qe24.test", subject: subject, content: body });
        }
    });
}

/* ── Probe state ────────────────────────────────────────────────────────────
   Module-level, deliberately NOT quest Data: a Website is a mod-level
   registration with no quest context, so this mirrors how the editor's
   future emitted handlers would share state (the same runtime closure the
   quest and the pages both live in).
   `visits` is the caching probe: every dynamic response increments its
   counter. If the game caches a page, a re-visit shows an OLD counter. */
var DYN = {
    phase: "claimed",
    beatFired: false,
    visits: { state: 0, news: 0 },
    /* The /news front page. The beat PREPENDS an article, so the previous
       top story drops one slot - the bcc.com pattern, for the A/B. */
    news: [
        "Top story: harbour cranes back in service after the long repair",
        "City council votes to extend the night market through the weekend",
        "Local chess club's underdog wins the regional cup"
    ],
    beatArticle: "UPDATE: probe quest beat fired - this article just appeared on top"
};

/* Fire the quest's beat: flip the phase and prepend the update article.
   Called by the quest on the FIRST /state visit (so the tester needs no
   terminal), and exported below for the editor's vitest smoke test. */
function fireBeat() {
    if (DYN.beatFired) return;
    DYN.beatFired = true;
    DYN.phase = "beat-fired";
    DYN.news.unshift(DYN.beatArticle);
    log("beat fired: phase=" + DYN.phase + ", news now " + DYN.news.length + " articles");
}

/* The /article library - static records, so a hit renders the record and a
   miss (a number with no record) returns null -> the page does not exist. */
var LIBRARY = {
    "1": { title: "Article one: the lighthouse ledger", body: "The keeper's ledger lists three ships that never arrived." },
    "2": { title: "Article two: the missing ferry timetable", body: "The last ferry left before the fog; the timetable page has been blank since." },
    "3": { title: "Article three: who owns dock nine", body: "Three companies claim the same dock. None of them answers the phone." }
};

function articleIdFrom(ctx) {
    /* Try the declared route param first (question 1 of r237: the pattern
       syntax is not documented in the declarations - the /echo dump shows
       what the game actually passes). If params is empty, fall back to
       reading the number off the raw URL, so the LOOKUP and 404 rows are
       answerable even if the pattern syntax is different. */
    if (ctx.params && ctx.params.id) return String(ctx.params.id);
    var m = /\/article\/([A-Za-z0-9]+)/.exec(ctx.url || "");
    return m ? m[1] : null;
}

/* ── The site ────────────────────────────────────────────────────────────── */
class QEDynProbeSite extends sdk.Website {
    constructor() {
        super(...arguments);
        this.SiteName = "QE24 Dynamic Page Probe";
        this.Host = HOST;
        /* The editor emits "" here for generated sites (r129 rule: every
           website in Nemesis sets Icon, including to ""). */
        this.Icon = "";
        /* Site-level Exports: callable as a global in EVERY page's HTML
           (static or dynamic). P1 and /site-exports both call this to check
           the global from both page kinds. */
        this.Exports = {
            dynGreeting: function (name) {
                return "Greetings, " + (name || "stranger") + " - site-level export";
            }
        };
        var self = this;
        this.Pages = [
            /* P1 - the STATIC control. Everything else on this site is a
               per-request function; this page is the same for everyone,
               every time. It also answers the bonus question: do site
               Exports reach STATIC pages? */
            {
                path: "/",
                title: "QE24 dynprobe - static control",
                html: "<h1>Static control</h1><p>This is the only page on this site that is the same for everyone, every time. Every other page is printed on the spot for each visit.</p><p>Site-export call from a static page: <span id=\"sx\"></span></p><script>try { document.getElementById(\"sx\").textContent = dynGreeting(\"tester\"); } catch (e) { document.getElementById(\"sx\").textContent = \"NO dynGreeting global: \" + e.message; }</script>",
                seo: true
            },
            /* P2 - /echo: the QUERY-string probe + the raw PageContext dump
               (the evidence for r237 question 1). */
            {
                path: "/echo",
                seo: true,
                metadata: function (ctx) {
                    var msg = (ctx.query && ctx.query.msg) || "(no msg given)";
                    return {
                        title: "QE24 echo",
                        html: "<h1>Echo</h1><p>You asked for: <b>" + msg + "</b></p><p>Raw PageContext the game passed to this page (question 1 evidence):</p><pre>" + safe("JSON.stringify(ctx)", function () { return JSON.stringify({ url: ctx.url, params: ctx.params, query: ctx.query, searchStr: ctx.searchStr, allKeys: Object.keys(ctx || {}) }, null, 2); }, "ctx unreadable") + "</pre>"
                    };
                }
            },
            /* P3 - /article/:id: the record-lookup probe. A known number
               renders its record; an unknown number returns null, which the
               declaration says makes the page not exist (question 5). */
            {
                path: "/article/:id",
                seo: true,
                metadata: function (ctx) {
                    var id = articleIdFrom(ctx);
                    var rec = id ? LIBRARY[id] : null;
                    if (!rec) {
                        log("article miss: id=" + id + " -> null (404?)");
                        return null;
                    }
                    log("article hit: id=" + id);
                    return {
                        title: rec.title,
                        html: "<h1>" + rec.title + "</h1><p>" + rec.body + "</p><p>params as passed: <pre>" + safe("JSON.stringify(ctx.params)", function () { return JSON.stringify(ctx.params); }, "?") + "</pre></p><p>Other articles: <a href=\"/article/1\">1</a> <a href=\"/article/2\">2</a> <a href=\"/article/3\">3</a> - try <a href=\"/article/99\">99</a> (should not exist).</p>"
                    };
                }
            },
            /* P4 - /state: the caching probe. Every visit increments
               DYN.visits.state and the page shows it; the quest flips the
               phase on the first visit. A second visit that still shows
               visits: 1 is a cached response (question 3). */
            {
                path: "/state",
                seo: true,
                metadata: function () {
                    DYN.visits.state += 1;
                    log("state visit " + DYN.visits.state + " (phase=" + DYN.phase + ")");
                    return {
                        title: "QE24 state",
                        html: "<h1>State page</h1><p>Phase: <b>" + DYN.phase + "</b></p><p>Visits to this page this session: <b>" + DYN.visits.state + "</b></p><p>If you have visited this page before and the number did NOT go up, the game served a cached copy (question 3).</p>"
                    };
                }
            },
            /* P5 - /news: the bcc.com pattern (Zeis's reference). A
               front-page article list; the beat prepends an article so the
               previous top story drops one slot. */
            {
                path: "/news",
                seo: true,
                metadata: function () {
                    DYN.visits.news += 1;
                    log("news visit " + DYN.visits.news);
                    var items = DYN.news.map(function (t, i) { return "<li>" + (i + 1) + ". " + t + "</li>"; }).join("");
                    return {
                        title: "QE24 News Front Page",
                        html: "<h1>QE24 News</h1><p>Visits to this page this session: <b>" + DYN.visits.news + "</b></p><ol>" + items + "</ol><p>After the quest's beat fires (first /state visit), a new article appears on top and these drop one slot - compare with bcc.com's front page.</p>"
                    };
                }
            },
            /* P6 - /form: the iframe HackhubSDK bridge (question 4). A
               button calls HackhubSDK.Mail.send from page script; the quest
               listens for Mail.Sent with the marker subject (DP-10). The
               span reports what the iframe actually sees. */
            {
                path: "/form",
                seo: true,
                metadata: function () {
                    return {
                        title: "QE24 talk-back form",
                        html: "<h1>Talk-back form</h1><p>HackhubSDK global in this iframe: <span id=\"sdkdef\">?</span></p><button onclick=\"qe24DynSend()\">Send the mail from this page</button><p>Result: <span id=\"res\">not sent yet</span></p><p>The quest has an objective for the mail this sends - if the button works, that objective ticks.</p><script>document.getElementById(\"sdkdef\").textContent = (typeof HackhubSDK !== \"undefined\") ? \"yes\" : \"no\"; function qe24DynSend() { var out = document.getElementById(\"res\"); try { if (typeof HackhubSDK === \"undefined\") { out.textContent = \"NO HackhubSDK global in the iframe\"; return; } if (!HackhubSDK.Mail || !HackhubSDK.Mail.send) { out.textContent = \"HackhubSDK exists but no Mail.send\"; return; } HackhubSDK.Mail.send({ from: \"qe24-dyn@qe24.test\", to: \"player@gomail.com\", subject: \"" + MAIL_MARKER + "\", content: \"Sent from the /form page by the r238 probe.\" }); out.textContent = \"sent (no error thrown)\"; } catch (e) { out.textContent = \"ERR: \" + e.message; } } </script>"
                    };
                }
            },
            /* P7 - /exports: per-page Exports. The handler returns
               exports.currentArticle, a function capturing THIS request's
               ctx, callable from the page's inline script. */
            {
                path: "/exports",
                seo: true,
                metadata: function (ctx) {
                    return {
                        title: "QE24 per-page exports",
                        html: "<h1>Per-page exports</h1><p>What <code>currentArticle()</code> (this page's own export, built from the request you just made) says: <span id=\"out\">?</span></p><script>try { var v = currentArticle(); document.getElementById(\"out\").textContent = (typeof v === \"function\") ? \"callable value (unexpected)\" : String(v); } catch (e) { document.getElementById(\"out\").textContent = \"NO currentArticle global: \" + e.message; } </script>",
                        exports: {
                            currentArticle: function () {
                                var id = (ctx.params && ctx.params.article) || (ctx.query && ctx.query.article) || "none";
                                log("currentArticle() called with id=" + id);
                                return "article-" + id;
                            }
                        }
                    };
                }
            },
            /* P8 - /site-exports: the same site-level dynGreeting called
               from a DYNAMIC page (P1 calls it from the static one). */
            {
                path: "/site-exports",
                seo: true,
                metadata: function () {
                    return {
                        title: "QE24 site exports (dynamic page)",
                        html: "<h1>Site exports, dynamic page</h1><p>dynGreeting from a dynamic page: <span id=\"sx\">?</span></p><script>try { document.getElementById(\"sx\").textContent = dynGreeting(\"zeis\"); } catch (e) { document.getElementById(\"sx\").textContent = \"NO dynGreeting global: \" + e.message; } </script>"
                    };
                }
            }
        ];
    }
}
sdk.RegisterWebsite(QEDynProbeSite);

/* ── The quest (the QA checklist, in run order) ───────────────────────────── */
class QEDynProbeQuest extends sdk.Quest {
    constructor() {
        super();
        this.Name = "QEDynProbeQuest";
        this.Title = "QE24 dynamic page probe";
        this.Description = "Developer QA probe for SDK 0.24 dynamic website pages (r238). The objectives are the checklist, in order: work top to bottom in the tracker. Nothing is a puzzle - each row is one thing to open, one thing to read, one thing to write down.";
        this.Group = "sandbox";
        this.AutoStart = false;
        this.AutoComplete = false;
        this.HasCompleteButton = false;
        this.Abandonable = true;
        this.HackhubPost = {
            content: "QA probe (r238): the dynamic-page quest. Accept to run the twelve rows against http://" + HOST + " - the objectives are the checklist, in order.",
            comments: []
        };
        this.Objectives = [
            { name: "dp-01-control", description: "Open http://" + HOST + "/ in the Browser. Note: does the site-export line show a greeting (site Exports from a STATIC page) or an error?" },
            { name: "dp-02-echo", description: "Open http://" + HOST + "/echo?msg=zeis . The page should say 'You asked for: zeis'. WRITE DOWN the raw PageContext box (url, params, query, searchStr, allKeys) - it is the evidence for the path-param syntax." },
            { name: "dp-03-article-hit", description: "Open http://" + HOST + "/article/1 . An article titled 'Article one: the lighthouse ledger' should render. Write down the 'params as passed' box." },
            { name: "dp-04-article-miss", description: "Open http://" + HOST + "/article/99 . It should NOT exist. WRITE DOWN EXACTLY what the browser shows (error page? blank? the site's 404?) - this settles the null behaviour." },
            { name: "dp-05-news-before", description: "Open http://" + HOST + "/news BEFORE visiting /state. Three articles, no 'UPDATE'. Write down their order." },
            { name: "dp-06-state-first", description: "Open http://" + HOST + "/state . It should show phase: claimed and visits: 1. THIS visit fires the quest's beat (watch the debug log: 'beat fired')." },
            { name: "dp-07-state-second", description: "Open http://" + HOST + "/state AGAIN. visits must now be 2 (if it is still 1, the game cached the page) and phase must be beat-fired." },
            { name: "dp-08-news-after", description: "Open http://" + HOST + "/news AGAIN. The 'UPDATE' article must now be #1 and the three old articles have dropped one slot - the bcc.com pattern. Compare with bcc.com itself if you have a questline save." },
            { name: "dp-09-talkback", description: "Open http://" + HOST + "/form . Note the 'HackhubSDK global' line, then click the button. Write down the Result line (sent / NO HackhubSDK / NO Mail.send / ERR)." },
            { name: "dp-10-mail-from-page", description: "Automatic: ticks when the /form button's mail arrives (Mail.Sent with subject '" + MAIL_MARKER + "'). If the button worked but this never ticks, the page's send is not a Mail.Sent the quest can hear." },
            { name: "dp-11-page-exports", description: "Open http://" + HOST + "/exports?article=2 . The span should read article-2 (a per-page export built from this request). If it reads 'NO currentArticle global', per-page exports do not reach page scripts." },
            { name: "dp-12-site-exports-dyn", description: "Open http://" + HOST + "/site-exports . The line should show a greeting for 'zeis' (site Exports from a DYNAMIC page; dp-01 checked the static page)." }
        ];
    }
    CreateData() { return {}; }
    OnStart() {
        log("QEDynProbeQuest started");
        sendMailSafe("QE24 dynamic page probe",
            "The dynamic-page probe is live on http://" + HOST + ".\n\nThe quest objectives are the checklist - run them top to bottom in the tracker. Rows that say WRITE DOWN need a note for STATUS.md (the plan doc: docs/plans/r238-dynamic-pages-probe.md).\n\nRow 6 (first /state visit) fires the beat automatically - no terminal needed.");
    }
    OnObjectivesStart() {
        var self = this;
        var stateSeen = 0;
        var newsSeenBeforeBeat = false;
        var newsSeenAfterBeat = false;
        function onHttp(tx) {
            if (!tx || !tx.request || tx.request.host !== HOST) return;
            var path = tx.request.path || "";
            log("http-response " + (tx.request.method || "?") + " " + path);
            if (path === "/" || path === "") {
                completeObjectiveSafe(self, "dp-01-control");
            } else if (path === "/echo") {
                completeObjectiveSafe(self, "dp-02-echo");
            } else if (/^\/article\//.test(path)) {
                var id = path.split("/")[2] || "";
                if (LIBRARY[id]) {
                    completeObjectiveSafe(self, "dp-03-article-hit");
                } else {
                    completeObjectiveSafe(self, "dp-04-article-miss");
                }
            } else if (path === "/state") {
                stateSeen += 1;
                if (stateSeen === 1) {
                    fireBeat();
                    completeObjectiveSafe(self, "dp-06-state-first");
                } else {
                    completeObjectiveSafe(self, "dp-07-state-second");
                }
            } else if (path === "/news") {
                if (!DYN.beatFired) {
                    newsSeenBeforeBeat = true;
                    completeObjectiveSafe(self, "dp-05-news-before");
                } else if (newsSeenBeforeBeat) {
                    newsSeenAfterBeat = true;
                    completeObjectiveSafe(self, "dp-08-news-after");
                }
            } else if (path === "/form") {
                completeObjectiveSafe(self, "dp-09-talkback");
            } else if (path === "/exports") {
                completeObjectiveSafe(self, "dp-11-page-exports");
            } else if (path === "/site-exports") {
                completeObjectiveSafe(self, "dp-12-site-exports-dyn");
            }
        }
        this.Events.on("Http.Response", onHttp);
        this.Events.on("Mail.Sent", function (tx) {
            /* The marker subject is the only thing this probe controls on
               the send path - same discipline as the r209 mail rows. */
            var subject = tx && (tx.subject || (tx.mail && tx.mail.subject));
            if (subject === MAIL_MARKER) {
                log("mail-from-page: " + subject);
                completeObjectiveSafe(self, "dp-10-mail-from-page");
            }
        });
    }
    OnComplete() { log("QEDynProbeQuest OnComplete fired"); }
    OnAbandon() { log("QEDynProbeQuest abandoned"); }
}
sdk.RegisterQuest(QEDynProbeQuest);

/* Test hooks for the editor's vitest smoke test (src/compiler/__tests__/
   dynprobeMod.test.ts). The game ignores a mod's module exports. */
module.exports = { beat: fireBeat, state: DYN, HOST: HOST, MAIL_MARKER: MAIL_MARKER };
