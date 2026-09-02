/**
 * The travelling dots on every wire.
 *
 * History matters here: this was a CSS keyframe, then an SVG SMIL animation,
 * and both were reported as "the dots don't move". Neither could be proven
 * wrong from inside a test, because jsdom runs no animations at all — and both
 * can be switched off by things outside the editor (stylesheet order, and the
 * operating system's "reduce animation" setting, which Windows turns on by
 * default on some machines).
 *
 * So the motion is now driven by the editor itself: ONE requestAnimationFrame
 * loop writes a single custom property, `--qe-dash-offset`, on the document
 * root, and every wire's dot layer reads it. One loop for the whole canvas, no
 * React re-renders, no dependency on OS motion settings — and an explicit
 * on/off switch the author controls, remembered between sessions.
 */

/** Distance between two travelling dots, in pixels. */
export const DOT_GAP = 14;
/** Seconds for a dot to travel one gap: 10px/s — a calm drift, not a stampede. */
export const DOT_PERIOD_S = 1.4;
/** The custom property every wire's dot layer reads. */
export const DASH_VAR = "--qe-dash-offset";

const STORAGE_KEY = "hackhub-quest-editor:wire-motion:v1";

type Listener = () => void;

const listeners = new Set<Listener>();
let frame = 0;
let enabled = readStored();

function readStored(): boolean {
    try {
        return localStorage.getItem(STORAGE_KEY) !== "off";
    } catch {
        // Private mode, or no storage at all: animate.
        return true;
    }
}

function root(): HTMLElement | null {
    return typeof document === "undefined" ? null : document.documentElement;
}

/** Write the current phase of the dash cycle. Exported for tests. */
export function paintDashOffset(nowMs: number): void {
    const el = root();
    if (!el) return;
    const phase = ((nowMs / 1000) % DOT_PERIOD_S) / DOT_PERIOD_S;
    // Negative: the dots travel from the source towards the target.
    el.style.setProperty(DASH_VAR, `${-(phase * DOT_GAP).toFixed(2)}px`);
}

function tick(now: number) {
    paintDashOffset(now);
    frame = requestAnimationFrame(tick);
}

function start() {
    if (frame || typeof requestAnimationFrame !== "function") return;
    frame = requestAnimationFrame(tick);
}

function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    root()?.style.setProperty(DASH_VAR, "0px");
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
