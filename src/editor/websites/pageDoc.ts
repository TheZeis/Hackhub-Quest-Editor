/**
 * Page documents. A page stores a *full* HTML document — its own styles and
 * scripts included — because that is exactly what users bring (LLM-written
 * self-contained sites) and exactly what the Step 4 compiler writes to disk.
 * Fragments (no <body>) are tolerated and wrapped in a clean base document.
 */

/** Base stylesheet for wrapped fragments and blank pages: readable, neutral. */
export const BASE_CSS = `
*{box-sizing:border-box;margin:0}
body{font:15px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#232a36;background:#f4f6f9;padding:28px clamp(16px,5vw,56px)}
h1{font-size:30px;line-height:1.2;margin:0 0 12px;font-weight:750}
h2{font-size:19px;margin:22px 0 8px}
p{margin:0 0 10px;max-width:70ch}
ul,ol{margin:0 0 12px;padding-left:22px}
li{margin:3px 0}
a{color:#0e7490}
blockquote{margin:0 0 12px;padding:8px 14px;border-left:3px solid #c3c9d4;background:#e9ecf1;color:#4a5162}
img{max-width:100%;border-radius:6px}
header.site{background:#0d2b45;color:#fff;padding:14px clamp(16px,5vw,56px);font-weight:700;letter-spacing:.3px;margin:-28px calc(-1*clamp(16px,5vw,56px)) 24px}
`;

const HEAD_OPEN = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page</title>
<style>${BASE_CSS}</style>
</head>`;

/** A complete, clean document around a bare fragment. */
export function wrapFragment(body: string, title = "Page"): string {
    return `${HEAD_OPEN.replace("<title>Page</title>", `<title>${title}</title>`)}
<body>
${body}
</body>
</html>`;
}

export const isFullDocument = (html: string) => /<body[\s>]/i.test(html);

export interface SplitDoc {
    /** Everything through and including the opening <body> tag. */
    head: string;
    /** The inner body HTML. */
    body: string;
    /** </body> and anything after it. */
    tail: string;
    isFull: boolean;
}

/** Split a document so the visual editor can rewrite the body without touching the head. */
export function splitDocument(html: string): SplitDoc {
    const open = html.match(/<body[^>]*>/i);
    const close = html.match(/<\/body>/i);
    if (open && close && close.index! > open.index!) {
        return {
            head: html.slice(0, open.index! + open[0].length),
            body: html.slice(open.index! + open[0].length, close.index!),
            tail: html.slice(close.index!),
            isFull: true,
        };
    }
    return { head: `${HEAD_OPEN}\n<body>`, body: html, tail: "</body>\n</html>", isFull: false };
}

export const joinDocument = (parts: SplitDoc, body: string) => parts.head + body + parts.tail;
