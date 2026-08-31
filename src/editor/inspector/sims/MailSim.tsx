/**
 * The mail preview: the player's inbox reading view, rendered above the usual
 * fields (which stay the editing surface — they are already mail-shaped).
 */
import type { NodeOfType } from "@/schema/nodes";
import { SimFrame } from "./chrome";

export function MailSim({ node }: { node: NodeOfType<"comms.mail"> }) {
    const { from, to, subject, content, attachment } = node.data;
    return (
        <SimFrame app="Mail" caption={to ? `to ${to}` : "to the player"} className="bg-[#10131a]">
            <div className="p-3">
                <p className="text-[13px] font-semibold text-ink">{subject || "(no subject)"}</p>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 border-b border-line/70 pb-2 text-[10.5px] text-ink-4">
                    <span>
                        From <span className="text-ink-2">{from || "unknown"}</span>
                    </span>
                    <span>
                        To <span className="text-ink-2">{to || "you"}</span>
                    </span>
                    <span>now</span>
                </div>
                <div
                    className="webpage-mail mt-2 max-h-48 overflow-y-auto text-[11.5px] leading-relaxed text-ink-2"
                    dangerouslySetInnerHTML={{ __html: content || "<p>…</p>" }}
                />
                {attachment && attachment.name && (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-2 px-2 py-1 font-mono text-[10.5px] text-ink-3">
                        📎 {attachment.name}.{attachment.extension}
                    </p>
                )}
            </div>
        </SimFrame>
    );
}
