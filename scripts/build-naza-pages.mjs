/**
 * One-off generator: splits the community naza-homepage.html (single-file,
 * anchor navigation) into a proper multi-page site that keeps the exact same
 * look. Run with: node scripts/build-naza-pages.mjs
 *
 * Output: src/editor/websites/naza/*.html — imported by the templates with
 * ?raw, same as the original file.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const src = readFileSync(new URL("../src/editor/websites/naza-homepage.html", import.meta.url), "utf8");

const cut = (a, b) => {
    const i = src.indexOf(a);
    const j = src.indexOf(b, i + a.length);
    if (i < 0 || j < 0) throw new Error(`marker not found: ${a} … ${b}`);
    return src.slice(i, j);
};

const style = cut("<style>", "</style>");
const govBar = cut('<div class="gov-bar">', "<header>");
const header = cut("<header>", "</header>");
const footer = cut("<footer>", "</footer>");
const hero = cut('<section class="hero">', '<div class="wrap">\n    <div class="topics">');
const topics = cut('<div class="wrap">\n    <div class="topics">', '<section class="block" id="missions">');
const missions = cut('<section class="block" id="missions">', '<section class="block" id="news">');
const news = cut('<section class="block" id="news">', '<section class="block his" id="humans">');
const humans = cut('<section class="block his" id="humans">', '<section class="block" id="science">');
const science = cut('<section class="block" id="science">', '<section class="block" id="directory">');
const directory = cut('<section class="block" id="directory">', '<section class="block" id="portal">');
const portal = cut('<section class="block" id="portal">', "<section class=\"block\">\n    <div class=\"wrap\">\n      <div class=\"newsletter\">");
const newsletter =
    '<section class="block">\n    <div class="wrap">\n      ' + cut('<div class="newsletter">', '<div class="helpful">');
const helpful = cut('<div class="helpful">', "\n</main>");

const page = ({ title, body, script }) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — NAZA</title>
<style>${style}</style>
</head>
<body>

${govBar.trim()}

${headerFixed.trim()}

<main id="top">

${body.trim()}

</main>

${footerFixed.trim()}

<script>
  document.getElementById('menuToggle').addEventListener('click', function(){
    document.getElementById('primaryNav').classList.toggle('open');
  });
  document.getElementById('govToggle').addEventListener('click', function(){
    document.getElementById('govDetail').classList.toggle('open');
  });
${script ?? ""}</script>

</body>
</html>
`;

/** Turn the original's in-page anchors into real page links. */
const repath = (html) => {
    const byLabel = {
        "View all missions": "/missions",
        "Recently published": "/news",
        "Recently Published": "/news",
        Newsletters: "/news",
        "Discover more →": "/humans",
        "Meridian Station": "/humans",
        "Living in Space": "/humans",
        Astronauts: "/humans",
        Destinations: "/humans",
        "Browse image archive →": "/science",
        "About NAZA's Mission": "/directory",
        "Join Us": "/directory",
        Contact: "/directory",
        "Records Requests": "/directory",
    };
    let out = html;
    for (const [label, path] of Object.entries(byLabel)) {
        out = out.replaceAll(`<a href="#">${label}</a>`, `<a href="${path}">${label}</a>`);
    }
    out = out
        .replace('href="#" style="color:var(--blue); font-weight:700;">Discover more', 'href="/humans" style="color:var(--blue); font-weight:700;">Discover more')
        .replace('href="#" style="color:var(--blue); font-weight:700;">Browse image archive', 'href="/science" style="color:var(--blue); font-weight:700;">Browse image archive');
    return out
        .replace(/href="#missions"/g, 'href="/missions"')
        .replace(/href="#humans"/g, 'href="/humans"')
        .replace(/href="#science"/g, 'href="/science"')
        .replace(/href="#news"/g, 'href="/news"')
        .replace(/href="#directory"/g, 'href="/directory"')
        .replace(/href="#portal"/g, 'href="/portal"')
        .replace(/href="#top"/g, 'href="/"')
        .replace(/href="#"/g, 'href="/"');
};

const navHome = header.replace(
    '<div class="wrap" id="primaryNav">',
    '<div class="wrap" id="primaryNav">\n      <a href="/">Home</a>',
);
const headerFixed = repath(navHome);
const footerFixed = repath(footer);

// The directory table gains an Employee ID column — the fuel for the
// temp-password clue on the portal page.
const directoryWithIds = directory
    .replace(
        /(<th style="text-align:left; padding:10px 12px; font-size:12px; color:var\(--grey\); text-transform:uppercase;">)Contact(<\/th>)/,
        '$1Employee ID</th>\n              <th style="text-align:left; padding:10px 12px; font-size:12px; color:var(--grey); text-transform:uppercase;">$2',
    )
    .replace(/(h\.voss@naza\.gov<\/td>)/, "$1")
    .replace(/(<td style="padding:14px 12px; font-family:var\(--mono\); color:var\(--grey\);">)([a-z.]+@naza\.gov)(<\/td>)/g, (m, a, mail, c) => {
        const ids = {
            "h.voss": "NZA-3301",
            "m.idowu": "NZA-3314",
            "p.nakamura": "NZA-3402",
            "t.reyes": "NZA-3419",
            "g.callahan": "NZA-3455",
        };
        const id = ids[mail.replace("@naza.gov", "")] ?? "NZA-0000";
        return `${a}${mail}${c}\n              <td style="padding:14px 12px; font-family:var(--mono); color:var(--grey);">${id}</td>`;
    });

// A small internal, unlisted page: what dirhunter is for.
const itHelpdesk = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>IT Help Desk — NAZA Internal</title>
<style>${style}</style>
</head>
<body>

${govBar.trim()}

<header>
  <div class="header-row">
    <a class="brand" href="/">
      <svg width="42" height="42" viewBox="0 0 42 42" xmlns="http://www.w3.org/2000/svg">
        <circle cx="21" cy="21" r="20" fill="#123f91"/>
        <ellipse cx="21" cy="21" rx="16" ry="6.5" fill="none" stroke="#fff" stroke-width="1.4" transform="rotate(-18 21 21)"/>
        <path d="M21 9 L25 22 L21 19.5 L17 22 Z" fill="#e8422a"/>
        <circle cx="21" cy="21" r="1.8" fill="#fff"/>
      </svg>
      <span class="brand-text">NAZA<small>INTERNAL — IT HELP DESK</small></span>
    </a>
  </div>
</header>

<main id="top">
  <section class="block">
    <div class="wrap" style="max-width:760px;">
      <div class="block-head"><h2>IT Help Desk — password resets</h2></div>
      <p style="font-size:14px; color:var(--grey);">This page is not listed on the public site. If you can read it, you are on the internal network.</p>
      <p style="font-size:14.5px;"><strong>Temporary password format (unchanged since the 2019 migration):</strong><br>
      first initial + last name + last 4 digits of the employee ID.<br>
      <span style="font-family:var(--mono); color:var(--grey);">example: t.reyes, ID NZA-3419 → treyes3419</span></p>
      <div style="border:1px solid var(--line); border-radius:6px; padding:18px; margin-top:18px;">
        <div style="font-size:12px; color:var(--grey); text-transform:uppercase; margin-bottom:10px;">Resets issued this week</div>
        <table style="width:100%; border-collapse:collapse; font-size:14px;">
          <tbody>
            <tr style="border-bottom:1px solid var(--line);"><td style="padding:10px 4px;">h.voss</td><td style="padding:10px 4px; color:var(--grey);">Monday</td></tr>
            <tr style="border-bottom:1px solid var(--line);"><td style="padding:10px 4px;">m.idowu</td><td style="padding:10px 4px; color:var(--grey);">Tuesday</td></tr>
            <tr style="border-bottom:1px solid var(--line);"><td style="padding:10px 4px; font-weight:600;">t.reyes</td><td style="padding:10px 4px; color:var(--grey);">Wednesday — has not changed the temp password yet</td></tr>
            <tr><td style="padding:10px 4px;">g.callahan</td><td style="padding:10px 4px; color:var(--grey);">Thursday</td></tr>
          </tbody>
        </table>
      </div>
      <!-- helpdesk wiki: do not index. ticket queue lives on the intranet share. -->
    </div>
  </section>
</main>

<footer>
  <div class="wrap">
    <div class="footer-bottom">
      <span>© 2026 National Aerospace &amp; Zero-Gravity Administration — INTERNAL</span>
    </div>
  </div>
</footer>

<script>
  var gt = document.getElementById('govToggle');
  if (gt) gt.addEventListener('click', function(){
    document.getElementById('govDetail').classList.toggle('open');
  });
</script>

</body>
</html>
`;

const out = new URL("../src/editor/websites/naza/", import.meta.url);
mkdirSync(out, { recursive: true });

const home = repath(hero + topics + missions + news + humans + science + newsletter + helpful);
const missionsPage = repath(
    missions.replace('<a href="#">View all missions</a>', "") + newsletter + helpful,
);
const newsPage = repath(
    news.replace("<h2>Featured news</h2>", "<h2>News &amp; events</h2>") + newsletter + helpful,
);
const humansPage = repath(humans + newsletter + helpful);
const sciencePage = repath(science + newsletter + helpful);
const directoryPage = repath(directoryWithIds + newsletter + helpful);
const portalPage = repath(portal);

const files = {
    "home.html": page({ title: "National Aerospace & Zero-Gravity Administration", body: home }),
    "missions.html": page({ title: "Missions", body: missionsPage }),
    "news.html": page({ title: "News & Events", body: newsPage }),
    "humans.html": page({ title: "Humans in Space", body: humansPage }),
    "science.html": page({ title: "Science", body: sciencePage }),
    "directory.html": page({ title: "Leadership & Directory", body: directoryPage }),
    "portal.html": page({
        title: "Employee Portal",
        body: portalPage,
        script: `  document.getElementById('portalForm').addEventListener('submit', function(e){
    e.preventDefault();
    document.getElementById('portalMsg').textContent = 'Access denied: invalid credentials.';
  });`,
    }),
    "it-helpdesk.html": itHelpdesk,
};

for (const [name, content] of Object.entries(files)) {
    writeFileSync(new URL(name, out), content);
    console.log(`${name}  ${content.length} bytes`);
}
