/**
 * Ready-made website pages for the builder. Each one is plain HTML that the
 * WYSIWYG editor can keep editing; the Step 4 compiler writes it to the mod's
 * website folder verbatim.
 */
export interface PageTemplate {
    id: string;
    label: string;
    blurb: string;
    make: () => { title: string; path: string; seo: boolean; content: string };
}

export const PAGE_TEMPLATES: PageTemplate[] = [
    {
        id: "corp-home",
        label: "Company front page",
        blurb: "A clean corporate landing page with a hero and three service cards.",
        make: () => ({
            title: "Home",
            path: "/",
            seo: true,
            content: [
                "<h1>Meridian Capital</h1>",
                "<p>Discreet asset management for a connected world. Trusted since 2009.</p>",
                "<h2>What we do</h2>",
                "<ul><li>Portfolio custody</li><li>Risk analytics</li><li>Private settlements</li></ul>",
                "<p>Questions? Visit our <a href=\"/contact\">contact page</a> or read the <a href=\"/about/team\">team overview</a>.</p>",
            ].join(""),
        }),
    },
    {
        id: "team",
        label: "Team / about page",
        blurb: "An about page in a sub-directory — a classic place to tuck a clue.",
        make: () => ({
            title: "Our team",
            path: "/about/team",
            seo: true,
            content: [
                "<h1>Our team</h1>",
                "<p><strong>H. Voss</strong> — Chief Executive. Formerly of the harbourside logistics firm.</p>",
                "<p><strong>M. Iyer</strong> — Head of Settlements. Keeps the ledger balanced, allegedly.</p>",
                "<p><strong>D. Okafor</strong> — Systems Administrator. If something is online, D. put it there.</p>",
            ].join(""),
        }),
    },
    {
        id: "status",
        label: "Status / incident page",
        blurb: "A service-status page with an incident log — good for leaking hints.",
        make: () => ({
            title: "Service status",
            path: "/status",
            seo: true,
            content: [
                "<h1>Service status</h1>",
                "<p>All systems operational.</p>",
                "<h2>Past incidents</h2>",
                "<ul><li><strong>2026-07-14</strong> — VPN concentrator rebooted after firmware update (ticket NC-1187).</li><li><strong>2026-05-02</strong> — Mail relay delay, resolved.</li></ul>",
            ].join(""),
        }),
    },
    {
        id: "contact",
        label: "Contact page",
        blurb: "Addresses and a mailbox — an easy place to hide an e-mail lead.",
        make: () => ({
            title: "Contact",
            path: "/contact",
            seo: true,
            content: [
                "<h1>Contact</h1>",
                "<p>Meridian Capital · Hafnerweg 12 · Munich</p>",
                "<p>Press: <a href=\"mailto:press@meridian-capital.net\">press@meridian-capital.net</a></p>",
                "<blockquote>We do not accept unsolicited security research.</blockquote>",
            ].join(""),
        }),
    },
    {
        id: "hidden-leak",
        label: "Hidden clue page",
        blurb: "Starts unlisted (seo off) in a deep sub-directory — dirhunter bait.",
        make: () => ({
            title: "Q3 internal audit",
            path: "/files/internal/q3-audit",
            seo: false,
            content: [
                "<h1>INTERNAL — Q3 settlement audit</h1>",
                "<p>Do not circulate. The offshore batch settles through <strong>router 10.9.4.2</strong> until further notice.</p>",
                "<p>Archive password rotates weekly; ask D. Okafor on the internal channel.</p>",
            ].join(""),
        }),
    },
];
