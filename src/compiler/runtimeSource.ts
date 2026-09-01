/**
 * The interpreter that ships inside every exported mod.js. It is plain
 * ES2020 JavaScript (no template literals, no TS-only syntax) so the same
 * text is a valid `src/index.ts` for power users and a runnable `dist/mod.js`
 * for the game. Written without backticks/${ so it can live in a TS template
 * string.
 */
export const RUNTIME_SOURCE = String.raw`
var __QE = (function () {
    function getPath(obj, path) {
        return String(path).split(".").reduce(function (acc, k) {
            return acc == null ? acc : acc[k];
        }, obj);
    }
    function fill(tpl, scope) {
        return String(tpl).replace(/\{\{([^}]+)\}\}/g, function (_m, p) {
            var v = getPath(scope, p.trim());
            return v == null ? "" : String(v);
        });
    }
    function asString(x) { return x == null ? "" : String(x); }
    function matchClause(c, payload, scope) {
        var raw = getPath(payload, c.field);
        var val = fill(c.value, scope);
        switch (c.op) {
            case "equals": return asString(raw) === val;
            case "notEquals": return asString(raw) !== val;
            case "contains": return asString(raw).indexOf(val) >= 0;
            case "notContains": return asString(raw).indexOf(val) < 0;
            case "startsWith": return asString(raw).indexOf(val) === 0;
            case "endsWith": { var s = asString(raw); return s.slice(s.length - val.length) === val; }
            case "matches": try { return new RegExp(val).test(asString(raw)); } catch (e) { return false; }
            case "exists": return raw !== undefined;
            case "notEmpty": return asString(raw).length > 0;
            case "greaterThan": return Number(raw) > Number(val);
            case "lessThan": return Number(raw) < Number(val);
            default: return false;
        }
    }
    function matchAll(list, payload, scope) {
        var acc = true;
        for (var i = 0; i < list.length; i++) {
            var r = matchClause(list[i], payload, scope);
            acc = i === 0 ? r : (list[i].join === "or" ? (acc || r) : (acc && r));
        }
        return acc;
    }
    function matchInput(input, answer) {
        var a = input.caseSensitive ? String(answer) : String(answer).toLowerCase();
        var e = input.caseSensitive ? input.expected : String(input.expected).toLowerCase();
        if (!e) return true;
        if (input.matchMode === "contains") return a.indexOf(e) >= 0;
        if (input.matchMode === "regex") {
            try { return new RegExp(e).test(a); } catch (err) { return false; }
        }
        return a === e;
    }
    function sleep(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }
    return { getPath: getPath, fill: fill, matchAll: matchAll, matchInput: matchInput, sleep: sleep };
})();

function __qeRegisterProject(sdk, PROJECT) {

    /* The event a hackertyper node emits when fully revealed: the field the
       player filled in, or a generated one (the inspector promises this). */
    function __qeHtEvent(n) {
        return n.data.eventName && n.data.eventName.trim() ? n.data.eventName.trim() : "QE.ht." + n.id;
    }

    /* ── one quest ─────────────────────────────────────────────────────── */
    function registerQuest(qd) {
        var g = qd.graph;
        var byId = {};
        g.nodes.forEach(function (n) { byId[n.id] = n; });
        function outs(id) {
            return g.edges.filter(function (e) { return e.source === id; });
        }
        function flowOuts(id) {
            return outs(id).filter(function (e) { return e.kind === "flow"; });
        }

        var mailNodes = g.nodes.filter(function (n) { return n.type === "comms.dialogue" && n.data.kind === "mail"; });
        var mailIndex = {};
        var mailFrom = {};
        mailNodes.forEach(function (n, i) {
            mailIndex[n.id] = i;
            if (n.data.mail.from) mailFrom[n.id] = n.data.mail.from;
        });

        var Mails = mailNodes.map(function (n) {
            var m = n.data.mail;
            var out = { title: m.subject, content: m.content };
            if (m.attachment && m.attachment.name) out.attachment = m.attachment;
            return out;
        });

        var Dialog = {};
        (qd.dialog || []).forEach(function (b) {
            Dialog[b.name] = (b.lines || []).map(function (l) {
                var out = { speaker: l.speaker, text: l.text };
                if (l.isEnd) out.isEnd = true;
                if (l.options && l.options.length) {
                    out.options = l.options.map(function (o) {
                        var oo = { label: o.label };
                        if (o.text) oo.text = o.text;
                        if (o.switchBranch) oo.switchBranch = o.switchBranch;
                        if (o.isEnd) oo.isEnd = true;
                        return oo;
                    });
                }
                return out;
            });
        });

        var KisscordChats = g.nodes
            .filter(function (n) { return n.type === "comms.dialogue" && n.data.kind === "kisscord"; })
            .map(function (n) {
                return {
                    contactId: n.data.kisscord.contactId,
                    messages: (n.data.kisscord.messages || []).map(function (m) {
                        var out;
                        if (m.playerAction === "send") {
                            out = { content: m.playerText, isMine: true, delayMs: m.delayMs };
                        } else if (m.playerAction === "upload") {
                            out = { content: "[uploaded file: " + ((m.upload && m.upload.name) || "file") + "." + ((m.upload && m.upload.extension) || "txt") + "]", isMine: true, delayMs: m.delayMs };
                        } else if (m.playerAction === "input") {
                            out = { content: m.content || "(waiting for your answer)", delayMs: m.delayMs };
                        } else {
                            out = { content: m.content, isMine: m.isMine, delayMs: m.delayMs };
                        }
                        if (m.unlocksAfter && m.unlocksAfter.length) out.unlocksAfter = m.unlocksAfter;
                        return out;
                    }),
                };
            });

        var WeeChatChats = g.nodes
            .filter(function (n) { return n.type === "comms.dialogue" && n.data.kind === "weechat"; })
            .map(function (n) {
                return {
                    host: n.data.weechat.host,
                    password: n.data.weechat.password,
                    registerServer: n.data.weechat.registerServer,
                    messages: (n.data.weechat.messages || []).map(function (m) {
                        var out = m.playerAction === "send"
                            ? { content: m.playerText, username: "you" }
                            : { content: m.content, username: m.username };
                        if (m.delayMs) out.delayMs = m.delayMs;
                        return out;
                    }),
                };
            });

        var TwotterAccounts = (qd.twotterAccounts || []).map(function (a, i) {
            var out = {
                id: a.id || "account-" + (i + 1),
                username: a.username,
                displayName: a.displayName || a.username,
                avatar: a.avatar || "",
            };
            if (a.bio) out.bio = a.bio;
            if (a.followers != null) out.followers = a.followers;
            if (a.following != null) out.following = a.following;
            if (a.verified) out.verified = true;
            return out;
        });

        var tweetNodes = g.nodes.filter(function (n) { return n.type === "comms.tweet"; });
        var Tweets = tweetNodes.map(function (n) {
            /* Flat TweetDefinition, per the SDK: accountId + optional image. */
            var t = {
                accountId: n.data.accountId || (TwotterAccounts[0] && TwotterAccounts[0].id) || "",
                content: n.data.content,
            };
            if (n.data.image) t.image = n.data.image;
            if (n.data.likes != null) t.likes = n.data.likes;
            if (n.data.comments != null) t.comments = n.data.comments;
            if (n.data.shares != null) t.shares = n.data.shares;
            if (n.data.views != null) t.views = n.data.views;
            if (n.data.postedAgo) t.postedAgo = n.data.postedAgo;
            return t;
        });

        var objectiveNodes = g.nodes.filter(function (n) { return n.type === "objective"; });
        var questRef = null;

        var Objectives = objectiveNodes.map(function (n) {
            var unlocks = g.edges
                .filter(function (e) { return e.kind === "unlock" && e.target === n.id; })
                .map(function (e) { var s = byId[e.source]; return s && s.type === "objective" ? s.data.name : null; })
                .filter(Boolean);
            var trig = g.edges
                .filter(function (e) { return e.kind === "condition" && e.target === n.id; })
                .map(function (e) { return byId[e.source]; })
                .filter(function (s) { return s && s.type === "trigger.event"; })[0];
            var o = { name: n.data.name, description: n.data.description };
            if (unlocks.length) o.unlocksAfter = unlocks;
            if (n.data.hidden) o.hidden = true;
            if (n.data.hint) o.hint = n.data.hint;
            if (n.data.info) o.info = n.data.info;
            if (n.data.terminalCommand) o.terminalCommand = n.data.terminalCommand;
            if (trig) {
                var clauses = trig.data.conditions;
                o.trigger = {
                    event: trig.data.event,
                    condition: function (data) {
                        return __QE.matchAll(clauses, data, { data: data, Data: questRef ? questRef.Data : {} });
                    },
                };
            }
            return o;
        });

        function scopeOf(ctx) {
            return { data: ctx && ctx.payload, Data: questRef ? questRef.Data : {}, vars: ctx && ctx.vars };
        }

        function runFlow(nodeId, ctx, depth) {
            if (depth > 200) return Promise.resolve();
            var node = byId[nodeId];
            if (!node) return Promise.resolve();
            var scope = scopeOf(ctx);
            var next = function () {
                var edges = flowOuts(nodeId);
                if (node.type === "flow.random" && edges.length) {
                    edges = [edges[Math.floor(Math.random() * edges.length)]];
                }
                if (node.type === "flow.branch") {
                    var yes = __QE.matchAll(node.data.conditions, node.data.source === "data" ? (questRef ? questRef.Data : {}) : (ctx && ctx.payload) || {}, scopeOf(ctx));
                    edges = edges.filter(function (e) { return e.sourceHandle === (yes ? "true" : "false"); });
                }
                return edges.reduce(function (p, e) {
                    return p.then(function () { return runFlow(e.target, ctx, depth + 1); });
                }, Promise.resolve());
            };
            var d = node.data;
            switch (node.type) {
                case "world.network": {
                    var ip = sdk.Network.createSubnetNetwork(mapDevice(d.device));
                    (ctx.vars || {})[nodeId] = ip;
                    return next();
                }
                case "world.wifi":
                    /* SDK 0.21.0 has no wireless API: use it if a future
                       version ships one, otherwise fall back to a plain
                       router network so the machines at least exist. */
                    if (sdk.Network.createWifiNetwork) {
                        sdk.Network.createWifiNetwork({
                            ssid: d.ssid,
                            password: d.password,
                            signal: d.signal,
                            bssid: d.bssid,
                            channel: d.channel,
                            model: d.model,
                        });
                    } else {
                        var wifiIp = d.ipMode === "fixed" && d.ip
                            ? d.ip
                            : (sdk.Network.randomIp ? sdk.Network.randomIp() : "10.0.0.1");
                        sdk.Network.createSubnetNetwork(mapDevice({
                            ip: wifiIp,
                            type: "ROUTER",
                            model: d.model,
                            ports: d.ports || [],
                            users: d.users || [],
                            children: d.children || [],
                        }));
                    }
                    return next();
                case "world.toolResponse":
                    if (sdk.Shell && sdk.Shell.addCommandData) sdk.Shell.addCommandData(d.command, d.dataText);
                    return next();
                case "comms.dialogue":
                    if (d.kind === "mail" && mailIndex[node.id] != null) {
                        questRef.sendMail(mailIndex[node.id], mailFrom[node.id]);
                    }
                    if (d.kind === "phone") questRef.createDialog(d.phone && d.phone.branch ? d.phone.branch : "default");
                    return next();
                case "fx.notify":
                    if (sdk.UI) {
                        if (d.variant === "toast" && sdk.UI.toast) sdk.UI.toast(d.message);
                        else if (sdk.UI.notify) sdk.UI.notify(d.message);
                    }
                    return next();
                case "fx.setData":
                    questRef.SetData(d.key, __QE.fill(d.value, scope));
                    return next();
                case "fx.claimQuest":
                    sdk.Quest.claim(d.quest);
                    return next();
                case "fx.pay":
                case "fx.withdraw": {
                    if (sdk.Bank) {
                        var amount = d.amountMode === "percent"
                            ? Math.round(((sdk.Bank.getBalance ? sdk.Bank.getBalance() : 0) * Number(d.percent || 0)) / 100)
                            : Number(d.amount || 0);
                        if (amount > 0) {
                            var tx = { amount: amount, description: __QE.fill(d.description || "", scope) };
                            if (node.type === "fx.pay" && sdk.Bank.transaction) sdk.Bank.transaction(tx);
                            if (node.type === "fx.withdraw" && sdk.Bank.withdraw) sdk.Bank.withdraw(tx);
                        }
                    }
                    return next();
                }
                case "fx.shell":
                    if (sdk.Shell && sdk.Shell.execute) sdk.Shell.execute(__QE.fill(d.command, scope));
                    return next();
                case "flow.delay":
                    return __QE.sleep(Math.max(0, Number(d.seconds || 0)) * 1000).then(next);
                case "objective":
                    /* When the story flow reaches an objective, tick it off.
                       (Objectives with a trigger event complete via the SDK
                       declarative trigger instead.) */
                    if (d.name && questRef && questRef.completeObjective) questRef.completeObjective(d.name);
                    return next();
                case "trigger.event":
                case "entry.start":
                case "entry.load":
                case "entry.complete":
                case "entry.abandon":
                case "comms.tweet":
                    return next();
                case "reply.input":
                case "reply.hackertyper":
                    /* The player has to act before the story continues: the
                       flow pauses here and is resumed by the terminal command
                       (reply.input) or the reveal listener (hackertyper). */
                    return Promise.resolve();
                default:
                    return next();
            }
        }

        function mapDevice(dev) {
            var out = {
                ip: dev.ip,
                type: dev.type,
                ports: (dev.ports || []).map(function (p) {
                    var o = { external: p.external, internal: p.internal, active: !!p.active, service: p.service };
                    if (p.version) o.version = p.version;
                    return o;
                }),
                users: (dev.users || []).map(function (u) {
                    var o = sdk.Network.createUser ? sdk.Network.createUser({ username: u.username, password: u.password }) : { username: u.username, password: u.password };
                    if (u.firstName) o.firstName = u.firstName;
                    if (u.lastName) o.lastName = u.lastName;
                    return o;
                }),
                children: (dev.children || []).map(mapDevice),
            };
            if (dev.model) out.model = dev.model;
            if (dev.accessable != null) out.accessable = dev.accessable;
            if (dev.rules) out.rules = dev.rules;
            if (dev.rootFiles) out.rootFiles = dev.rootFiles;
            if (dev.vulnerabilities) out.vulnerabilities = dev.vulnerabilities;
            if (dev.domainName) out.domainName = dev.domainName;
            return out;
        }

        var QC = (function () {
            var cls = class extends sdk.Quest {
                constructor() {
                    super(...arguments);
                    questRef = this;
                    this.Name = qd.name;
                    this.Title = qd.title;
                    this.Description = qd.description;
                    this.Group = qd.group;
                    this.Rewards = qd.rewards;
                    if (qd.employer && Object.keys(qd.employer).length) this.Employer = qd.employer;
                    if (qd.icon) this.Icon = qd.icon;
                    /* Behaviour toggles from the quest settings. AutoStart is
                       the big one: without it the quest waits to be claimed
                       and none of the On… hooks ever run. */
                    if (qd.autoStart) this.AutoStart = true;
                    if (qd.autoComplete != null) this.AutoComplete = !!qd.autoComplete;
                    if (qd.abandonable != null) this.Abandonable = !!qd.abandonable;
                    if (qd.hasCompleteButton) this.HasCompleteButton = true;
                    if (qd.questsToComplete && qd.questsToComplete.length) this.QuestsToComplete = qd.questsToComplete;
                    if (qd.maxClaim != null) this.MaxClaim = qd.maxClaim;
                    if (qd.maxClaimPerDay != null) this.MaxClaimPerDay = qd.maxClaimPerDay;
                    if (qd.hackhubPost) {
                        var hp = { content: qd.hackhubPost.content };
                        if (qd.hackhubPost.media) hp.media = qd.hackhubPost.media;
                        if (qd.hackhubPost.authorName) hp.author = { name: qd.hackhubPost.authorName };
                        if (qd.hackhubPost.likes != null) hp.likes = qd.hackhubPost.likes;
                        if (qd.hackhubPost.comments && qd.hackhubPost.comments.length) {
                            hp.comments = qd.hackhubPost.comments.map(function (c) {
                                return { author: { name: c.authorName }, content: c.content };
                            });
                        }
                        this.HackhubPost = hp;
                    }
                    this.Objectives = Objectives;
                    if (Mails.length) this.Mails = Mails;
                    if (Object.keys(Dialog).length) this.Dialog = Dialog;
                    if (KisscordChats.length) this.KisscordChats = KisscordChats;
                    if (WeeChatChats.length) this.WeeChatChats = WeeChatChats;
                    /* Accounts AND tweets are registered through the Twotter
                       API on mod load (complete platform records, sensible
                       defaults for banner/joinedAt/interaction/etc). The
                       quest-level lists are only the fallback for games without
                       that API — the quest converter leaves platform fields
                       undefined, which crashed Twotter search ("undefined …
                       toLowerCase"). Because accounts are suppressed when the
                       API is present, the quest-level tweet converter has no
                       account list to resolve a tweet's author from, so tweets
                       MUST go through the API too whenever it exists. */
                    if (TwotterAccounts.length && !(sdk.Twotter && sdk.Twotter.addUser)) {
                        this.TwotterAccounts = TwotterAccounts;
                    }
                    if (Tweets.length && !(sdk.Twotter && sdk.Twotter.postTweet)) {
                        this.Tweets = Tweets;
                    }
                }
                OnStart() {
                    var ctx = { payload: {}, vars: {} };
                    g.nodes
                        .filter(function (n) { return n.type === "entry.start"; })
                        .forEach(function (n) { runFlow(n.id, ctx, 0); });
                }
                OnObjectivesStart() {
                    var self = this;
                    var ctx = { payload: {}, vars: {} };
                    g.nodes
                        .filter(function (n) { return n.type === "entry.load"; })
                        .forEach(function (n) { runFlow(n.id, ctx, 0); });
                    g.nodes
                        .filter(function (n) {
                            return n.type === "reply.hackertyper" &&
                                g.edges.some(function (e) { return e.source === n.id && e.kind === "flow"; });
                        })
                        .forEach(function (n) {
                            self.Events.on(__qeHtEvent(n), function () {
                                flowOuts(n.id).forEach(function (e) { runFlow(e.target, { payload: {}, vars: {} }, 0); });
                            });
                        });
                    g.nodes
                        .filter(function (n) {
                            if (n.type !== "trigger.event") return false;
                            return !g.edges.some(function (e) { return e.source === n.id && e.kind === "condition"; });
                        })
                        .forEach(function (n) {
                            self.Events.on(n.data.event, function (data) {
                                if (__QE.matchAll(n.data.conditions, data, { data: data, Data: self.Data })) {
                                    flowOuts(n.id).forEach(function (e) { runFlow(e.target, { payload: data, vars: {} }, 0); });
                                }
                            });
                        });
                }
                OnComplete() {
                    var ctx = { payload: {}, vars: {} };
                    g.nodes
                        .filter(function (n) { return n.type === "entry.complete"; })
                        .forEach(function (n) { runFlow(n.id, ctx, 0); });
                }
                OnAbandon() {
                    var ctx = { payload: {}, vars: {} };
                    g.nodes
                        .filter(function (n) { return n.type === "entry.abandon"; })
                        .forEach(function (n) { runFlow(n.id, ctx, 0); });
                }
            };
            return cls;
        })();

        sdk.RegisterQuest(QC);
        questRef = null;

        /* commands for manual-input moments and reply.input nodes */
        var inputMoments = [];
        g.nodes.forEach(function (n) {
            if (n.type === "comms.dialogue") {
                var msgs = n.data.kind === "kisscord" ? n.data.kisscord.messages : n.data.kind === "weechat" ? n.data.weechat.messages : [];
                (msgs || []).forEach(function (m, i) {
                    if (m.playerAction === "input" && m.input) {
                        inputMoments.push({ id: n.id + ":" + i, input: m.input, label: m.content || "Type your answer:" });
                    }
                });
            }
        });
        g.nodes.filter(function (n) { return n.type === "reply.input"; }).forEach(function (n) {
            inputMoments.push({ id: n.id, input: { expected: n.data.expected, matchMode: n.data.matchMode, caseSensitive: n.data.caseSensitive, failureText: n.data.failureMessage, wrongRoute: "wrong" }, label: n.data.prompt || "Answer:", node: n });
        });

        inputMoments.forEach(function (moment) {
            var cmdName = "qe-" + moment.id.replace(/[^a-z0-9]+/gi, "-").slice(0, 24).toLowerCase();
            var cls = class extends sdk.Command {
                constructor() {
                    super(...arguments);
                    this.CommandName = cmdName;
                    this.Description = moment.node ? moment.node.data.commandDescription || "Quest input" : "Answer to continue the conversation";
                }
                Run(tools) {
                    var input = moment.input;
                    return tools.prompt(input && input.expected && moment.node && moment.node.data.mask ? { label: moment.label, password: true } : moment.label).then(function (answer) {
                        if (__QE.matchInput(input, answer)) {
                            if (input.expected) tools.printSuccess("Correct.");
                            sdk.Events.emit("QE." + moment.id + ".ok", { answer: answer });
                            if (moment.node) flowOutsFrom(moment.node.id, "out");
                        } else {
                            tools.printError(input.failureText || "That is not it.");
                            sdk.Events.emit("QE." + moment.id + ".wrong", { answer: answer });
                            if (moment.node && input.wrongRoute === "wrong") flowOutsFrom(moment.node.id, "failure");
                        }
                    });
                }
            };
            sdk.RegisterCommand(cls);
        });

        function flowOutsFrom(id, handle) {
            g.edges
                .filter(function (e) { return e.source === id && e.kind === "flow" && (!handle || e.sourceHandle === handle); })
                .forEach(function (e) { runFlow(e.target, { payload: {}, vars: {} }, 0); });
        }

        /* hackertyper widgets become pages on the referenced website */
        g.nodes.filter(function (n) { return n.type === "reply.hackertyper"; }).forEach(function (n) {
            __QE_HACKERTYPER.push({ node: n, questName: qd.name });
        });
    }

    /* ── websites ──────────────────────────────────────────────────────── */
    function registerWebsite(w, extraPages) {
        var pages = (w.pages || []).map(function (p) {
            return { path: p.path, title: p.title, html: p.content, seo: !!p.seo };
        });
        (extraPages || []).forEach(function (p) { pages.push(p); });
        var cls = class extends sdk.Website {
            constructor() {
                super(...arguments);
                this.SiteName = w.name || w.host;
                this.Host = w.host;
                this.Pages = pages;
            }
        };
        sdk.RegisterWebsite(cls);
    }

    var __QE_HACKERTYPER = [];

    (PROJECT.quests || []).forEach(registerQuest);

    /* attach hackertyper widget pages to their target sites */
    (PROJECT.websites || []).forEach(function (w) {
        var extras = [];
        __QE_HACKERTYPER.forEach(function (h) {
            if (h.node.data.surface !== "website") return;
            var ref = String(h.node.data.targetRef || "");
            if (ref.indexOf(w.host) !== 0) return;
            extras.push({
                path: "/qe/ht/" + h.node.id,
                title: h.node.data.heading || "Terminal",
                seo: false,
                html: [
                    "<!DOCTYPE html><html><head><style>body{background:#000;color:#0f0;font-family:monospace;padding:24px}</style></head><body>",
                    "<h3>" + (h.node.data.heading || "") + "</h3><pre id='t'></pre>",
                    "<script>var s=" + JSON.stringify(h.node.data.text) + ";var i=0;var done=false;document.addEventListener('keydown',function(){if(done)return;i=Math.min(s.length,i+" + (h.node.data.charsPerKeypress || 3) + ");document.getElementById('t').textContent=s.slice(0,i);if(i>=s.length){done=true;HackhubSDK.Events.emit(" + JSON.stringify(__qeHtEvent(h.node)) + ",{});}});</" + "script>",
                    "</body></html>",
                ].join(""),
            });
        });
        registerWebsite(w, extras);
    });
    var Mod = class extends sdk.Bootstrap {
        OnModPackageLoaded() {
            /* Register Twotter accounts through the platform API so they get
               complete user records — the quest-level converter omits fields
               the search UI dereferences (banner, joinedAt, password…). */
            if (!sdk.Twotter || !sdk.Twotter.createUser || !sdk.Twotter.addUser) return;
            (PROJECT.quests || []).forEach(function (qd) {
                (qd.twotterAccounts || []).forEach(function (a) {
                    if (!a.username) return;
                    if (sdk.Twotter.getUserByUsername && sdk.Twotter.getUserByUsername(a.username)) return;
                    var full = String(a.displayName || a.username).trim().split(/\s+/);
                    var options = {
                        id: a.id,
                        username: a.username,
                        firstName: full[0] || a.username,
                        lastName: full.slice(1).join(" "),
                        verified: !!a.verified,
                    };
                    if (a.avatar) options.avatar = a.avatar;
                    if (a.bio) options.bio = a.bio;
                    if (a.followers != null) options.followers = a.followers;
                    if (a.following != null) options.following = a.following;
                    sdk.Twotter.addUser(sdk.Twotter.createUser(options));
                });
            });

            /* Register tweets through the platform API too. The quest-level
               TweetDefinition is flat (accountId + likes/comments/…) and has no
               id/userId/interaction; the game's converter would have to invent
               those, and — with accounts suppressed above — has no account list
               to resolve the author from. Both gaps end in the same undefined
               deref that crashed search, so we build the complete TwotterTweet
               here. */
            if (!sdk.Twotter.postTweet) return;
            (PROJECT.quests || []).forEach(function (qd) {
                var accounts = qd.twotterAccounts || [];
                if (!accounts.length) return;
                /* Resolve a tweet's author to a real registered user id. The
                   editor's accountId points at a quest account; look that up to
                   get the username, then ask the platform for the id it stored
                   (createUser may reassign it). Fall back sensibly at each step
                   so a missing author never yields an undefined userId. */
                var resolveUserId = function (accountId) {
                    var acct = null;
                    for (var i = 0; i < accounts.length; i++) {
                        if (accounts[i].id === accountId) { acct = accounts[i]; break; }
                    }
                    if (!acct) acct = accounts[0];
                    if (acct && acct.username && sdk.Twotter.getUserByUsername) {
                        var u = sdk.Twotter.getUserByUsername(acct.username);
                        if (u && u.id) return u.id;
                    }
                    return (acct && acct.id) || accountId || "";
                };
                var tweetNodes = ((qd.graph && qd.graph.nodes) || []).filter(function (n) {
                    return n.type === "comms.tweet";
                });
                tweetNodes.forEach(function (n) {
                    var d = n.data || {};
                    var userId = resolveUserId(d.accountId);
                    if (!userId) return;
                    var tweet = {
                        id: "tweet-" + n.id,
                        userId: userId,
                        content: d.content || "",
                        interaction: {
                            comments: d.comments != null ? d.comments : 0,
                            share: d.shares != null ? d.shares : 0,
                            likes: d.likes != null ? d.likes : 0,
                            views: d.views != null ? d.views : 0,
                        },
                        showInTimeline: true,
                    };
                    if (d.image) tweet.image = d.image;
                    sdk.Twotter.postTweet(tweet);
                });
            });
        }
    };
    sdk.RegisterModPackage(Mod);
}
`;
