/**
 * The WYSIWYG website builder: sites on the left, pages in the middle, and an
 * edit/preview workspace on the right. Pages with search listing turned off are
 * the dirhunter hiding places — the builder says so plainly instead of making
 * authors learn `seo:false`.
 */
import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/Icon";
import { FieldShell, TextInput, Toggle } from "@/editor/inspector/primitives";
import { createPage, createWebsite } from "@/schema/project";
import { useEditor } from "@/store/editor";
import { PAGE_TEMPLATES, SITE_TEMPLATES } from "@/templates/pages";
import { isFullDocument, wrapFragment } from "./pageDoc";
import { CodePageEditor, VisualPageEditor } from "./pageEditor";

export function WebsiteBuilderDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const websites = useEditor((s) => s.project.websites);
    const addWebsite = useEditor((s) => s.addWebsite);
    const removeWebsite = useEditor((s) => s.removeWebsite);
    const updateWebsite = useEditor((s) => s.updateWebsite);
    const addPage = useEditor((s) => s.addPage);
    const updatePage = useEditor((s) => s.updatePage);
    const removePage = useEditor((s) => s.removePage);

    const [siteId, setSiteId] = useState<string | null>(null);
    const [pageId, setPageId] = useState<string | null>(null);
    const [mode, setMode] = useState<"visual" | "code" | "preview">("visual");
    const [picker, setPicker] = useState(false);
    /** Bumped when content changes outside the visual editor, so it remounts fresh. */
    const [outsideRev, setOutsideRev] = useState(0);
    const htmlFileRef = useRef<HTMLInputElement>(null);
    const toast = useEditor((s) => s.toast);

    const site = websites.find((w) => w.id === siteId) ?? websites[0];
    const pages = [...(site?.pages ?? [])].sort((a, b) => a.path.localeCompare(b.path));
    const page = site?.pages.find((p) => p.id === pageId) ?? pages[0];

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-void/70 backdrop-blur-[2px]" />
                <Dialog.Content
                    className={cn(
                        "fixed top-1/2 left-1/2 z-50 flex h-[82vh] w-[min(1120px,94vw)] -translate-x-1/2 -translate-y-1/2",
                        "flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-panel",
                    )}
                >
                    <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-3">
                        <div>
                            <Dialog.Title className="text-[14px] font-semibold text-ink">
                                Website builder
                            </Dialog.Title>
                            <Dialog.Description className="mt-0.5 text-[11.5px] text-ink-4">
                                Sites your mod puts on the in-game internet. Unlisted pages stay
                                reachable by URL — that is where dirhunter finds clues.
                            </Dialog.Description>
                        </div>
                        <Dialog.Close asChild>
                            <button type="button" className="btn-icon" aria-label="Close">
                                <Icon name="x" size={14} />
                            </button>
                        </Dialog.Close>
                    </div>

                    {!site ? (
                        <div className="min-h-0 flex-1 overflow-y-auto p-6">
                            <div className="mx-auto max-w-xl">
                                <div className="flex flex-col items-center gap-1.5 py-6 text-center">
                                    <Icon name="globe" size={26} className="text-ink-4" />
                                    <p className="text-[13px] font-medium text-ink-2">No websites yet.</p>
                                    <p className="text-[11.5px] text-ink-4">
                                        Start blank, or from a ready-made site.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="btn-default w-full justify-center"
                                    onClick={() => {
                                        const w = createWebsite();
                                        addWebsite(w);
                                        setSiteId(w.id);
                                    }}
                                >
                                    <Icon name="plus" size={12} />
                                    Blank website
                                </button>
                                <p className="mt-5 mb-1.5 text-[10px] font-semibold tracking-wider text-ink-3 uppercase">
                                    Site templates
                                </p>
                                <div className="grid gap-2">
                                    {SITE_TEMPLATES.map((t) => {
                                        const made = t.make();
                                        return (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => {
                                                    const w = createWebsite({
                                                        host: made.host,
                                                        name: made.name,
                                                        pages: made.pages.map((p) => createPage(p)),
                                                    });
                                                    addWebsite(w);
                                                    setSiteId(w.id);
                                                    setPageId(null);
                                                }}
                                                className="rounded-lg border border-line bg-surface-2/60 p-3 text-left transition-colors hover:border-accent/50"
                                            >
                                                <span className="block text-[12.5px] font-semibold text-ink">
                                                    {t.label}
                                                </span>
                                                <span className="mt-0.5 block text-[11px] leading-snug text-ink-4">
                                                    {t.blurb}
                                                </span>
                                                <span className="mt-1.5 block font-mono text-[10px] text-ink-4">
                                                    {made.host} · {made.pages.length} pages ·{" "}
                                                    {made.pages.filter((p) => !p.seo).length} hidden
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid min-h-0 flex-1 grid-cols-[190px_230px_1fr]">
                            {/* sites */}
                            <div className="flex min-h-0 flex-col border-r border-line">
                                <div className="flex items-center justify-between px-3 py-2">
                                    <span className="text-[10px] font-semibold tracking-wider text-ink-3 uppercase">
                                        Sites
                                    </span>
                                    <button
                                        type="button"
                                        className="btn-icon"
                                        title="New website"
                                        aria-label="New website"
                                        onClick={() => {
                                            const w = createWebsite({ host: `site-${websites.length + 1}.net` });
                                            addWebsite(w);
                                            setSiteId(w.id);
                                        }}
                                    >
                                        <Icon name="plus" size={13} />
                                    </button>
                                </div>
                                <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
                                    {websites.map((w) => (
                                        <button
                                            key={w.id}
                                            type="button"
                                            onClick={() => {
                                                setSiteId(w.id);
                                                setPageId(null);
                                            }}
                                            className={cn(
                                                "mb-1 block w-full rounded-md border px-2.5 py-1.5 text-left",
                                                w.id === site.id
                                                    ? "border-accent/50 bg-accent-soft text-ink"
                                                    : "border-transparent text-ink-3 hover:bg-surface-2",
                                            )}
                                        >
                                            <span className="block truncate font-mono text-[11px]">{w.host}</span>
                                            <span className="block truncate text-[10px] text-ink-4">
                                                {w.pages.length} page{w.pages.length === 1 ? "" : "s"}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                                <div className="border-t border-line p-2">
                                    <button
                                        type="button"
                                        className="btn-default w-full justify-center text-danger"
                                        onClick={() => {
                                            removeWebsite(site.id);
                                            setSiteId(null);
                                            setPageId(null);
                                        }}
                                    >
                                        <Icon name="trash" size={12} />
                                        Delete site
                                    </button>
                                </div>
                            </div>

                            {/* pages */}
                            <div className="flex min-h-0 flex-col border-r border-line">
                                <div className="grid gap-2 border-b border-line p-2.5">
                                    <FieldShell label="Host">
                                        <TextInput
                                            ariaLabel="Site host"
                                            value={site.host}
                                            onChange={(host) => updateWebsite(site.id, { host })}
                                            mono
                                        />
                                    </FieldShell>
                                    <FieldShell label="Site name">
                                        <TextInput
                                            ariaLabel="Site name"
                                            value={site.name}
                                            onChange={(name) => updateWebsite(site.id, { name })}
                                            placeholder="For your own reference"
                                        />
                                    </FieldShell>
                                </div>
                                <div className="flex items-center justify-between gap-2 px-3 py-2">
                                    <span className="text-[10px] font-semibold tracking-wider text-ink-3 uppercase">
                                        Pages
                                    </span>
                                    <button
                                        type="button"
                                        className="btn-default"
                                        onClick={() => setPicker((p) => !p)}
                                    >
                                        <Icon name="plus" size={11} />
                                        New page
                                    </button>
                                </div>
                                {picker && (
                                    <div className="border-b border-line bg-surface-2/60 p-2">
                                        <p className="mb-1 text-[10px] font-semibold tracking-wider text-ink-3 uppercase">
                                            Page templates
                                        </p>
                                        <div className="grid gap-1">
                                            <button
                                                type="button"
                                                className="rounded-md border border-line px-2 py-1 text-left text-[11px] text-ink-2 hover:bg-surface-3"
                                                onClick={() => {
                                                    const p = createPage({ path: `/page-${site.pages.length + 1}`, title: "New page" });
                                                    addPage(site.id, p);
                                                    setPageId(p.id);
                                                    setPicker(false);
                                                    setMode("visual");
                                                }}
                                            >
                                                Blank page
                                            </button>
                                            {PAGE_TEMPLATES.map((t) => (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    className="rounded-md border border-line px-2 py-1 text-left hover:bg-surface-3"
                                                    onClick={() => {
                                                        const made = t.make();
                                                        const p = createPage({ ...made, template: t.id });
                                                        addPage(site.id, p);
                                                        setPageId(p.id);
                                                        setPicker(false);
                                                        setMode("visual");
                                                    }}
                                                >
                                                    <span className="block text-[11px] text-ink-2">{t.label}</span>
                                                    <span className="block text-[10px] leading-snug text-ink-4">
                                                        {t.blurb}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
                                    {pages.map((p) => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => setPageId(p.id)}
                                            className={cn(
                                                "mb-1 block w-full rounded-md border px-2.5 py-1.5 text-left",
                                                page && p.id === page.id
                                                    ? "border-accent/50 bg-accent-soft text-ink"
                                                    : "border-transparent text-ink-3 hover:bg-surface-2",
                                            )}
                                        >
                                            <span className="flex items-center gap-1.5">
                                                {!p.seo && <Icon name="lock" size={10} className="shrink-0 text-warn" />}
                                                <span className="truncate font-mono text-[11px]">{p.path}</span>
                                            </span>
                                            <span className="block truncate text-[10px] text-ink-4">
                                                {p.title || "untitled"}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* workspace */}
                            <div className="flex min-h-0 flex-col">
                                {page ? (
                                    <>
                                        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
                                            <div className="flex rounded-md border border-line p-0.5">
                                                {(["visual", "code", "preview"] as const).map((m) => (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        onClick={() => setMode(m)}
                                                        className={cn(
                                                            "rounded px-2.5 py-1 text-[11px] capitalize",
                                                            mode === m ? "bg-accent-soft text-accent" : "text-ink-4 hover:text-ink",
                                                        )}
                                                    >
                                                        {m}
                                                    </button>
                                                ))}
                                            </div>
                                            <button
                                                type="button"
                                                className="btn-default"
                                                title="Replace this page with a finished .html file from disk"
                                                onClick={() => htmlFileRef.current?.click()}
                                            >
                                                <Icon name="upload" size={11} />
                                                Load HTML
                                            </button>
                                            <input
                                                ref={htmlFileRef}
                                                type="file"
                                                accept=".html,.htm,text/html"
                                                aria-label="Load HTML file"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    e.target.value = "";
                                                    if (!file) return;
                                                    const reader = new FileReader();
                                                    reader.onload = () => {
                                                        const text = String(reader.result ?? "");
                                                        updatePage(site.id, page.id, {
                                                            content: isFullDocument(text)
                                                                ? text
                                                                : wrapFragment(text, page.title || "Page"),
                                                        });
                                                        setOutsideRev((r) => r + 1);
                                                        toast(`Loaded ${file.name}.`, "ok");
                                                    };
                                                    reader.readAsText(file);
                                                }}
                                            />
                                            <span className="ml-auto flex items-center gap-1.5 font-mono text-[10.5px] text-ink-4">
                                                {!page.seo && <Icon name="lock" size={10} className="text-warn" />}
                                                {site.host}
                                                {page.path}
                                            </span>
                                            <button
                                                type="button"
                                                className="btn-icon text-ink-4 hover:text-danger"
                                                title="Delete page"
                                                aria-label="Delete page"
                                                onClick={() => {
                                                    removePage(site.id, page.id);
                                                    setPageId(null);
                                                }}
                                            >
                                                <Icon name="trash" size={13} />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 border-b border-line px-3 py-2">
                                            <FieldShell
                                                label="Path"
                                                hint="Where the page lives on the host. Sub-directories are fine — deep paths make good hiding spots."
                                            >
                                                <TextInput
                                                    ariaLabel="Page path"
                                                    value={page.path}
                                                    onChange={(path) => updatePage(site.id, page.id, { path })}
                                                    mono
                                                    placeholder="/about/team"
                                                />
                                            </FieldShell>
                                            <FieldShell label="Browser tab title">
                                                <TextInput
                                                    ariaLabel="Page title"
                                                    value={page.title}
                                                    onChange={(title) => updatePage(site.id, page.id, { title })}
                                                />
                                            </FieldShell>
                                        </div>
                                        <Toggle
                                            label="Listed in the in-game search"
                                            hint="Turn off to hide this page from search results while keeping it reachable by URL. Hidden pages are what dirhunter brute-forces — perfect for clues."
                                            checked={page.seo}
                                            onChange={(seo) => updatePage(site.id, page.id, { seo })}
                                        />

                                        <div className="min-h-0 flex-1 overflow-y-auto p-3">
                                            {mode === "visual" && (
                                                <VisualPageEditor
                                                    key={`${page.id}:${outsideRev}`}
                                                    doc={page.content}
                                                    onChange={(content) => updatePage(site.id, page.id, { content })}
                                                    ariaLabel={`Visual editor for ${page.path}`}
                                                />
                                            )}
                                            {mode === "code" && (
                                                <CodePageEditor
                                                    doc={page.content}
                                                    onChange={(content) => {
                                                        updatePage(site.id, page.id, { content });
                                                        setOutsideRev((r) => r + 1);
                                                    }}
                                                    ariaLabel={`HTML code for ${page.path}`}
                                                />
                                            )}
                                            {mode === "preview" && (
                                                <BrowserPreview
                                                    host={site.host}
                                                    path={page.path}
                                                    seo={page.seo}
                                                    content={page.content}
                                                />
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-ink-4">
                                        <Icon name="file" size={20} />
                                        <p className="text-[12px]">Add a page to start building.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

/** The player's-eye view: a little in-game browser window. */
function BrowserPreview({
    host,
    path,
    seo,
    content,
}: {
    host: string;
    path: string;
    seo: boolean;
    content: string;
}) {
    return (
        <div className="overflow-hidden rounded-lg border border-line">
            <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-3 py-1.5">
                <span className="flex gap-1" aria-hidden>
                    <i className="size-2 rounded-full bg-danger/70" />
                    <i className="size-2 rounded-full bg-warn/70" />
                    <i className="size-2 rounded-full bg-ok/70" />
                </span>
                <span className="flex-1 truncate rounded-md border border-line bg-surface px-2.5 py-1 font-mono text-[10.5px] text-ink-3">
                    http://{host}
                    {path}
                </span>
            </div>
            {!seo && (
                <p className="flex items-center gap-1.5 border-b border-warn/30 bg-warn/10 px-3 py-1.5 text-[10.5px] text-warn">
                    <Icon name="lock" size={11} />
                    Not in search results — only a direct URL (or dirhunter) leads here.
                </p>
            )}
            <iframe
                title="Page preview"
                srcDoc={content || "<p><em>Empty page.</em></p>"}
                sandbox="allow-scripts"
                className="block h-[52vh] w-full border-0 bg-white"
            />
        </div>
    );
}
