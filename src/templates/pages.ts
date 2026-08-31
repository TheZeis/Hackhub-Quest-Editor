/**
 * Ready-made website pages. Every template is a complete, self-contained HTML
 * document — its own <style>, system fonts, inline SVG, no external requests —
 * matching how the game's WebViews load sites (mod-asset://, no internet) and
 * what authors bring in from LLMs. Authors swap the text; the design holds.
 */
export interface PageTemplate {
    id: string;
    label: string;
    blurb: string;
    make: () => { title: string; path: string; seo: boolean; content: string };
}

/* ── Meridian Capital: corporate palette shared by its pages ─────────────── */

const CORP_CSS = `
:root{--navy:#0d2b45;--navy2:#123a5c;--gold:#c9a227;--ink:#22303e;--mut:#5c6b7a;--bg:#f5f7fa;--line:#dfe6ee}
*{box-sizing:border-box;margin:0}
body{font:15px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:var(--ink);background:var(--bg)}
a{color:var(--navy)}
header{background:var(--navy);color:#fff;position:sticky;top:0;z-index:5}
.nav{max-width:1040px;margin:0 auto;display:flex;align-items:center;gap:26px;padding:13px 20px}
.logo{display:flex;align-items:center;gap:10px;font-weight:700;letter-spacing:.4px}
.logo svg{width:24px;height:24px}
nav{margin-left:auto;display:flex;gap:20px;font-size:13.5px}
nav a{color:#cfd9e4;text-decoration:none}
nav a:hover{color:#fff}
main{max-width:1040px;margin:0 auto;padding:48px 20px}
h1.pg{font-size:30px;margin-bottom:8px}
p.sub{color:var(--mut);margin-bottom:28px;max-width:64ch}
footer{background:var(--navy);color:#9db1c5;font-size:12.5px;padding:24px 20px;margin-top:40px}
.foot{max-width:1040px;margin:0 auto;display:flex;gap:22px;flex-wrap:wrap}
footer a{color:#cfd9e4;text-decoration:none}
.btn{display:inline-block;background:var(--gold);color:#152238;font-weight:600;padding:11px 20px;border-radius:6px;text-decoration:none;font-size:14px}
.btn.ghost{background:transparent;color:#fff;border:1px solid #46617c;margin-left:10px}
`;

const CORP_HEADER = `
<header><div class="nav">
  <span class="logo"><svg viewBox="0 0 24 24" fill="none" stroke="#c9a227" stroke-width="2"><path d="M3 21V7l7-4 7 4v14"/><path d="M3 21h18"/><path d="M10 21v-6h4v6"/></svg>Meridian Capital</span>
  <nav><a href="/">Home</a><a href="/about/team">Team</a><a href="/status">Status</a><a href="/contact">Contact</a></nav>
</div></header>`;

const CORP_FOOTER = `
<footer><div class="foot">
  <span>© 2026 Meridian Capital AG</span><span>Hafnerweg 12, Munich</span>
  <a href="/contact">Contact</a><a href="/status">Service status</a>
</div></footer>`;

export const PAGE_TEMPLATES: PageTemplate[] = [
    {
        id: "corp-home",
        label: "Corporate front page",
        blurb: "Sticky nav, gradient hero, service cards — a believable company site.",
        make: () => ({
            title: "Home",
            path: "/",
            seo: true,
            content: `<!doctype html>
<html>
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Meridian Capital — Discreet asset management</title>
<style>${CORP_CSS}
.hero{background:linear-gradient(135deg,var(--navy),var(--navy2) 70%);color:#fff;padding:76px 20px 88px}
.hero-in{max-width:1040px;margin:0 auto}
.hero h1{font-size:42px;line-height:1.12;max-width:620px;font-weight:750}
.hero p{margin:16px 0 26px;color:#c4d2e0;max-width:540px;font-size:16px}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:22px}
.card .tag{font-size:11px;color:var(--navy);background:#e8eef5;border-radius:99px;padding:2px 10px;display:inline-block;margin-bottom:12px}
.card h3{font-size:15.5px;margin-bottom:8px}
.card p{font-size:13.5px;color:var(--mut)}
.band{background:#fff;border-block:1px solid var(--line);padding:46px 20px;text-align:center}
.band p{max-width:620px;margin:0 auto;color:var(--mut)}
</style>
</head>
<body>
${CORP_HEADER}
<div class="hero"><div class="hero-in">
  <h1>Discreet asset management for a connected world.</h1>
  <p>Meridian Capital safeguards portfolios, settles privately, and reports honestly — since 2009.</p>
  <a class="btn" href="/contact">Open an enquiry</a><a class="btn ghost" href="/about/team">Meet the team</a>
</div></div>
<main>
  <div class="cards">
    <div class="card"><span class="tag">Custody</span><h3>Portfolio custody</h3><p>Cold storage, dual control, and quarterly attestation for every client position.</p></div>
    <div class="card"><span class="tag">Analytics</span><h3>Risk analytics</h3><p>Exposure dashboards refreshed hourly, stress-tested against your own thresholds.</p></div>
    <div class="card"><span class="tag">Settlement</span><h3>Private settlements</h3><p>Counterparty-matched settlement windows with end-to-end encrypted statements.</p></div>
  </div>
</main>
<div class="band"><p>“We keep a low profile on purpose. The less the internet knows about us, the better we sleep.” — H. Voss, Chief Executive</p></div>
${CORP_FOOTER}
</body>
</html>`,
        }),
    },
    {
        id: "team",
        label: "Corporate team page",
        blurb: "Staff directory cards with roles and @company mails — great for leads.",
        make: () => ({
            title: "Our team",
            path: "/about/team",
            seo: true,
            content: `<!doctype html>
<html>
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Our team — Meridian Capital</title>
<style>${CORP_CSS}
.people{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.person{background:#fff;border:1px solid var(--line);border-radius:10px;padding:22px;text-align:center}
.ava{width:64px;height:64px;border-radius:50%;background:var(--navy);color:var(--gold);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px;margin:0 auto 12px}
.person h3{font-size:15.5px}
.person .role{color:var(--mut);font-size:12.5px;margin:4px 0 10px}
.person a{font-size:12.5px}
</style>
</head>
<body>
${CORP_HEADER}
<main>
  <h1 class="pg">Our team</h1>
  <p class="sub">Small on purpose. Every account is known by name, not by number.</p>
  <div class="people">
    <div class="person"><div class="ava">HV</div><h3>H. Voss</h3><p class="role">Chief Executive</p><a href="mailto:h.voss@meridian-capital.net">h.voss@meridian-capital.net</a></div>
    <div class="person"><div class="ava">MI</div><h3>M. Iyer</h3><p class="role">Head of Settlements</p><a href="mailto:m.iyer@meridian-capital.net">m.iyer@meridian-capital.net</a></div>
    <div class="person"><div class="ava">DO</div><h3>D. Okafor</h3><p class="role">Systems Administrator</p><a href="mailto:d.okafor@meridian-capital.net">d.okafor@meridian-capital.net</a></div>
  </div>
</main>
${CORP_FOOTER}
</body>
</html>`,
        }),
    },
    {
        id: "status",
        label: "Status dashboard",
        blurb: "Uptime rows, coloured badges, incident log — a status-page that reads real.",
        make: () => ({
            title: "Service status",
            path: "/status",
            seo: true,
            content: `<!doctype html>
<html>
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Status — Meridian Capital</title>
<style>
*{box-sizing:border-box;margin:0}
body{font:14px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#1f2937;background:#f8fafc}
.wrap{max-width:860px;margin:0 auto;padding:40px 20px}
h1{font-size:22px;margin-bottom:4px}
p.upd{color:#64748b;font-size:12.5px;margin-bottom:22px}
.banner{display:flex;align-items:center;gap:10px;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;border-radius:8px;padding:12px 16px;font-weight:600;margin-bottom:26px}
.dot{width:10px;height:10px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 4px #dcfce7}
.row{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:8px}
.row .name{font-weight:600}
.row .up{margin-left:auto;color:#64748b;font-size:12px;font-family:ui-monospace,Menlo,Consolas,monospace}
.badge{font-size:11px;font-weight:700;border-radius:99px;padding:3px 10px}
.ok{background:#dcfce7;color:#15803d}
.warn{background:#fef3c7;color:#b45309}
h2{font-size:15px;margin:28px 0 10px}
.inc{border-left:3px solid #f59e0b;background:#fffbeb;padding:10px 14px;border-radius:0 6px 6px 0;margin-bottom:8px;font-size:13px}
.inc .d{font-family:ui-monospace,Menlo,Consolas,monospace;color:#92400e;font-size:11.5px}
</style>
</head>
<body>
<div class="wrap">
  <h1>Meridian Capital — service status</h1>
  <p class="upd">Updated 5 minutes ago · All times CET</p>
  <div class="banner"><span class="dot"></span>All systems operational</div>
  <div class="row"><span class="name">Client portal</span><span class="up">99.98% · 90d</span><span class="badge ok">Operational</span></div>
  <div class="row"><span class="name">Settlement API</span><span class="up">99.91% · 90d</span><span class="badge ok">Operational</span></div>
  <div class="row"><span class="name">VPN concentrator</span><span class="up">97.40% · 90d</span><span class="badge warn">Degraded</span></div>
  <h2>Past incidents</h2>
  <div class="inc"><span class="d">2026-07-14</span> — VPN concentrator rebooted after firmware update (ticket NC-1187). Resolved 02:41.</div>
  <div class="inc"><span class="d">2026-05-02</span> — Mail relay delay, resolved within the hour.</div>
</div>
</body>
</html>`,
        }),
    },
    {
        id: "contact",
        label: "Corporate contact page",
        blurb: "Address, mail and hours blocks with a quiet 'no security research' note.",
        make: () => ({
            title: "Contact",
            path: "/contact",
            seo: true,
            content: `<!doctype html>
<html>
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Contact — Meridian Capital</title>
<style>${CORP_CSS}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.box{background:#fff;border:1px solid var(--line);border-radius:10px;padding:22px}
.box h3{font-size:14px;text-transform:uppercase;letter-spacing:.6px;color:var(--mut);margin-bottom:10px}
.box p{font-size:14px}
.note{margin-top:22px;border:1px dashed var(--line);background:#fff;border-radius:10px;padding:16px 20px;color:var(--mut);font-size:13px}
</style>
</head>
<body>
${CORP_HEADER}
<main>
  <h1 class="pg">Contact</h1>
  <p class="sub">We answer within one business day. Usually sooner.</p>
  <div class="grid">
    <div class="box"><h3>Visit</h3><p>Hafnerweg 12<br>80992 Munich<br>By appointment only.</p></div>
    <div class="box"><h3>Write</h3><p><a href="mailto:press@meridian-capital.net">press@meridian-capital.net</a><br><a href="mailto:clients@meridian-capital.net">clients@meridian-capital.net</a></p></div>
    <div class="box"><h3>Call</h3><p>+49 89 000 000<br>Mon–Fri, 9:00–17:00</p></div>
  </div>
  <div class="note">We do not accept unsolicited security research. Reports sent to personal mailboxes are deleted unread.</div>
</main>
${CORP_FOOTER}
</body>
</html>`,
        }),
    },
    {
        id: "hidden-leak",
        label: "Hidden internal memo",
        blurb: "Deliberately plain 'printed memo' look, unlisted, deep path — dirhunter bait.",
        make: () => ({
            title: "Q3 internal audit",
            path: "/files/internal/q3-audit",
            seo: false,
            content: `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>q3-audit.txt</title>
<style>
body{font:13.5px/1.7 Georgia,"Times New Roman",serif;color:#111;background:#fdfdf8;padding:48px 20px}
.sheet{max-width:680px;margin:0 auto;background:#fff;border:1px solid #d8d4c8;padding:44px 48px;box-shadow:0 1px 4px rgba(0,0,0,.08)}
.stamp{display:inline-block;border:3px double #b91c1c;color:#b91c1c;font-weight:700;letter-spacing:2px;padding:4px 12px;transform:rotate(-2deg);font-size:15px;margin-bottom:18px}
.meta{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;color:#555;border-bottom:1px solid #ccc;padding-bottom:10px;margin-bottom:18px}
h1{font-size:19px;margin-bottom:12px}
p{margin:0 0 10px}
strong.red{background:#ffe4e6}
</style>
</head>
<body>
<div class="sheet">
  <span class="stamp">INTERNAL — DO NOT DISTRIBUTE</span>
  <div class="meta">doc: Q3-SETTLEMENT-AUDIT · rev 3 · authored d.okafor · retention: 7y</div>
  <h1>Q3 settlement audit — findings</h1>
  <p>1. The offshore batch continues to settle through <strong class="red">router 10.9.4.2</strong> until the Frankfurt move completes.</p>
  <p>2. Archive access rotates weekly. Current procedure: ask <strong>D. Okafor</strong> on the internal channel; the temporary phrase follows the usual <strong class="red">month-favourite-planet</strong> scheme.</p>
  <p>3. Stop printing this document.</p>
</div>
</body>
</html>`,
        }),
    },
    {
        id: "agency",
        label: "Public agency site",
        blurb: "A naza-grade agency homepage: dark hero, orbit SVG, missions, newsroom, staff directory, portal login.",
        make: () => ({
            title: "NAZA — National Aeronautics & Space Administration",
            path: "/",
            seo: true,
            content: `<!doctype html>
<html>
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>NAZA — Explore the unknown</title>
<style>
:root{--space:#0b1026;--space2:#131a3a;--blue:#0b3d91;--red:#fc3d21;--ink:#e8ecf8;--mut:#9aa5c4;--line:#232c52}
*{box-sizing:border-box;margin:0}
body{font:15px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;background:var(--space);color:var(--ink)}
a{color:#8fb3ff}
header{position:sticky;top:0;background:rgba(11,16,38,.92);backdrop-filter:blur(6px);border-bottom:1px solid var(--line);z-index:5}
.nav{max-width:1080px;margin:0 auto;display:flex;align-items:center;gap:24px;padding:12px 20px}
.logo{display:flex;align-items:center;gap:10px;font-weight:800;letter-spacing:2px}
nav{margin-left:auto;display:flex;gap:18px;font-size:13px}
nav a{color:var(--mut);text-decoration:none}
nav a:hover{color:#fff}
.hero{background:radial-gradient(1200px 500px at 80% -10%,#1b2a6b 0%,transparent 60%),var(--space);padding:70px 20px 80px}
.hero-in{max-width:1080px;margin:0 auto;display:grid;grid-template-columns:1.2fr .8fr;gap:40px;align-items:center}
.hero h1{font-size:44px;line-height:1.1;font-weight:800}
.hero h1 em{color:var(--red);font-style:normal}
.hero p{margin:16px 0 24px;color:var(--mut);max-width:520px}
.btn{display:inline-block;background:var(--red);color:#fff;font-weight:700;padding:11px 22px;border-radius:4px;text-decoration:none;font-size:14px}
.btn.ghost{background:transparent;border:1px solid var(--line);color:var(--ink);margin-left:10px}
main{max-width:1080px;margin:0 auto;padding:56px 20px}
h2.sec{font-size:20px;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px}
h2.sec::after{content:"";display:block;width:44px;height:3px;background:var(--red);margin-top:6px}
p.sub{color:var(--mut);margin:10px 0 26px}
.missions{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.m{background:var(--space2);border:1px solid var(--line);border-radius:10px;padding:20px}
.m .st{font-size:10.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;border-radius:99px;padding:3px 10px}
.st.fly{background:#12315e;color:#8fb3ff}.st.dev{background:#3a2a12;color:#fbbf24}.st.done{background:#123320;color:#4ade80}
.m h3{font-size:15px;margin:12px 0 6px}
.m p{font-size:13px;color:var(--mut)}
.news{display:grid;gap:10px}
.n{display:flex;gap:16px;background:var(--space2);border:1px solid var(--line);border-radius:10px;padding:16px 20px}
.n .d{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;color:var(--mut);white-space:nowrap;padding-top:2px}
.n h3{font-size:14.5px}
.n p{font-size:13px;color:var(--mut)}
.staff{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.s{background:var(--space2);border:1px solid var(--line);border-radius:10px;padding:16px;text-align:center}
.s .ava{width:52px;height:52px;border-radius:50%;background:var(--blue);display:flex;align-items:center;justify-content:center;font-weight:700;margin:0 auto 10px}
.s h3{font-size:13.5px}.s .r{font-size:11.5px;color:var(--mut);margin:3px 0 8px}.s a{font-size:11px}
.portal{margin-top:56px;display:grid;grid-template-columns:1fr 1fr;background:var(--space2);border:1px solid var(--line);border-radius:12px;overflow:hidden}
.portal .l{padding:28px}
.portal h3{font-size:16px;margin-bottom:6px}
.portal p{font-size:13px;color:var(--mut)}
.portal .r{padding:28px;background:#0d1330;border-left:1px solid var(--line)}
.portal input{width:100%;background:var(--space);border:1px solid var(--line);color:var(--ink);border-radius:6px;padding:9px 12px;margin-bottom:10px;font-size:13px}
.portal .deny{color:var(--red);font-size:12px;margin-top:8px;font-weight:600}
footer{border-top:1px solid var(--line);color:var(--mut);font-size:12.5px;padding:26px 20px;margin-top:56px}
.foot{max-width:1080px;margin:0 auto;display:flex;gap:20px;flex-wrap:wrap}
</style>
</head>
<body>
<header><div class="nav">
  <span class="logo"><svg width="30" height="30" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="10" fill="#0b3d91"/><ellipse cx="24" cy="24" rx="21" ry="8" stroke="#fc3d21" stroke-width="2" transform="rotate(-18 24 24)"/><circle cx="38" cy="15" r="2.5" fill="#e8ecf8"/></svg>NAZA</span>
  <nav><a href="/">Home</a><a href="/missions">Missions</a><a href="/newsroom">Newsroom</a><a href="/people">People</a><a href="/portal">Employee portal</a></nav>
</div></header>
<div class="hero"><div class="hero-in">
  <div>
    <h1>Explore the unknown. <em>Build what's next.</em></h1>
    <p>The National Aeronautics &amp; Space Administration charts orbit, climate and deep space — for everyone, everywhere.</p>
    <a class="btn" href="/missions">Current missions</a><a class="btn ghost" href="/newsroom">Newsroom</a>
  </div>
  <svg viewBox="0 0 200 160" fill="none" aria-hidden="true"><circle cx="100" cy="80" r="34" fill="#0b3d91"/><circle cx="100" cy="80" r="34" stroke="#27407c"/><ellipse cx="100" cy="80" rx="86" ry="30" stroke="#2a3560" stroke-width="1.5" transform="rotate(-16 100 80)"/><ellipse cx="100" cy="80" rx="62" ry="22" stroke="#232c52" transform="rotate(-16 100 80)"/><circle cx="168" cy="52" r="4" fill="#fc3d21"/><circle cx="46" cy="102" r="3" fill="#8fb3ff"/></svg>
</div></div>
<main>
  <h2 class="sec">Missions</h2>
  <p class="sub">Three programmes, one mandate: go, learn, return.</p>
  <div class="missions">
    <div class="m"><span class="st fly">In flight</span><h3>HELIOS-7</h3><p>Solar polar orbiter measuring flare weather; perihelion pass due next month.</p></div>
    <div class="m"><span class="st dev">In development</span><h3>DEEP FERRY</h3><p>Reusable tug for cislunar logistics. Static fire campaign at Pad 39-C.</p></div>
    <div class="m"><span class="st done">Complete</span><h3>GLASS SEA</h3><p>Four-year ocean-salinity mapper; data set public in the archive.</p></div>
  </div>
  <h2 class="sec" style="margin-top:48px">Newsroom</h2>
  <p class="sub">Briefings and releases, newest first.</p>
  <div class="news">
    <div class="n"><span class="d">2026-08-12</span><div><h3>Routine IT security audit scheduled</h3><p>Internal systems, including the employee portal, undergo a routine audit this quarter. External access unchanged.</p></div></div>
    <div class="n"><span class="d">2026-07-30</span><div><h3>HELIOS-7 returns first polar imagery</h3><p>The coronal imager resolved a filament eruption in unprecedented detail.</p></div></div>
  </div>
  <h2 class="sec" style="margin-top:48px">Leadership directory</h2>
  <p class="sub">Public contact list for press and partners.</p>
  <div class="staff">
    <div class="s"><div class="ava">AR</div><h3>Dr. A. Reyes</h3><p class="r">Administrator</p><a href="mailto:a.reyes@naza.gov">a.reyes@naza.gov</a></div>
    <div class="s"><div class="ava">KT</div><h3>K. Tanaka</h3><p class="r">Deputy, Operations</p><a href="mailto:k.tanaka@naza.gov">k.tanaka@naza.gov</a></div>
    <div class="s"><div class="ava">LB</div><h3>L. Brandt</h3><p class="r">Chief Information Officer</p><a href="mailto:l.brandt@naza.gov">l.brandt@naza.gov</a></div>
    <div class="s"><div class="ava">OS</div><h3>O. Sefu</h3><p class="r">Press Office</p><a href="mailto:press@naza.gov">press@naza.gov</a></div>
  </div>
  <!-- ops note: temp passwords for portal resets follow month-favourite-planet, e.g. "august-mars" -->
  <div class="portal">
    <div class="l"><h3>Employee portal</h3><p>Staff sign in with your agency account. Contractors use the badge kiosk instead.</p></div>
    <div class="r">
      <input type="text" placeholder="user@naza.gov" aria-label="portal user">
      <input type="password" placeholder="password" aria-label="portal password">
      <button class="btn" type="button">Sign in</button>
      <p class="deny">Access denied — this mirror does not authenticate.</p>
    </div>
  </div>
</main>
<footer><div class="foot">
  <span>NAZA · an agency of the in-game public</span>
  <span>Find us on Twotter @naza · Kisscord “NAZA Community” · WeeChat #naza</span>
</div></footer>
</body>
</html>`,
        }),
    },
];

/* ── whole-site starters ─────────────────────────────────────────────────── */

export interface SiteTemplate {
    id: string;
    label: string;
    blurb: string;
    make: () => {
        host: string;
        name: string;
        pages: { title: string; path: string; seo: boolean; content: string; template: string }[];
    };
}

const pageFrom = (id: string) => {
    const t = PAGE_TEMPLATES.find((x) => x.id === id)!;
    return { ...t.make(), template: t.id };
};

export const SITE_TEMPLATES: SiteTemplate[] = [
    {
        id: "corp",
        label: "Corporate site",
        blurb: "Front page, team, status and contact — plus a hidden internal memo two directories deep for dirhunter to find.",
        make: () => ({
            host: "meridian-capital.net",
            name: "Meridian Capital",
            pages: ["corp-home", "team", "status", "contact", "hidden-leak"].map(pageFrom),
        }),
    },
    {
        id: "agency",
        label: "Public agency site",
        blurb: "A believable space-agency homepage with missions, newsroom, staff directory and a dead employee portal — plus a hidden memo.",
        make: () => {
            const status = pageFrom("status");
            return {
                host: "naza.gov",
                name: "NAZA",
                pages: [
                    pageFrom("agency"),
                    { ...status, content: status.content.replaceAll("Meridian Capital", "NAZA") },
                    pageFrom("hidden-leak"),
                ],
            };
        },
    },
    {
        id: "leak",
        label: "Leak archive",
        blurb: "A sparse public status page, with the real goods hidden in a sub-directory.",
        make: () => ({
            host: "archive.nightwire.net",
            name: "Nightwire archive",
            pages: ["status", "hidden-leak"].map(pageFrom),
        }),
    },
];

/* ── starter for blank sites ─────────────────────────────────────────────── */

import { BASE_CSS } from "@/editor/websites/pageDoc";

/** The first page of a blank website: styled, with obvious placeholder copy. */
export const STARTER_PAGE = `<!doctype html>
<html>
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>New site</title>
<style>${BASE_CSS}
header.site{display:flex;gap:22px;align-items:center}
header.site nav{margin-left:auto;font-weight:400;font-size:13px}
header.site nav a{color:#cfd9e4;text-decoration:none;margin-left:16px}
</style>
</head>
<body>
<header class="site">Your Organisation<nav><a href="/">Home</a><a href="/contact">Contact</a></nav></header>
<h1>A headline the player will remember</h1>
<p>Write the public face of your quest here. Everything the player should believe, and — somewhere in a sub-directory — the one page they were never meant to find.</p>
<h2>What goes on a page like this</h2>
<ul>
  <li>A lead: a name, a mailbox, a router model, a ticket number.</li>
  <li>A reason to look closer: an odd footnote, an “audit scheduled” notice.</li>
  <li>A dead end that feels real: a login box that always denies access.</li>
</ul>
</body>
</html>`;
