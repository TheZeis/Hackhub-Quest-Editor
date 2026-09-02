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
    /* Turn an ISO-ish date (yyyy-mm-dd) into the age phrase the Twotter SDK
       expects ("3 days", "2 months", "1 year"). Returns "" for a blank or
       unparseable date so callers can fall back to real-time display. */
    function ageStringFromDate(value) {
        if (!value) return "";
        var then = new Date(value);
        if (isNaN(then.getTime())) return "";
        var secs = Math.floor((Date.now() - then.getTime()) / 1000);
        if (secs < 60) return "just now";
        var units = [
            ["year", 31536000],
            ["month", 2592000],
            ["week", 604800],
            ["day", 86400],
            ["hour", 3600],
            ["minute", 60],
        ];
        for (var i = 0; i < units.length; i++) {
            var n = Math.floor(secs / units[i][1]);
            if (n >= 1) return n + " " + units[i][0] + (n === 1 ? "" : "s");
        }
        return "just now";
    }
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
    /* Never let an optional lookup take a quest down with it: a missing
       permission, a missing API or a throwing getter all become "". */
    function safe(fn) {
        try {
            var v = fn();
            return v == null ? "" : v;
        } catch (e) {
            return "";
        }
    }
    function log(msg) {
        try { if (typeof console !== "undefined" && console.log) console.log("[quest-editor] " + msg); } catch (e) { /* nothing to do */ }
    }
    function sleep(ms) {
        /* Prefer the game's own timer (SDK 0.21.0 Random.sleep) so waits obey
           whatever the game does with time; fall back to a plain timeout when
           the API is not there. */
        try {
            if (typeof sdk !== "undefined" && sdk && sdk.Random && sdk.Random.sleep) {
                return Promise.resolve(sdk.Random.sleep(ms));
            }
        } catch (e) { /* fall through to the timeout below */ }
        return new Promise(function (res) { setTimeout(res, ms); });
    }
    return { getPath: getPath, fill: fill, matchAll: matchAll, matchInput: matchInput, sleep: sleep, ageStringFromDate: ageStringFromDate, safe: safe, log: log };
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

        var kisscordNodes = g.nodes
            .filter(function (n) { return n.type === "comms.dialogue" && n.data.kind === "kisscord"; });
        var KisscordChats = kisscordNodes
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

        /* WeeChatChatDefinition (the declarative, quest-scoped chat script) only
           has host/messages in the SDK — there is no password or
           registerServer field on it. Making the server something the
           player can actually connect to (weechat HOST PASSWORD) is a
           separate, imperative call: WeeChat.createServer(host, password).
           That registration (and its matching removeServer cleanup) is done
           in OnObjectivesStart/OnComplete/OnAbandon below — see
           weechatServers. */
        var weechatServers = g.nodes
            .filter(function (n) { return n.type === "comms.dialogue" && n.data.kind === "weechat" && n.data.weechat.registerServer; })
            .map(function (n) { return { host: n.data.weechat.host, password: n.data.weechat.password }; });

        var weechatNodes = g.nodes
            .filter(function (n) { return n.type === "comms.dialogue" && n.data.kind === "weechat"; });
        var WeeChatChats = weechatNodes
            .map(function (n) {
                return {
                    host: n.data.weechat.host,
                    messages: (n.data.weechat.messages || []).map(function (m) {
                        var out = m.playerAction === "send"
                            ? { content: m.playerText, username: "you" }
                            : { content: m.content, username: m.username };
                        if (m.delayMs) out.delayMs = m.delayMs;
                        return out;
                    }),
                };
            });

        /* Timed chats — OPT IN, per node ("Play when the story reaches this
           node"), exactly like timed tweets. A quest-level KisscordChats /
           WeeChatChats script is handed to the engine when the quest starts, so
           a conversation that has to land on a Sequence beat cannot use that
           path. Those nodes are played through the platform API instead
           (SDK 0.21.0: Kisscord.sendMessage(channelUserId, content, isMine),
           WeeChat.sendMessage({host, username, message})), one message at a
           time, honouring each message's own delay. Everything else stays
           declarative, which is what the engine scopes and cleans up for us. */
        var chatOfNode = {};
        kisscordNodes.forEach(function (n, i) { chatOfNode[n.id] = KisscordChats[i]; });
        weechatNodes.forEach(function (n, i) { chatOfNode[n.id] = WeeChatChats[i]; });
        var liveChat = {};
        function optedInAndWired(n) {
            return n.data.postLive === true && g.edges.some(function (e) {
                return e.kind === "flow" && e.target === n.id;
            });
        }
        kisscordNodes.forEach(function (n) {
            if (optedInAndWired(n) && sdk.Kisscord && sdk.Kisscord.sendMessage) liveChat[n.id] = "kisscord";
        });
        weechatNodes.forEach(function (n) {
            if (optedInAndWired(n) && sdk.WeeChat && sdk.WeeChat.sendMessage) liveChat[n.id] = "weechat";
        });
        var DeclaredKisscordChats = KisscordChats.filter(function (_c, i) { return !liveChat[kisscordNodes[i].id]; });
        var DeclaredWeeChatChats = WeeChatChats.filter(function (_c, i) { return !liveChat[weechatNodes[i].id]; });
        var playedChats = {};

        function sendChatNow(node, scope) {
            var mode = liveChat[node.id];
            var chat = chatOfNode[node.id];
            if (!mode || !chat || playedChats[node.id]) return Promise.resolve();
            /* Once per playthrough: a conversation replayed by a loop would
               stack duplicates in a window the player may still be reading. */
            playedChats[node.id] = true;
            return (chat.messages || []).reduce(function (chain, m) {
                return chain.then(function () {
                    var wait = Math.max(0, Number(m.delayMs || 0));
                    var send = function () {
                        var content = __QE.fill(m.content || "", scope);
                        if (mode === "kisscord") sdk.Kisscord.sendMessage(chat.contactId, content, !!m.isMine);
                        else sdk.WeeChat.sendMessage({ host: chat.host, username: m.username || "", message: content });
                    };
                    return wait > 0 ? __QE.sleep(wait).then(send) : send();
                });
            }, Promise.resolve());
        }

        var TwotterAccounts = (qd.twotterAccounts || []).map(function (a, i) {
            var out = {
                id: a.id || "account-" + (i + 1),
                username: a.username,
                displayName: a.displayName || a.username,
                avatar: a.avatar || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAXUlEQVR42u3YQQkAIBBFwU3jxQBGMIEp7H/fEoJ8GHgF5vpqzBVdAQAAAAAAAAAAAAAAAAB8AOxznwQAAAAAAAAAAAAAAAAAAAAAkAVw5gAAAAAAAAAAAAAA",
            };
            /* Always a value, never a hole. An account field the engine copies
               through as undefined ends up in the save file, and Twotter's
               search lowercases these strings on every keystroke: one undefined
               field there takes the whole game down, and the broken record
               outlives the mod. */
            out.bio = a.bio || "";
            out.followers = Number(a.followers || 0);
            out.following = Number(a.following || 0);
            out.verified = !!a.verified;
            return out;
        });

        /* ── Twotter save-safety pass ────────────────────────────────────
           A TwotterUser in the game's save has more fields than a quest
           account definition can carry (name, surname, banner, joinedAt,
           password …). Whatever the engine leaves unset stays undefined in the
           save, and Twotter's search calls .toLowerCase() on those strings for
           every result it checks: search a word that matches nothing and the
           game dies — before the mod is removed, and after, because the record
           is in the save now.

           So once the accounts exist, look each one up and fill in anything
           that is not a string. It costs nothing when the engine already did it
           right, and it repairs a save that a previous version broke, provided
           the same account is loaded again. What it fixed is logged, so a
           crash report can say which field was missing. */
        /* Every account this quest puts on Twotter is also handed to the
           package-level repair pass (see __qeRepairTwotter), which runs when
           the mod loads and again whenever the quest starts. */
        TwotterAccounts.forEach(function (a) { __QE_TWOTTER_ACCOUNTS.push(a); });
        function repairTwotterAccounts() { __qeRepairTwotter(sdk); }

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
            /* Timestamp. "now" leaves postedAgo unset so the game shows the post
               relative to real time (its always-valid fallback). "relative"
               passes the author's age string straight through. "absolute" turns
               a picked date into the same kind of age string the SDK expects
               ("3 days", "2 months", "1 year") so it never hands the game an
               unparseable date. */
            var mode = n.data.timeMode || (n.data.postedAgo ? "relative" : "now");
            if (mode === "relative" && n.data.postedAgo) {
                t.postedAgo = n.data.postedAgo;
            } else if (mode === "absolute" && n.data.postedAt) {
                var ago = __QE.ageStringFromDate(n.data.postedAt);
                if (ago) t.postedAgo = ago;
            }
            if (n.data.showInTimeline) t.showInTimeline = true;
            return t;
        });

        /* Timed tweets — OPT IN, per node ("Post when the story reaches this
           node"). Quest-level Tweets are registered when the quest starts, so a
           tweet that has to land on a Sequence beat cannot use that path; those
           nodes go through the platform API instead (SDK 0.21.0:
           Twotter.postTweet(tweet)). Everything else stays declarative, which is
           what the engine scopes and cleans up for us, and what rounds 21–22
           showed to be the reliable path. No opt-in, or no postTweet in this
           build of the game, means nothing changes. */
        var canPostLive = !!(sdk.Twotter && sdk.Twotter.postTweet);
        var tweetOfNode = {};
        var timedTweet = {};
        tweetNodes.forEach(function (n, i) {
            tweetOfNode[n.id] = Tweets[i];
            timedTweet[n.id] = canPostLive && n.data.postLive === true && g.edges.some(function (e) {
                return e.kind === "flow" && e.target === n.id;
            });
        });
        var DeclaredTweets = Tweets.filter(function (_t, i) {
            return !timedTweet[tweetNodes[i].id];
        });
        var postedTweets = {};

        function postTweetNow(node, scope) {
            var t = tweetOfNode[node.id];
            if (!t || postedTweets[node.id]) return;
            postedTweets[node.id] = true;
            var account = null;
            for (var i = 0; i < TwotterAccounts.length; i++) {
                if (TwotterAccounts[i].id === t.accountId) account = TwotterAccounts[i];
            }
            /* The platform keeps its own user records; prefer the id it knows
               the account by, and fall back to the quest-level id. */
            var userId = t.accountId;
            if (account && sdk.Twotter.getUserByUsername) {
                var live = sdk.Twotter.getUserByUsername(account.username);
                if (live && live.id) userId = live.id;
            }
            var payload = {
                id: "qe-" + qd.name + "-" + node.id,
                userId: userId,
                content: __QE.fill(t.content, scope),
                interaction: {
                    comments: Number(t.comments || 0),
                    share: Number(t.shares || 0),
                    likes: Number(t.likes || 0),
                    views: Number(t.views || 0),
                },
            };
            if (t.showInTimeline) payload.showInTimeline = true;
            /* TwotterTweet has no picture field in SDK 0.21.0; passing it costs
               nothing and lets a future engine use it. */
            if (t.image) payload.image = t.image;
            sdk.Twotter.postTweet(payload);
        }

        var objectiveNodes = g.nodes.filter(function (n) { return n.type === "objective"; });
        var questRef = null;
        var needsTargetIp = g.nodes.some(function (n) {
            return (n.type === "world.network" || n.type === "world.wifi") && n.data.ipMode === "random";
        });

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
                        return __QE.matchAll(clauses, data, dataScope());
                    },
                };
            }
            return o;
        });

        /* Builds the scope object {{token}} fields resolve against.
           data/Data both point at the quest's own persisted Data (set via
           SetData / CreateData) — NOT the current event payload, which is
           matched separately via each condition's own field selector. This
           matches what every field hint in the editor promises ("insert a
           value you saved earlier"). player and random fields are computed
           fresh each call so repeated use of e.g. {{random.password}}
           yields independent values. */
        function dataScope(extra) {
            var d = questRef ? questRef.Data : {};
            /* Every player/random field is a GETTER, computed only if a token
               actually asks for it, and never allowed to throw. Reading them
               eagerly cost a mod its whole quest once: a project with no
               {{player.ip}} anywhere still called Network.getPlayerIp on every
               scope, the loader refused it for want of the "network"
               permission, and the exception escaped OnStart so the quest never
               started. A value the author never mentioned must not be able to
               do that. */
            var base = {
                data: d,
                Data: d,
                player: {
                    get ip() { return __QE.safe(function () { return sdk.Network && sdk.Network.getPlayerIp ? sdk.Network.getPlayerIp() : ""; }); },
                    get email() { return __QE.safe(function () { return sdk.Mail && sdk.Mail.getPlayerEmail ? sdk.Mail.getPlayerEmail() : ""; }); },
                    get username() { return __QE.safe(function () { return sdk.Shell && sdk.Shell.getUsername ? sdk.Shell.getUsername() : ""; }); },
                },
                random: {
                    get password() { return __QE.safe(function () { return sdk.Random && sdk.Random.password ? sdk.Random.password() : ""; }); },
                    get ip() { return __QE.safe(function () { return sdk.Network && sdk.Network.randomIp ? sdk.Network.randomIp() : ""; }); },
                    get username() { return __QE.safe(function () { return sdk.Random && sdk.Random.username ? sdk.Random.username() : ""; }); },
                },
            };
            if (extra) { for (var k in extra) base[k] = extra[k]; }
            return base;
        }

        function scopeOf(ctx) {
            return dataScope({ vars: ctx && ctx.vars });
        }

        /* Kisscord/WeeChat/Tweet/Twotter content is registered declaratively
           on the instance (the SDK drives when each message actually shows,
           not the flow graph), so there's no single "send" call site to fill
           tokens at like there is for mail/dialog. Best effort: re-render
           with whatever Data exists once CreateData has populated it (called
           from OnObjectivesStart, which always runs after CreateData). This
           correctly resolves anything set in CreateData (including
           {{data.targetIp}}), but NOT values a flow node sets later via
           fx.setData mid-playthrough — those can't retroactively update
           content the SDK already registered. */
        function refillComms() {
            var scope = dataScope();
            if (DeclaredKisscordChats.length) {
                questRef.KisscordChats = DeclaredKisscordChats.map(function (c) {
                    return Object.assign({}, c, {
                        messages: c.messages.map(function (m) {
                            return m.content ? Object.assign({}, m, { content: __QE.fill(m.content, scope) }) : m;
                        }),
                    });
                });
            }
            if (DeclaredWeeChatChats.length) {
                questRef.WeeChatChats = DeclaredWeeChatChats.map(function (c) {
                    return Object.assign({}, c, {
                        messages: c.messages.map(function (m) {
                            return m.content ? Object.assign({}, m, { content: __QE.fill(m.content, scope) }) : m;
                        }),
                    });
                });
            }
            if (DeclaredTweets.length) {
                questRef.Tweets = DeclaredTweets.map(function (t) {
                    return Object.assign({}, t, { content: __QE.fill(t.content, scope) });
                });
            }
            if (TwotterAccounts.length) {
                questRef.TwotterAccounts = TwotterAccounts.map(function (a) {
                    return a.bio ? Object.assign({}, a, { bio: __QE.fill(a.bio, scope) }) : a;
                });
            }
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
                    /* "random" is allocated once in CreateData() and lives in
                       Data.targetIp, so the SAME ip is used here as whatever
                       {{data.targetIp}} resolves to elsewhere (mail, notify,
                       other device fields, condition values, ...). */
                    var netIp = d.ipMode === "random"
                        ? ((questRef && questRef.Data && questRef.Data.targetIp) || (sdk.Network.randomIp ? sdk.Network.randomIp() : d.device.ip))
                        : d.device.ip;
                    sdk.Network.createSubnetNetwork(mapDevice(Object.assign({}, d.device, { ip: netIp })));
                    return next();
                }
                case "world.wifi": {
                    var wifiIp = d.ipMode === "fixed" && d.ip
                        ? d.ip
                        : ((questRef && questRef.Data && questRef.Data.targetIp) || (sdk.Network.randomIp ? sdk.Network.randomIp() : "10.0.0.1"));
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
                }
                case "world.toolResponse":
                    if (sdk.Shell && sdk.Shell.addCommandData) sdk.Shell.addCommandData(d.command, d.dataText);
                    return next();
                case "comms.dialogue": {
                    /* Timed chat → play it here, message by message, so a
                       conversation can land on a Sequence beat. */
                    if (liveChat[node.id]) return sendChatNow(node, scope).then(next);
                    if (d.kind === "mail" && mailIndex[node.id] != null) {
                        var mi = mailIndex[node.id];
                        var baseMail = Mails[mi];
                        if (baseMail && questRef.Mails && questRef.Mails[mi]) {
                            var filledMail = { title: __QE.fill(baseMail.title, scope), content: __QE.fill(baseMail.content, scope) };
                            if (baseMail.attachment) filledMail.attachment = baseMail.attachment;
                            questRef.Mails[mi] = filledMail;
                        }
                        questRef.sendMail(mi, mailFrom[node.id]);
                    }
                    if (d.kind === "phone") {
                        var branchName = d.phone && d.phone.branch ? d.phone.branch : "default";
                        var baseLines = Dialog[branchName];
                        if (baseLines && questRef.Dialog && questRef.Dialog[branchName]) {
                            questRef.Dialog[branchName] = baseLines.map(function (line) {
                                var out = { speaker: line.speaker, text: __QE.fill(line.text, scope) };
                                if (line.isEnd) out.isEnd = true;
                                if (line.options) {
                                    out.options = line.options.map(function (o) {
                                        var oo = { label: o.label };
                                        if (o.text) oo.text = __QE.fill(o.text, scope);
                                        if (o.switchBranch) oo.switchBranch = o.switchBranch;
                                        if (o.isEnd) oo.isEnd = true;
                                        return oo;
                                    });
                                }
                                return out;
                            });
                        }
                        questRef.createDialog(branchName, d.phone && d.phone.startIndex ? d.phone.startIndex : 0);
                    }
                    return next();
                }
                case "fx.notify": {
                    var notifyMsg = __QE.fill(d.message, scope);
                    if (sdk.UI) {
                        if (d.variant === "toast" && sdk.UI.toast) sdk.UI.toast(notifyMsg);
                        else if (sdk.UI.notify) sdk.UI.notify(notifyMsg);
                    }
                    return next();
                }
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
                case "flow.sequence": {
                    /* Fire each output in author order, pausing the step's own
                       delay (milliseconds) before it. Steps own their sockets:
                       socket id is "step-" + step.id. */
                    var seqSteps = d.steps || [];
                    var seqOuts = flowOuts(nodeId);
                    return seqSteps.reduce(function (chain, step) {
                        return chain.then(function () {
                            var wait = Math.max(0, Number(step.delayMs || 0));
                            var handleId = "step-" + step.id;
                            var branch = seqOuts.filter(function (e) { return e.sourceHandle === handleId; });
                            var fire = function () {
                                return branch.reduce(function (p, e) {
                                    return p.then(function () { return runFlow(e.target, ctx, depth + 1); });
                                }, Promise.resolve());
                            };
                            return wait > 0 ? __QE.sleep(wait).then(fire) : fire();
                        });
                    }, Promise.resolve());
                }
                case "objective":
                    /* When the story flow reaches an objective, tick it off.
                       (Objectives with a trigger event complete via the SDK
                       declarative trigger instead.) */
                    if (d.name && questRef && questRef.completeObjective) questRef.completeObjective(d.name);
                    return next();
                case "comms.tweet":
                    /* Wired into the story → post it now, so a tweet can land
                       on a Sequence node's beat. Not wired → it was registered
                       declaratively with the quest and there is nothing to do. */
                    if (timedTweet[node.id]) postTweetNow(node, scope);
                    return next();
                case "trigger.event":
                case "entry.start":
                case "entry.load":
                case "entry.complete":
                case "entry.abandon":
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
                    /* Only the chats that are NOT timed into the story: the
                       timed ones are played live when the flow reaches them. */
                    if (DeclaredKisscordChats.length) this.KisscordChats = DeclaredKisscordChats;
                    if (DeclaredWeeChatChats.length) this.WeeChatChats = DeclaredWeeChatChats;
                    /* Twotter accounts and tweets are registered declaratively,
                       per the SDK's intended design: the engine reads these
                       quest-level lists, keeps them scoped to this quest, and
                       auto-removes them when the quest completes, is abandoned,
                       or the mod is uninstalled. (The imperative Twotter.*
                       global API was tried and rejected — it re-posted on every
                       load, could not carry tweet images, and left orphaned
                       records behind after the mod was removed.) */
                    if (TwotterAccounts.length) this.TwotterAccounts = TwotterAccounts;
                    /* Only the tweets that are NOT wired into the story: the
                       wired ones are posted live when the flow reaches them. */
                    if (DeclaredTweets.length) this.Tweets = DeclaredTweets;
                }
                CreateData() {
                    /* Required by the SDK (Quest.CreateData is abstract) even
                       when a quest has no data of its own to seed. Any
                       world.network/world.wifi node using ipMode: "random"
                       gets ONE ip allocated here, once, so it's stable
                       across reloads and shared by both the live device and
                       every {{data.targetIp}} reference. */
                    if (needsTargetIp) return { targetIp: sdk.Network.randomIp ? sdk.Network.randomIp() : "10.0.0.1" };
                    return {};
                }
                OnStart() {
                    var ctx = { payload: {}, vars: {} };
                    /* Before anything else: make sure the accounts this quest
                       just put on Twotter cannot crash its search. */
                    repairTwotterAccounts();
                    g.nodes
                        .filter(function (n) { return n.type === "entry.start"; })
                        .forEach(function (n) { runFlow(n.id, ctx, 0); });
                }
                OnObjectivesStart() {
                    var self = this;
                    var ctx = { payload: {}, vars: {} };
                    refillComms();
                    repairTwotterAccounts();
                    weechatServers.forEach(function (s) {
                        if (sdk.WeeChat && sdk.WeeChat.createServer) sdk.WeeChat.createServer(s.host, s.password);
                    });
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
                                if (__QE.matchAll(n.data.conditions, data, dataScope())) {
                                    flowOuts(n.id).forEach(function (e) { runFlow(e.target, { payload: data, vars: {} }, 0); });
                                }
                            });
                        });
                }
                OnComplete() {
                    var ctx = { payload: {}, vars: {} };
                    weechatServers.forEach(function (s) {
                        if (sdk.WeeChat && sdk.WeeChat.removeServer) sdk.WeeChat.removeServer(s.host, s.password);
                    });
                    g.nodes
                        .filter(function (n) { return n.type === "entry.complete"; })
                        .forEach(function (n) { runFlow(n.id, ctx, 0); });
                }
                OnAbandon() {
                    var ctx = { payload: {}, vars: {} };
                    weechatServers.forEach(function (s) {
                        if (sdk.WeeChat && sdk.WeeChat.removeServer) sdk.WeeChat.removeServer(s.host, s.password);
                    });
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
            inputMoments.push({ id: n.id, input: { expected: n.data.expected, matchMode: n.data.matchMode, caseSensitive: n.data.caseSensitive, failureText: n.data.failureMessage, wrongRoute: "wrong" }, label: n.data.prompt || "Your answer:", node: n });
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

    /* ── Twotter save safety ─────────────────────────────────────────────
       A TwotterUser in the save carries more fields than a quest account
       definition can (name, surname, banner, joinedAt, password …). Whatever
       the engine leaves unset stays undefined in the save file, and Twotter's
       search lowercases those strings for every record it tests: search a word
       that matches nothing and the game dies. Worse, the record outlives the
       mod, so the crash survives uninstalling it.

       So: look each account up and fill in anything that is not a string. It
       does nothing when the engine already built the record properly, and it
       repairs a save an earlier version broke — the mod only has to be
       installed, because this runs when the package loads as well as when a
       quest starts. Whatever it fixed is logged, so a crash report can name the
       missing field. */
    var __QE_TWOTTER_ACCOUNTS = [];
    var __QE_TWOTTER_STRINGS = ["username", "name", "surname", "avatar", "banner", "bio", "joinedAt", "password"];
    var __QE_TWOTTER_DONE = {};

    function __qeTwotterField(key, account) {
        var display = account.displayName || account.username || "";
        var space = display.indexOf(" ");
        switch (key) {
            case "username": return account.username || "";
            case "name": return space > 0 ? display.slice(0, space) : display;
            case "surname": return space > 0 ? display.slice(space + 1) : "";
            case "avatar": return account.avatar || "";
            case "bio": return account.bio || "";
            case "joinedAt": return new Date().toISOString();
            default: return "";
        }
    }

    /* Which of the fields Twotter search lowercases are not strings here. */
    function __qeMissingFields(user) {
        var missing = [];
        __QE_TWOTTER_STRINGS.forEach(function (k) {
            if (typeof user[k] !== "string") missing.push(k);
        });
        return missing;
    }

    /* Field-by-field types, for the game log: if this ever breaks again, the
       report says exactly what the record looked like. */
    function __qeSnapshot(user) {
        var seen = {};
        var parts = [];
        for (var k in user) {
            seen[k] = true;
            parts.push(k + ":" + (user[k] === undefined ? "undefined" : typeof user[k]));
        }
        __QE_TWOTTER_STRINGS.concat(["id", "followers", "following", "verified"]).forEach(function (k) {
            if (!seen[k]) parts.push(k + ":absent");
        });
        return parts.join(" ");
    }

    function __qeFetchUser(sdk, a) {
        var user = __QE.safe(function () {
            return (sdk.Twotter.getUserByUsername && sdk.Twotter.getUserByUsername(a.username)) ||
                (sdk.Twotter.getUserById && sdk.Twotter.getUserById(a.id)) || null;
        });
        return user && typeof user === "object" ? user : null;
    }

    /* A complete TwotterUser to put back in place of a half-built one: the
       engine's own factory where it exists, seeded from whatever the existing
       record already had right, and keeping its id so this replaces the
       account rather than adding a second one. */
    function __qeCompleteUser(sdk, user, a) {
        var display = a.displayName || a.username || "";
        var space = display.indexOf(" ");
        var seed = {
            id: user.id || a.id,
            username: user.username || a.username,
            firstName: space > 0 ? display.slice(0, space) : display,
            lastName: space > 0 ? display.slice(space + 1) : "",
            avatar: typeof user.avatar === "string" ? user.avatar : (a.avatar || ""),
            bio: a.bio || "",
            verified: typeof user.verified === "boolean" ? user.verified : !!a.verified,
            followers: typeof user.followers === "number" ? user.followers : Number(a.followers || 0),
            following: typeof user.following === "number" ? user.following : Number(a.following || 0),
        };
        var made = sdk.Twotter.createUser ? __QE.safe(function () { return sdk.Twotter.createUser(seed); }) : null;
        var out = made && typeof made === "object" ? made : {};
        for (var k in user) {
            var t = typeof user[k];
            if ((t === "string" || t === "number" || t === "boolean") && out[k] === undefined) out[k] = user[k];
        }
        out.id = seed.id;
        out.username = seed.username;
        __QE_TWOTTER_STRINGS.forEach(function (k) {
            if (typeof out[k] !== "string") out[k] = __qeTwotterField(k, a);
        });
        if (typeof out.followers !== "number") out.followers = seed.followers;
        if (typeof out.following !== "number") out.following = seed.following;
        if (typeof out.verified !== "boolean") out.verified = seed.verified;
        return out;
    }

    function __qeRepairTwotter(sdk) {
        if (!sdk.Twotter || !__QE_TWOTTER_ACCOUNTS.length) return;
        __QE_TWOTTER_ACCOUNTS.forEach(function (a) {
            if (__QE_TWOTTER_DONE[a.username]) return;
            var user = __qeFetchUser(sdk, a);
            /* Not on the platform yet — this runs again when the quest starts. */
            if (!user) return;

            var missing = __qeMissingFields(user);
            if (!missing.length) {
                __QE_TWOTTER_DONE[a.username] = true;
                __QE.log("Twotter account @" + a.username + " is complete; no repair needed");
                return;
            }
            __QE.log("Twotter account @" + a.username + " is missing " + missing.join(", ") +
                " — Twotter search lowercases these, so any search that does not match sooner crashes the game. Record: " +
                __qeSnapshot(user));

            /* 1. Patch what we were handed. If that was the live record, done. */
            missing.forEach(function (k) {
                try { user[k] = __qeTwotterField(k, a); } catch (e) { /* frozen */ }
            });
            var after = __qeFetchUser(sdk, a);
            if (after && !__qeMissingFields(after).length) {
                __QE_TWOTTER_DONE[a.username] = true;
                __QE.log("repaired Twotter account @" + a.username + " in place: filled " + missing.join(", "));
                return;
            }

            /* 2. The game handed us a copy, so the only way to fix the stored
                  record is to put a complete one back under the same id. */
            __QE_TWOTTER_DONE[a.username] = true;
            if (!sdk.Twotter.addUser) {
                __QE.log("cannot repair Twotter account @" + a.username +
                    ": this build of the game reads back a copy and offers no way to write the record");
                return;
            }
            __QE.safe(function () { sdk.Twotter.addUser(__qeCompleteUser(sdk, user, a)); return ""; });
            var again = __qeFetchUser(sdk, a);
            if (again && !__qeMissingFields(again).length) {
                __QE.log("repaired Twotter account @" + a.username +
                    " by replacing the stored record (filled " + missing.join(", ") + ")");
            } else {
                __QE.log("could not repair Twotter account @" + a.username +
                    "; it still reads back as " + __qeSnapshot(again || user) +
                    ". Twotter search will crash on a term that matches nothing — please report this record to the game authors");
            }
        });
    }

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
                    "<script>var s=" + JSON.stringify(h.node.data.text) + ";var i=0;var done=false;document.addEventListener('keydown',function(){if(done)return;i=Math.min(s.length,i+" + (h.node.data.charsPerKeypress || 3) + ");document.getElementById('t').textContent=s.slice(0,i);if(i===s.length){done=true;sdk.Events.emit(" + JSON.stringify("QE.ht." + h.node.id) + ");}});</script>",
                    "</body></html>",
                ].join(""),
            });
        });
        registerWebsite(w, extras);
    });
    var Mod = class extends sdk.Bootstrap {
        /* Twotter accounts and tweets are declared per-quest (see the Quest
           class above); the engine registers and cleans them up automatically,
           so no imperative Twotter.* calls are needed here. The one thing this
           does is repair account records the engine left half-built, which is
           why installing this mod is enough to un-break a save whose Twotter
           search crashes. */
        OnModPackageLoaded() {
            __qeRepairTwotter(sdk);
        }
    };
    sdk.RegisterModPackage(Mod);
}
`;
