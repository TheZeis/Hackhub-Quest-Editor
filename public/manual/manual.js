/*
 * The handbook's behaviour: navigation highlighting, search, and the
 * missing-image placeholder. Vanilla, no dependency, no network call.
 *
 * H11 — nothing here is load-bearing. If this file fails to load, or the
 * browser is old, the manual is still a readable set of linked HTML pages: the
 * table of contents is real markup, every link is a real anchor, and the
 * content is all in the document. This only adds polish.
 *
 * Search reads `window.MANUAL_INDEX`, which is generated into search-index.js
 * by scripts/build-manual-index.mjs. A plain <script src> rather than fetch(),
 * because fetch() is blocked on file:// and the manual must open off disk (H1).
 */
(function () {
    "use strict";

    /* ── Highlight the section the reader is in ─────────────────────────── */

    function initTocHighlight() {
        var links = Array.prototype.slice.call(
            document.querySelectorAll('nav.toc a[href^="#"]'),
        );
        if (!links.length) return;

        var byId = {};
        links.forEach(function (a) {
            var id = a.getAttribute("href").slice(1);
            var el = document.getElementById(id);
            if (el) byId[id] = a;
        });

        var targets = Object.keys(byId)
            .map(function (id) {
                return document.getElementById(id);
            })
            .filter(Boolean);
        if (!targets.length) return;

        function clear() {
            links.forEach(function (a) {
                a.removeAttribute("aria-current");
            });
        }

        if (!("IntersectionObserver" in window)) return;

        var visible = {};
        var observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (e) {
                    visible[e.target.id] = e.isIntersecting ? e.intersectionRatio : 0;
                });
                var best = null;
                var bestRatio = 0;
                Object.keys(visible).forEach(function (id) {
                    if (visible[id] > bestRatio) {
                        bestRatio = visible[id];
                        best = id;
                    }
                });
                clear();
                if (best && bestRatio > 0 && byId[best]) {
                    byId[best].setAttribute("aria-current", "true");
                }
            },
            { rootMargin: "0px 0px -70% 0px", threshold: [0, 0.25, 0.5, 1] },
        );
        targets.forEach(function (t) {
            observer.observe(t);
        });
    }

    /* ── Search ─────────────────────────────────────────────────────────── */

    function escapeHtml(s) {
        return String(s).replace(/[&<>"]/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
        });
    }

    /* Some pages carry more than one search box (the index page adds a big one
       under the hero), so wire every one rather than only the first. */
    function initSearch() {
        Array.prototype.slice.call(document.querySelectorAll(".search")).forEach(wireSearch);
    }

    function wireSearch(box) {
        var input = box.querySelector("input");
        var out = box.querySelector(".results");
        if (!input || !out) return;

        var index = window.MANUAL_INDEX || [];

        function render(rows, query) {
            if (!rows.length) {
                out.innerHTML =
                    '<div class="empty">Nothing matches “' + escapeHtml(query) + "”.</div>";
                out.classList.add("open");
                return;
            }
            out.innerHTML = rows
                .slice(0, 40)
                .map(function (r) {
                    var label = escapeHtml(r.title);
                    if (query.length > 1) {
                        var re = new RegExp(
                            "(" + query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")",
                            "gi",
                        );
                        label = label.replace(re, "<mark>$1</mark>");
                    }
                    return (
                        '<a href="' + escapeHtml(r.url) + '">' + label +
                        '<span class="where">' + escapeHtml(r.section || "") + "</span></a>"
                    );
                })
                .join("");
            out.classList.add("open");
        }

        function close() {
            out.classList.remove("open");
        }

        input.addEventListener("input", function () {
            var q = input.value.trim().toLowerCase();
            if (q.length < 2) {
                close();
                return;
            }
            var rows = index.filter(function (e) {
                return (
                    e.title.toLowerCase().indexOf(q) !== -1 ||
                    (e.text && e.text.toLowerCase().indexOf(q) !== -1)
                );
            });
            /* A title match outranks a body match, so a reader searching for a
               node name lands on the node page, not on every page mentioning it. */
            rows.sort(function (a, b) {
                var at = a.title.toLowerCase().indexOf(q) !== -1 ? 0 : 1;
                var bt = b.title.toLowerCase().indexOf(q) !== -1 ? 0 : 1;
                return at - bt;
            });
            render(rows, input.value.trim());
        });

        input.addEventListener("keydown", function (e) {
            if (e.key === "Escape") {
                close();
                input.blur();
            }
            if (e.key === "Enter") {
                var first = out.querySelector("a");
                if (first) window.location.href = first.getAttribute("href");
            }
        });

        document.addEventListener("click", function (e) {
            if (!box.contains(e.target)) close();
        });
    }

    /* ── Local code-rendered illustrations ─────────────────────────────── */

    /* Frames stay lazy, unfocusable and inert. The local-file exception keeps
       the trusted renderer's sibling CSS/JS accessible when the handbook is
       opened directly from disk; served pages keep the stricter opaque origin. */
    function initManualFigures() {
        var frames = Array.prototype.slice.call(
            document.querySelectorAll("iframe[data-manual-figure-scene][data-renderer-src]"),
        );
        if (!frames.length) return;

        var entries = frames.map(function (frame) {
            var figure = frame.closest("[data-manual-figure]");
            var entry = { frame: frame, figure: figure, timer: null, failed: false };

            function fail(message) {
                if (entry.failed) return;
                entry.failed = true;
                if (entry.timer !== null) window.clearTimeout(entry.timer);
                if (figure) {
                    figure.classList.add("manual-figure--failed");
                    var fallback = figure.querySelector(".manual-figure__fallback");
                    if (fallback) {
                        fallback.hidden = false;
                        if (message) fallback.setAttribute("data-failure", message);
                    }
                }
            }

            function markReady() {
                if (entry.failed) return;
                if (entry.timer !== null) window.clearTimeout(entry.timer);
                if (figure) figure.classList.add("manual-figure--ready");
                frame.dataset.sceneReady = "true";
            }

            entry.fail = fail;
            entry.markReady = markReady;
            frame.addEventListener("error", function () { fail("The local renderer did not load."); });
            frame.addEventListener("load", function () {
                if (frame.dataset.sceneReady === "true") return;
                if (entry.timer !== null) window.clearTimeout(entry.timer);
                entry.timer = window.setTimeout(function () {
                    fail("The local renderer did not report that its scene started.");
                }, 20000);
            });
            return entry;
        });

        window.addEventListener("message", function (event) {
            var entry = entries.find(function (item) { return item.frame.contentWindow === event.source; });
            if (!entry || !event.data || event.data.type !== "manual-figure-ready") return;
            if (event.data.scene !== entry.frame.getAttribute("data-manual-figure-scene")) {
                entry.fail("The renderer returned a different scene ID.");
            } else if (event.data.status === "error") {
                entry.fail("The scene could not be rendered.");
            } else if (event.data.status === "ready") {
                entry.markReady();
            }
        });

        var localFile = window.location.protocol === "file:";
        frames.forEach(function (frame) {
            frame.setAttribute("sandbox", localFile ? "allow-scripts allow-same-origin" : "allow-scripts");
            frame.src = frame.getAttribute("data-renderer-src");
        });
    }

    /* ── Missing raster screenshots ─────────────────────────────────────── */

    /* Until a raster image is captured, show its filename instead of a broken
       image icon. Code-rendered figures are tracked separately above. */
    function initImageFallbacks() {
        Array.prototype.slice.call(document.querySelectorAll("img")).forEach(function (img) {
            img.addEventListener("error", function () {
                if (img.dataset.fallbackApplied) return;
                img.dataset.fallbackApplied = "1";
                var name = (img.getAttribute("src") || "").split("/").pop();
                var box = document.createElement("div");
                box.className = "shot-pending";
                box.setAttribute("role", "img");
                box.textContent = "screenshot not captured yet — img/" + name;
                if (img.parentNode) img.parentNode.replaceChild(box, img);
            });
        });
    }

    function ready(fn) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", fn);
        } else {
            fn();
        }
    }

    ready(function () {
        initTocHighlight();
        initSearch();
        initManualFigures();
        initImageFallbacks();
    });
})();
