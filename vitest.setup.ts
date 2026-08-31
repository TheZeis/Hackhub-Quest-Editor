import "@testing-library/jest-dom/vitest";

// React Flow measures nodes via ResizeObserver, which jsdom does not implement.
class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
}

globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// React Flow reads these when laying out the viewport.
if (!("DOMMatrixReadOnly" in globalThis)) {
    class DOMMatrixReadOnlyStub {
        m22 = 1;
        constructor(_?: string) {}
    }
    Object.defineProperty(globalThis, "DOMMatrixReadOnly", {
        value: DOMMatrixReadOnlyStub,
        configurable: true,
    });
}

if (typeof window !== "undefined") {
    window.matchMedia ??= ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
}
