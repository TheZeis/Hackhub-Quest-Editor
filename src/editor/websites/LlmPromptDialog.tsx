/**
 * The "LLM website prompt" popout: the author describes the site they want,
 * and we wrap that idea in a prompt that teaches an LLM (ChatGPT, Claude, …)
 * every HackHub quirk — self-contained files, no internet, one file per page,
 * real paths, hidden pages for dirhunter. The author copy-pastes the result,
 * gets files back, and loads them with Load HTML.
 */
import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useEditor } from "@/store/editor";

export function buildLlmPrompt(idea: string): string {
    return `You are building a website that will be placed inside HackHub, a hacking game. Players will browse, investigate and hack it in-game. Follow every rule below exactly.

HOW TO DELIVER
- Build the site as separate pages: write ONE complete .html file per page, and tell me which path each file belongs to (for example: index.html for "/", news.html for "/news", staff.html for "/staff").
- Aim for 3–6 pages total.

STRICT TECHNICAL RULES (the game's browser has NO internet)
- Each file must be a complete document: <!DOCTYPE html>, <html>, a <head> with <title> and one <style> block, then <body>.
- No external resources of any kind: no CDN links, no Google Fonts, no <link>, no <script src="...">, no external images. Use inline <style>, system fonts (Helvetica, Arial, Georgia, 'Courier New'), inline <svg> for logos and graphics, and CSS gradients instead of photos.
- Copy the same <style>, header/navigation and footer into every page so the whole site looks consistent.
- Pages must link to each other with plain paths like href="/news" — never file names, never full https:// URLs, and never "#" anchors for main navigation. Every link in the navigation must be one of the pages you deliver.
- Small plain <script> blocks inside a page are allowed (buttons, fake forms, little effects).

CONTENT RULES
- Write realistic, complete content — real-sounding articles, staff, products. No lorem ipsum, no placeholder text.
- The site should feel like it already existed before the player found it.

SECRETS (this is a hacking game)
- Hide at least one secret as an HTML comment (<!-- like this -->) somewhere meaningful — a note a careless employee left behind.
- Include ONE extra page that is NOT linked from the navigation — an admin panel, internal memo, or staff area — and tell me its path. Players find it with hacking tools, so it must exist but be undiscoverable by browsing.
- If the site has a login form, make it look real; it never needs to actually log anyone in.
- Sprinkle plausible clue material: staff names, employee IDs, dates, ticket numbers — things a player could turn into a password.

MY WEBSITE IDEA
${idea.trim() || "(describe your website here — what it is, who runs it, what it sells or announces, and what secret it should hide)"}
`;
}

export function LlmPromptDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
    const [idea, setIdea] = useState("");
    const promptRef = useRef<HTMLTextAreaElement>(null);
    const toast = useEditor((s) => s.toast);
    const prompt = buildLlmPrompt(idea);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(prompt);
            toast("Prompt copied — paste it into ChatGPT, Claude or any LLM.", "ok");
        } catch {
            promptRef.current?.select();
            toast("Press Ctrl+C (Cmd+C) to copy the selected prompt.", "info");
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-[60] bg-void/70 backdrop-blur-[2px]" />
                <Dialog.Content className="fixed top-1/2 left-1/2 z-[70] flex h-[80vh] w-[min(720px,94vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-panel">
                    <div className="border-b border-line px-4 py-3">
                        <Dialog.Title className="text-[13.5px] font-semibold text-ink">
                            Ask an AI to build your website
                        </Dialog.Title>
                        <Dialog.Description className="mt-1 text-[11.5px] leading-relaxed text-ink-3">
                            Describe the site you want below. We turn it into a prompt that teaches the AI every
                            quirk of HackHub's in-game browser — then you paste that prompt into ChatGPT, Claude or
                            any other assistant.
                        </Dialog.Description>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto p-4">
                        <label className="mb-1 block text-[11px] font-semibold text-ink-2">
                            1 · Describe the website you want
                        </label>
                        <textarea
                            value={idea}
                            onChange={(e) => setIdea(e.target.value)}
                            aria-label="Website idea"
                            placeholder="e.g. A cosy harbour-town bakery called Butter & Bramble. It should look warm and handwritten, with a menu page and an about page. Hidden secret: the owner leaves the back-room door code in a comment for the delivery driver, and there's an unlisted staff rota page."
                            className="h-20 w-full resize-y rounded-lg border border-line bg-surface-2 p-2.5 text-[12px] leading-relaxed text-ink placeholder:text-ink-4 focus:border-accent focus:outline-none"
                        />
                        <label className="mt-3 mb-1 block text-[11px] font-semibold text-ink-2">
                            2 · Copy this prompt into your AI assistant
                        </label>
                        <textarea
                            ref={promptRef}
                            value={prompt}
                            readOnly
                            aria-label="Generated prompt"
                            className="h-[38vh] w-full resize-none rounded-lg border border-line bg-[#0b0d12] p-2.5 font-mono text-[11px] leading-relaxed text-ink-2 focus:outline-none"
                        />
                        <p className="mt-3 text-[11px] leading-relaxed text-ink-4">
                            3 · Ask the AI for <strong className="text-ink-3">one .html file per page</strong>. Back
                            here, add a page for each file, set its path to the one the AI told you, and click{" "}
                            <strong className="text-ink-3">Load HTML</strong> to bring it in. The scan under each
                            page then tells you if anything is missing.
                        </p>
                    </div>
                    <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
                        <Dialog.Close className="btn-default">Close</Dialog.Close>
                        <button type="button" className="btn-primary" onClick={copy}>
                            Copy prompt
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
