/**
 * The travelling dots on every wire.
 *
 * History matters here, because this is the third attempt and the second one
 * caused a real problem.
 *
 * It was a CSS keyframe, then an SVG SMIL animation, and both were reported as
 * "the dots don't move". Neither could be disproven from a test, because jsdom
 * runs no animations at all, and both can be switched off from outside the
 * editor — stylesheet order, or the operating system's "reduce animation"
 * setting, which Windows turns on by default on some machines.
 *
 * So round 38 drove the motion from JS instead: one requestAnimationFrame loop
 * writing a custom property, `--qe-dash-offset`, onto the document root, with
 * every wire's dot layer reading it. The dots moved, reliably, everywhere.
 *
 * It also pinned the GPU. A custom property set on the root element
 * invalidates every element that could inherit it — which is the whole
 * document — so each of those 60 writes per second forced a full style
 * recalculation and display-list rebuild across the entire editor. A profile
 * of an IDLE editor (nothing being touched, Ledger template open) showed the
 * tab spending 40.8% of its time in `PresShell::DoFlushPendingNotifications`,
 * with `paintDashOffset` and `tick` the only JS on the stack. The author's
 * graphics card audibly spun up, and lag grew with the size of the graph,
 * because every extra wire added more to repaint. It stopped the instant the
 * tab lost focus, since browsers throttle rAF in background tabs — which is
 * exactly why it looked like a leak and was not one.
 *
 * The JS was never the cost: 85 samples out of 8638. The invalidation was.
 *
 * So the dots are now animated by the browser's own animation engine, through
 * the Web Animations API, on ONE hidden element per canvas. Every wire
 * references that animation's output through a single custom property, but the
 * property is written by the animation engine on a scoped element rather than
 * by us on the root, so it never triggers a document-wide restyle. The
 * animation runs off the main thread where the platform allows it, costs
 * nothing while idle, and — crucially for the two earlier attempts — is driven
 * by an explicit `animate()` call the editor owns, so no stylesheet or OS
 * setting can silently switch it off.
 *
 * `requestAnimationFrame` remains only as a fallback for browsers with no
 * `Element.animate`, and even then it writes to the scoped host element rather
 * than the document root, and at a deliberately low frame rate: the dots drift
 * at 10px/s, so anything above ~15fps is invisible effort.
 */

/** Distance between two travelling dots, in pixels. */
export const DOT_GAP = 14;
/** Seconds for a dot to travel one gap: 10px/s — a calm drift, not a stampede. */
export const DOT_PERIOD_S = 1.4;
/** The custom property every wire's dot layer reads. */
export const DASH_VAR = "--qe-dash-offset";
/**
 * Fallback repaint rate, in frames per second. The dots move one 14px gap
 * every 1.4s; at 15fps each frame advances them by under a pixel, which is
 * already below what the eye resolves on a drifting dotted line.
 */
export const FALLBACK_FPS = 15;

const STORAGE_KEY = "hackhub-quest-editor:wire-motion:v1";

type Listener = () => void;

const listeners = new Set<Listener>();
let enabled = readStored();

/**
 * The element the dash offset is written to. Everything that reads
 * `--qe-dash-offset` must live inside it, so that invalidating it never
 * reaches the rest of the document.
 */
let host: HTMLElement | null = null;
let animation: Animation | null = null;
let frame = 0;
let fallbackLast = 0;

function readStored(): boolean {
    try {
        return localStorage.getItem(STORAGE_KEY) !== "off";
    } catch {
        // Private mode, or no storage at all: animate.
        return true;
    }
}

/**
 * Point the animation at the element that contains the wires. Called by the
 * canvas as it mounts. Until this is called there is nothing to animate, which
 * is the correct state for a page with no canvas on it.
 */
export function setWireMotionHost(el: HTMLElement | null): void {
    if (host === el) return;
    stop();
    host = el;
    if (enabled) start();
}

/**
 * Write the current phase of the dash cycle. Exported for tests, and used by
 * the no-`Element.animate` fallback.
 */
export function paintDashOffset(nowMs: number, target?: HTMLElement | null): void {
    const el = target ?? host;
    if (!el) return;
    const phase = ((nowMs / 1000) % DOT_PERIOD_S) / DOT_PERIOD_S;
    // Negative: the dots travel from the source towards the target.
    el.style.setProperty(DASH_VAR, `${-(phase * DOT_GAP).toFixed(2)}px`);
}

/**
 * Can this browser animate a custom property itself? Chromium and Firefox
 * both can; where it is missing we fall back to a throttled rAF loop.
 */
function canAnimateProperty(el: HTMLElement): boolean {
    return typeof el.animate === "function";
}

function startWebAnimation(el: HTMLElement): boolean {
    if (!canAnimateProperty(el)) return false;
    try {
        /* Animating the custom property directly. The browser interpolates it
           on the element we name, so the invalidation is scoped to this
           subtree instead of the document root — that scoping is the entire
           point of this file. `linear` keeps the drift even, and the negative
           end value makes the dots travel source -> target. */
        animation = el.animate(
            [{ [DASH_VAR]: "0px" }, { [DASH_VAR]: `${-DOT_GAP}px` }] as unknown as Keyframe[],
            { duration: DOT_PERIOD_S * 1000, iterations: Infinity, easing: "linear" },
        );
        return true;
    } catch {
        /* Some engines accept `animate()` but refuse a custom property. */
        animation = null;
        return false;
    }
}

function fallbackTick(now: number) {
    /* Deliberately throttled. The unthrottled version of this loop is what
       caused the problem described at the top of this file. */
    if (now - fallbackLast >= 1000 / FALLBACK_FPS) {
        fallbackLast = now;
        paintDashOffset(now);
    }
    frame = requestAnimationFrame(fallbackTick);
}

function start() {
    if (!host || animation || frame) return;
    if (startWebAnimation(host)) return;
    if (typeof requestAnimationFrame !== "function") return;
    fallbackLast = 0;
    frame = requestAnimationFrame(fallbackTick);
}

function stop() {
    if (animation) {
        animation.cancel();
        animation = null;
    }
    if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
    }
    host?.style.setProperty(DASH_VAR, "0px");
}

/** Is the wire animation running? */
export function wireMotionEnabled(): boolean {
    return enabled;
}

/** Turn the animation on or off, and remember the choice. */
export function setWireMotion(on: boolean): void {
    enabled = on;
    try {
        localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
    } catch {
        /* not being able to remember it is not a reason to fail */
    }
    if (on) start();
    else stop();
    for (const l of listeners) l();
}

/** Subscribe to on/off changes (useSyncExternalStore contract). */
export function subscribeWireMotion(listener: Listener): () => void {
    listeners.add(listener);
    if (enabled) start();
    return () => {
        listeners.delete(listener);
        if (listeners.size === 0) stop();
    };
}

/** Test seam: is anything currently animating? */
export function wireMotionRunning(): boolean {
    return animation !== null || frame !== 0;
}
