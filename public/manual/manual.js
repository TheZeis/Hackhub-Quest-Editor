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
        initManualFigureViewer(entries, localFile);
    }

    function initManualFigureViewer(entries, localFile) {
        var gallery = entries.filter(function (entry) {
            return entry.figure && entry.figure.getAttribute("data-manual-figure-expandable") === "true";
        });
        var dialogProbe = document.createElement("dialog");
        if (!gallery.length || typeof dialogProbe.showModal !== "function") return;

        function element(tag, className, text) {
            var node = document.createElement(tag);
            if (className) node.className = className;
            if (text) node.textContent = text;
            return node;
        }

        function makeButton(className, text, label) {
            var button = element("button", className, text);
            button.type = "button";
            button.setAttribute("aria-label", label);
            return button;
        }

        var dialog = element("dialog", "manual-figure-viewer");
        dialog.setAttribute("aria-labelledby", "manual-figure-viewer-title");
        dialog.setAttribute("aria-describedby", "manual-figure-viewer-description manual-figure-viewer-help");

        var layout = element("div", "manual-figure-viewer__layout");
        var header = element("header", "manual-figure-viewer__header");
        var headingGroup = element("div", "manual-figure-viewer__heading-group");
        var heading = element("h2", "manual-figure-viewer__title", "Larger illustration");
        heading.id = "manual-figure-viewer-title";
        var description = element("p", "manual-figure-viewer__description");
        description.id = "manual-figure-viewer-description";
        headingGroup.appendChild(heading);
        headingGroup.appendChild(description);

        var navigation = element("nav", "manual-figure-viewer__navigation");
        navigation.setAttribute("aria-label", "Illustration gallery");
        var previous = makeButton("manual-figure-viewer__nav-button manual-figure-viewer__previous", "Previous", "Previous larger illustration");
        var counter = element("span", "manual-figure-viewer__counter", "");
        counter.setAttribute("aria-live", "polite");
        counter.setAttribute("aria-atomic", "true");
        var next = makeButton("manual-figure-viewer__nav-button manual-figure-viewer__next", "Next", "Next larger illustration");
        previous.hidden = gallery.length < 2;
        next.hidden = gallery.length < 2;
        counter.hidden = gallery.length < 2;

        var close = makeButton("manual-figure-viewer__close", "Close", "Close larger illustration");
        navigation.appendChild(previous);
        navigation.appendChild(counter);
        navigation.appendChild(next);
        navigation.appendChild(close);
        header.appendChild(headingGroup);
        header.appendChild(navigation);

        var viewport = element("div", "manual-figure-viewer__viewport");
        viewport.setAttribute("role", "region");
        viewport.setAttribute("aria-label", "Full-size illustration; scroll or zoom to inspect it");
        viewport.setAttribute("tabindex", "0");
        var canvas = element("div", "manual-figure-viewer__canvas");
        var frameCanvas = element("div", "manual-figure-viewer__frame-canvas");
        canvas.appendChild(frameCanvas);
        viewport.appendChild(canvas);

        var status = element("p", "manual-figure-viewer__status", "Opening larger illustration…");
        status.setAttribute("role", "status");
        status.setAttribute("aria-live", "polite");
        var failure = element("p", "manual-figure-viewer__failure", "The larger view could not load. The description and caption remain on the page.");
        failure.setAttribute("role", "alert");
        failure.hidden = true;

        var footer = element("footer", "manual-figure-viewer__footer");
        var help = element("p", "manual-figure-viewer__help", "At 100%, the scene uses its full design size. Scroll or zoom to inspect it.");
        help.id = "manual-figure-viewer-help";
        var zoom = element("div", "manual-figure-viewer__zoom");
        zoom.setAttribute("aria-label", "Illustration size");
        var zoomOut = makeButton("manual-figure-viewer__zoom-button", "−", "Zoom out");
        var zoomValue = element("output", "manual-figure-viewer__zoom-value", "100%");
        zoomValue.setAttribute("aria-live", "polite");
        zoomValue.setAttribute("aria-atomic", "true");
        var zoomIn = makeButton("manual-figure-viewer__zoom-button", "+", "Zoom in");
        var fit = makeButton("manual-figure-viewer__fit", "Fit", "Fit illustration to the window");
        var actualSize = makeButton("manual-figure-viewer__fit", "100%", "Show illustration at actual size");
        zoom.appendChild(zoomOut);
        zoom.appendChild(zoomValue);
        zoom.appendChild(zoomIn);
        zoom.appendChild(fit);
        zoom.appendChild(actualSize);
        footer.appendChild(help);
        footer.appendChild(zoom);

        layout.appendChild(header);
        layout.appendChild(status);
        layout.appendChild(failure);
        layout.appendChild(viewport);
        layout.appendChild(footer);
        dialog.appendChild(layout);
        document.body.appendChild(dialog);

        var viewerFrame = null;
        var viewerTimer = null;
        var currentIndex = 0;
        var currentWidth = 1;
        var currentHeight = 1;
        var currentScale = 1;
        var returnFocus = null;

        function clearViewerTimer() {
            if (viewerTimer !== null) window.clearTimeout(viewerTimer);
            viewerTimer = null;
        }

        function removeViewerFrame() {
            clearViewerTimer();
            var oldFrame = viewerFrame;
            viewerFrame = null;
            if (oldFrame && oldFrame.parentNode) oldFrame.parentNode.removeChild(oldFrame);
        }

        function updateScale(value) {
            currentScale = Math.max(0.25, Math.min(2, Math.round(value * 100) / 100));
            canvas.style.width = Math.round(currentWidth * currentScale) + "px";
            canvas.style.height = Math.round(currentHeight * currentScale) + "px";
            if (viewerFrame) viewerFrame.style.transform = "scale(" + currentScale + ")";
            zoomValue.textContent = Math.round(currentScale * 100) + "%";
            zoomOut.disabled = currentScale <= 0.25;
            zoomIn.disabled = currentScale >= 2;
        }

        function viewerFailed(message) {
            if (!viewerFrame) return;
            clearViewerTimer();
            viewerFrame.style.visibility = "hidden";
            status.hidden = true;
            failure.textContent = message || "The larger view could not load. The description and caption remain on the page.";
            failure.hidden = false;
        }

        function viewerReady() {
            if (!viewerFrame) return;
            clearViewerTimer();
            viewerFrame.dataset.sceneReady = "true";
            viewerFrame.style.visibility = "visible";
            status.hidden = true;
            failure.hidden = true;
        }

        function setGalleryItem(index) {
            currentIndex = index;
            removeViewerFrame();
            var item = gallery[currentIndex];
            var sourceFrame = item.frame;
            var rawTitle = sourceFrame.getAttribute("title") || "Larger editor illustration";
            heading.textContent = rawTitle
                .replace(/^Code-rendered editor illustration:\s*/, "")
                .replace(/\s+— still illustration$/, "");
            var caption = item.figure.querySelector("figcaption");
            description.textContent = caption ? caption.textContent.trim() : "";
            counter.textContent = (currentIndex + 1) + " of " + gallery.length;
            previous.disabled = currentIndex === 0;
            next.disabled = currentIndex === gallery.length - 1;

            currentWidth = parseInt(sourceFrame.getAttribute("width"), 10) || 1360;
            currentHeight = parseInt(sourceFrame.getAttribute("height"), 10) || 820;
            currentScale = 1;
            status.textContent = "Opening larger illustration…";
            status.hidden = false;
            failure.hidden = true;

            viewerFrame = document.createElement("iframe");
            viewerFrame.className = "manual-figure-viewer__frame";
            viewerFrame.setAttribute("title", rawTitle);
            viewerFrame.setAttribute("aria-describedby", description.id + " " + help.id);
            viewerFrame.setAttribute("tabindex", "-1");
            viewerFrame.setAttribute("loading", "eager");
            viewerFrame.setAttribute("sandbox", sourceFrame.getAttribute("sandbox") || (localFile ? "allow-scripts allow-same-origin" : "allow-scripts"));
            viewerFrame.setAttribute("referrerpolicy", "no-referrer");
            viewerFrame.setAttribute("width", String(currentWidth));
            viewerFrame.setAttribute("height", String(currentHeight));
            viewerFrame.setAttribute("data-manual-figure-scene", sourceFrame.getAttribute("data-manual-figure-scene"));
            viewerFrame.style.width = currentWidth + "px";
            viewerFrame.style.height = currentHeight + "px";
            viewerFrame.style.visibility = "hidden";
            viewerFrame.style.transformOrigin = "top left";
            var thisFrame = viewerFrame;
            viewerFrame.addEventListener("load", function () {
                if (viewerFrame !== thisFrame || thisFrame.dataset.sceneReady === "true") return;
                clearViewerTimer();
                viewerTimer = window.setTimeout(function () {
                    if (viewerFrame === thisFrame) viewerFailed("The larger view did not report that its illustration started.");
                }, 20000);
            });
            viewerFrame.addEventListener("error", function () {
                if (viewerFrame === thisFrame) viewerFailed("The larger view could not load. The description and caption remain on the page.");
            });
            frameCanvas.appendChild(viewerFrame);
            updateScale(1);
            viewerFrame.src = sourceFrame.getAttribute("src") || sourceFrame.getAttribute("data-renderer-src");
        }

        function openViewer(index, opener) {
            returnFocus = opener && opener.classList.contains("manual-figure__expand")
                ? opener
                : gallery[index].figure.querySelector(".manual-figure__expand");
            if (!dialog.open) dialog.showModal();
            setGalleryItem(index);
            close.focus();
        }

        function closeViewer() {
            if (!dialog.open) return;
            dialog.close();
            removeViewerFrame();
            if (returnFocus && document.documentElement.contains(returnFocus)) {
                try {
                    returnFocus.focus({ preventScroll: true });
                } catch (error) {
                    returnFocus.focus();
                }
            }
            returnFocus = null;
        }

        gallery.forEach(function (entry, index) {
            entry.figure.classList.add("manual-figure--viewer-enabled");
            Array.prototype.slice.call(entry.figure.querySelectorAll("[data-manual-figure-open]")).forEach(function (trigger) {
                trigger.hidden = false;
                trigger.addEventListener("click", function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    openViewer(index, trigger);
                });
            });
        });

        previous.addEventListener("click", function () {
            if (currentIndex > 0) setGalleryItem(currentIndex - 1);
        });
        next.addEventListener("click", function () {
            if (currentIndex < gallery.length - 1) setGalleryItem(currentIndex + 1);
        });
        zoomOut.addEventListener("click", function () { updateScale(currentScale - 0.25); });
        zoomIn.addEventListener("click", function () { updateScale(currentScale + 0.25); });
        actualSize.addEventListener("click", function () { updateScale(1); });
        fit.addEventListener("click", function () {
            var availableWidth = Math.max(1, viewport.clientWidth - 32);
            var availableHeight = Math.max(1, viewport.clientHeight - 32);
            updateScale(Math.min(1, availableWidth / currentWidth, availableHeight / currentHeight));
        });
        close.addEventListener("click", closeViewer);
        dialog.addEventListener("cancel", function (event) {
            event.preventDefault();
            closeViewer();
        });
        dialog.addEventListener("click", function (event) {
            if (event.target === dialog) closeViewer();
        });
        window.addEventListener("message", function (event) {
            if (!viewerFrame || event.source !== viewerFrame.contentWindow || !event.data || event.data.type !== "manual-figure-ready") return;
            if (event.data.scene !== viewerFrame.getAttribute("data-manual-figure-scene")) {
                viewerFailed("The larger view returned a different illustration.");
            } else if (event.data.status === "error") {
                viewerFailed("The larger view could not render. The description and caption remain on the page.");
            } else if (event.data.status === "ready") {
                viewerReady();
            }
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
