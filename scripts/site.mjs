#!/usr/bin/env node
/**
 * The SPICY NIGHT website: start page, help & contact, privacy policy and imprint in German,
 * English and Spanish – static files without cookies, trackers or anything loaded from other
 * servers.
 *
 *   npm run site:build                 # → dist-site/ (with a draft banner while details are missing)
 *   npm run site:build -- --release    # fails while provider, hosting or contact e-mail are missing
 *   npm run site:preview               # build and serve on http://localhost:4173
 *   npm run site:store-urls            # write the page addresses into store.config.json
 *
 * Sources: site/content/<lang>.json (page texts), store.config.json (app description),
 * docs/store/privacy-policy.<lang>.md (privacy policy), src/config/legal.json (provider details,
 * shared with the app) and site/site.config.json (address, contact e-mail, hosting, store links).
 * Options for tests and special cases: --out, --legal, --config, --store-config, --port.
 */
import {
  copyFileSync,
  createReadStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const LANGUAGES = ['de', 'en', 'es'];
/** App Store texts each language takes its description from. */
const STORE_INFO = { de: 'de-DE', en: 'en-US', es: 'es-ES' };
/** Page paths – the same in every language, so switching the language keeps the page. */
const PAGES = { home: '', support: 'support/', privacy: 'privacy/', imprint: 'imprint/' };
/** The brand claim – English in every language, like in the app. */
const CLAIM = 'The party gets hotter.';
const SCREENSHOTS = 'docs/store/screenshots/android-phone';
const FONTS = [
  ['@expo-google-fonts/unbounded/800ExtraBold/Unbounded_800ExtraBold.ttf', 'Unbounded-ExtraBold.ttf'],
  ['@expo-google-fonts/manrope/500Medium/Manrope_500Medium.ttf', 'Manrope-Medium.ttf'],
  ['@expo-google-fonts/manrope/800ExtraBold/Manrope_800ExtraBold.ttf', 'Manrope-ExtraBold.ttf'],
  ['@expo-google-fonts/unbounded/LICENSE_FONT', 'OFL-Unbounded.txt'],
  ['@expo-google-fonts/manrope/LICENSE_FONT', 'OFL-Manrope.txt'],
];
/** Everything comes from the site itself – also enforced in the browser. */
const CSP =
  "default-src 'self'; img-src 'self'; style-src 'self'; font-src 'self'; script-src 'self'; " +
  "base-uri 'none'; form-action 'none'; object-src 'none'";
/** An e-mail address – without the characters that would break a mailto link (? # & % / …). */
const EMAIL = /[^\s@<>()"'?#&%\/\\,;:[\]]+@[^\s@<>()"'?#&%\/\\,;:[\]]+\.[a-z]{2,}/i;
/** Marks a build output folder, so a rebuild only ever deletes its own files. */
const MARKER = '.spicy-night-site';
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

class SiteError extends Error {}

const [command = 'build', ...args] = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (value === undefined || value.startsWith('--')) throw new SiteError(`Die Option --${name} braucht einen Wert.`);
  return value;
};
const fromRoot = (path) => resolve(root, path);
/** Set before a command runs – inside the error handling, so a bad option gives a clear message. */
let paths;
const resolvePaths = () => ({
  out: fromRoot(option('out', 'dist-site')),
  legal: fromRoot(option('legal', 'src/config/legal.json')),
  config: fromRoot(option('config', 'site/site.config.json')),
  store: fromRoot(option('store-config', 'store.config.json')),
});

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const text = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const fill = (template, values) => template.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);
const placeholder = (value) => `<span class="placeholder">${escapeHtml(value)}</span>`;
/** A line of a template address: the parts in square brackets are placeholders. */
const templateLine = (line) => escapeHtml(line).replace(/\[[^\]]+\]/g, (part) => `<span class="placeholder">${part}</span>`);

/** Provider, contact, hosting and links from the two settings files. */
function loadSettings() {
  const legal = readJson(paths.legal);
  const config = readJson(paths.config);
  const providerLines =
    text(legal.providerContact)
      ?.split('\n')
      .map((line) => line.trim())
      .filter(Boolean) ?? null;
  const supportEmail = text(config.supportEmail);
  const email = supportEmail ?? providerLines?.join(' ').match(EMAIL)?.[0] ?? null;
  const hosting = text(config.hosting)?.replace(/\s*\n\s*/g, ', ') ?? null;
  const url = text(config.url)?.replace(/\/+$/, '') ?? null;
  const links = { appStore: text(config.appStoreUrl), googlePlay: text(config.googlePlayUrl) };

  const problems = [];
  for (const [key, value] of [
    ['url', url],
    ['appStoreUrl', links.appStore],
    ['googlePlayUrl', links.googlePlay],
  ]) {
    if (value && !/^https:\/\/[^\s"'<>]+$/.test(value)) {
      problems.push(`site/site.config.json: „${key}“ muss eine Adresse mit https:// sein.`);
    }
  }
  if (supportEmail && !new RegExp(`^${EMAIL.source}$`, 'i').test(supportEmail)) {
    problems.push('site/site.config.json: „supportEmail“ ist keine gültige E-Mail-Adresse.');
  }
  // Without its address the 404 page could not link back (on GitHub Pages the site lives in
  // a subfolder), and language versions, sitemap and store addresses would be missing.
  const missing = [!providerLines && 'provider', !hosting && 'hosting', !email && 'supportEmail', !url && 'url'].filter(
    Boolean,
  );
  return { providerLines, email, hosting, url, links, missing, problems };
}

const inline = (source) =>
  escapeHtml(source)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');

/** The Markdown of the policies and texts: headings, paragraphs, lists, quotes, bold, code, links. */
function markdown(source) {
  const html = [];
  let paragraph = [];
  let list = null;
  let quote = null;
  const flush = () => {
    if (paragraph.length) html.push(`<p>${inline(paragraph.join(' '))}</p>`);
    if (list) html.push(`<ul>\n${list.map((item) => `<li>${inline(item)}</li>`).join('\n')}\n</ul>`);
    if (quote) html.push(`<blockquote>\n${markdown(quote.join('\n'))}\n</blockquote>`);
    paragraph = [];
    list = null;
    quote = null;
  };
  for (const line of source.split('\n')) {
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    const item = /^[-*]\s+(.+)$/.exec(line);
    if (!line.trim()) flush();
    else if (heading) {
      flush();
      html.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`);
    } else if (line.startsWith('>')) {
      if (!quote) flush();
      quote = [...(quote ?? []), line.replace(/^>\s?/, '')];
    } else if (item) {
      if (!list) flush();
      list = [...(list ?? []), item[1]];
    } else if (list && /^\s+\S/.test(line)) list[list.length - 1] += ` ${line.trim()}`;
    else {
      if (list || quote) flush();
      paragraph.push(line.trim());
    }
  }
  flush();
  return html.join('\n');
}

const PROVIDER = 'provider';
const HOSTING = 'hosting';

/** The privacy policy from docs/store, with provider details and hosting filled in. */
function privacyPage(lang, settings) {
  const file = `docs/store/privacy-policy.${lang}.md`;
  let source = readFileSync(fromRoot(file), 'utf8').replace(/\r\n/g, '\n');
  let providerTemplate = null;
  let hostingTemplate = null;
  source = source
    .replace(/<!-- template-note -->[\s\S]*?<!-- \/template-note -->/, '')
    .replace(/<!-- provider -->([\s\S]*?)<!-- \/provider -->/, (_, lines) => {
      providerTemplate = lines
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      return `\n\n${PROVIDER}\n\n`;
    })
    .replace(/<!-- hosting -->([\s\S]*?)<!-- \/hosting -->/, (_, value) => {
      hostingTemplate = value.trim();
      return HOSTING;
    })
    .replace(/<!--[\s\S]*?-->/g, '');
  if (!providerTemplate || !hostingTemplate) {
    throw new SiteError(`${file}: Die Markierungen <!-- provider --> und <!-- hosting --> fehlen.`);
  }
  const address = settings.providerLines
    ? settings.providerLines.map(escapeHtml)
    : providerTemplate.map(templateLine);
  const body = markdown(source)
    // Functions, not strings: a "$&" or "$$" in the provider details must stay as it is.
    .replace(`<p>${PROVIDER}</p>`, () => `<p class="address">${address.join('<br>')}</p>`)
    .replace(HOSTING, () => (settings.hosting ? escapeHtml(settings.hosting) : templateLine(hostingTemplate)));
  const title = /^#\s+(.+)$/m.exec(source)?.[1] ?? 'SPICY NIGHT';
  return { title, body };
}

function mailLink(settings, fallback, className = '') {
  if (!settings.email) return placeholder(fallback);
  const address = escapeHtml(settings.email);
  return `<a${className ? ` class="${className}"` : ''} href="mailto:${address}?subject=SPICY%20NIGHT">${address}</a>`;
}

function homePage(lang, content, settings, store, prefix) {
  const info = store.apple?.info?.[STORE_INFO[lang]];
  if (!info) throw new SiteError(`store.config.json: Texte für ${STORE_INFO[lang]} fehlen.`);
  // The store description: paragraphs, and blocks under a heading in capitals ("FÜNF SPIELMODI").
  const intro = [];
  const cards = [];
  for (const block of info.description.split(/\n{2,}/)) {
    const [first, ...rest] = block
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (!first) continue;
    if (rest.length && first === first.toLocaleUpperCase(lang) && /\p{Lu}/u.test(first)) {
      cards.push({ title: first, items: rest.map((line) => line.replace(/^•\s*/, '')) });
    } else {
      const paragraph = [first, ...rest].join(' ');
      // The age notice is in the footer of every page.
      if (paragraph !== content.ageNotice) intro.push(paragraph);
    }
  }
  const storeLinks = [
    ['appStore', content.home.appStore],
    ['googlePlay', content.home.googlePlay],
  ].filter(([key]) => settings.links[key]);
  const stores = storeLinks.length
    ? `<ul class="stores">\n${storeLinks
        .map(([key, label]) => `<li><a class="button" href="${escapeHtml(settings.links[key])}">${escapeHtml(label)}</a></li>`)
        .join('\n')}\n</ul>`
    : `<p class="soon">${escapeHtml(content.home.storesSoon)}</p>`;
  const shots = content.home.screenshots
    .map(
      ({ file, alt }) =>
        `<li><img src="${prefix}assets/screens/${lang}/${file}.jpg" alt="${escapeHtml(alt)}" width="1080" height="2340" loading="lazy" decoding="async"></li>`,
    )
    .join('\n');
  const body = `<section class="hero">
<img class="icon" src="${prefix}assets/icon.svg" alt="" width="96" height="96">
<h1 class="wordmark"><span class="spicy">SPICY</span> <span class="night">NIGHT</span></h1>
<p class="claim"${lang === 'en' ? '' : ' lang="en"'}>${escapeHtml(CLAIM)}</p>
<p class="subtitle">${escapeHtml(info.subtitle)}</p>
${stores}
</section>
${intro.map((paragraph) => `<p class="intro">${escapeHtml(paragraph)}</p>`).join('\n')}
<section aria-labelledby="screens">
<h2 id="screens">${escapeHtml(content.home.screenshotsTitle)}</h2>
<ul class="shots">
${shots}
</ul>
</section>
<div class="cards">
${cards
  .map(
    (card) =>
      `<section class="card">\n<h2>${escapeHtml(card.title)}</h2>\n<ul>\n${card.items
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join('\n')}\n</ul>\n</section>`,
  )
  .join('\n')}
</div>
<p class="intro">${inline(content.home.help)}</p>`;
  return { title: content.home.title, description: info.promoText, body };
}

function supportPage(content, settings) {
  const support = content.support;
  const body = `<h1>${escapeHtml(support.title)}</h1>
<section class="contact" aria-labelledby="contact">
<h2 id="contact">${escapeHtml(support.contactTitle)}</h2>
<p>${inline(support.contactText)}</p>
<p>${mailLink(settings, support.contactPlaceholder, 'mail')}</p>
</section>
<section class="faq" aria-labelledby="faq">
<h2 id="faq">${escapeHtml(support.faqTitle)}</h2>
${support.faq.map(({ q, a }) => `<h3>${inline(q)}</h3>\n<p>${inline(a)}</p>`).join('\n')}
</section>`;
  return { title: `${support.title} – SPICY NIGHT`, description: support.description, body };
}

function imprintPage(content, settings) {
  const imprint = content.imprint;
  const address = settings.providerLines
    ? settings.providerLines.map(escapeHtml)
    : imprint.providerPlaceholder.map(templateLine);
  const body = `<h1>${escapeHtml(imprint.title)}</h1>
<h2>${escapeHtml(imprint.providerTitle)}</h2>
<p class="address">${address.join('<br>')}</p>
<h2>${escapeHtml(imprint.contactTitle)}</h2>
<p>${mailLink(settings, content.support.contactPlaceholder)}</p>`;
  return { title: `${imprint.title} – SPICY NIGHT`, description: imprint.description, body };
}

function head({ lang, title, description, prefix, settings, alternates = '', scripts = '' }) {
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="referrer" content="no-referrer">
${settings.missing.length ? '<meta name="robots" content="noindex">\n' : ''}<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#07050B">
<link rel="icon" href="${prefix}assets/icon.svg" type="image/svg+xml">
<link rel="icon" href="${prefix}assets/icon-196.png" type="image/png" sizes="196x196">
<link rel="apple-touch-icon" href="${prefix}assets/icon-196.png">
<link rel="stylesheet" href="${prefix}assets/site.css">
${alternates}${scripts}</head>`;
}

/** One page in one language: header with language switch, content, footer with all pages. */
function layout({ lang, content, page, settings, title, description, body }) {
  const depth = PAGES[page] ? 2 : 1;
  const prefix = '../'.repeat(depth);
  const link = (code, target) => `${prefix}${code}/${PAGES[target]}`;
  const alternates = settings.url
    ? `${LANGUAGES.map((code) => `<link rel="alternate" hreflang="${code}" href="${settings.url}/${code}/${PAGES[page]}">`).join('\n')}
<link rel="alternate" hreflang="x-default" href="${settings.url}/">
<link rel="canonical" href="${settings.url}/${lang}/${PAGES[page]}">
`
    : '';
  const draft = settings.missing.length
    ? `<aside class="draft"><p>${escapeHtml(fill(content.draft, { missing: settings.missing.map((key) => content.missing[key]).join(', ') }))}</p></aside>\n`
    : '';
  const languages = LANGUAGES.map((code) => {
    const name = code === lang ? content.languageName : readContent(code).languageName;
    const current = code === lang ? ' aria-current="true"' : '';
    return `<li><a href="${link(code, page)}" hreflang="${code}" lang="${code}"${current}>${escapeHtml(name)}</a></li>`;
  }).join('\n');
  const pages = Object.keys(PAGES)
    .map((target) => {
      const current = target === page ? ' aria-current="page"' : '';
      return `<li><a href="${link(lang, target)}"${current}>${escapeHtml(content.pages[target])}</a></li>`;
    })
    .join('\n');
  return `${head({ lang, title, description, prefix, settings, alternates })}
<body>
<a class="skip" href="#main">${escapeHtml(content.skipLink)}</a>
${draft}<header class="top wrap">
<a class="brand" href="${link(lang, 'home')}"><img src="${prefix}assets/icon.svg" alt="" width="32" height="32"><span>SPICY NIGHT</span></a>
<nav class="languages" aria-label="${escapeHtml(content.languagesLabel)}">
<ul>
${languages}
</ul>
</nav>
</header>
<main id="main" class="wrap">
${body}
</main>
<footer class="bottom wrap">
<nav class="links" aria-label="${escapeHtml(content.navLabel)}">
<ul>
${pages}
</ul>
</nav>
<p>${escapeHtml(content.ageNotice)}</p>
</footer>
</body>
</html>
`;
}

const contentCache = new Map();
function readContent(lang) {
  if (!contentCache.has(lang)) contentCache.set(lang, readJson(fromRoot(`site/content/${lang}.json`)));
  return contentCache.get(lang);
}

/** The root address: opens the visitor's language, or offers all three without JavaScript. */
function rootPage(settings) {
  const choices = LANGUAGES.map(
    (code) =>
      `<li><a class="button" href="${code}/" hreflang="${code}" lang="${code}">${escapeHtml(readContent(code).languageName)}</a></li>`,
  ).join('\n');
  return `${head({
    lang: 'en',
    title: 'SPICY NIGHT',
    description: readContent('en').support.description,
    prefix: '',
    settings,
    scripts: '<script src="assets/language.js"></script>\n',
  })}
<body>
<main id="main" class="wrap hero">
<img class="icon" src="assets/icon.svg" alt="" width="96" height="96">
<h1 class="wordmark"><span class="spicy">SPICY</span> <span class="night">NIGHT</span></h1>
<p class="claim">${escapeHtml(CLAIM)}</p>
<ul class="choose">
${choices}
</ul>
</main>
</body>
</html>
`;
}

/**
 * GitHub Pages and most hosts show this for any unknown address – at any depth, so it uses
 * no files of its own: links are absolute when the site address is known.
 */
function notFoundPage(settings) {
  const base = settings.url ?? '';
  const parts = LANGUAGES.map((code) => {
    const { notFound } = readContent(code);
    return `<section lang="${code}">\n<h2>${escapeHtml(notFound.title)}</h2>\n<p>${escapeHtml(notFound.text)} <a href="${base}/${code}/">${escapeHtml(notFound.back)}</a></p>\n</section>`;
  }).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<meta name="robots" content="noindex">
<title>SPICY NIGHT – 404</title>
<style>
body { margin: 0; padding: 48px 16px; background: #07050b; color: #f7f2ff; font: 500 1.0625rem/1.6 system-ui, sans-serif; }
main { max-width: 640px; margin: 0 auto; }
h1 { font-size: 2rem; letter-spacing: 0.12em; }
h1 span { color: #ff3d9a; }
h2 { font-size: 1.25rem; margin-bottom: 4px; }
a { color: #d4a8ff; }
a:focus-visible { outline: 3px solid #ff3d9a; outline-offset: 3px; }
</style>
</head>
<body>
<main>
<h1>SPICY <span>NIGHT</span></h1>
${parts}
</main>
</body>
</html>
`;
}

function write(path, contents) {
  const file = join(paths.out, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, contents);
}

function copy(source, target) {
  if (!existsSync(source)) throw new SiteError(`Datei fehlt: ${source} – vorher npm install ausführen?`);
  const file = join(paths.out, target);
  mkdirSync(dirname(file), { recursive: true });
  copyFileSync(source, file);
}

/** Deletes the previous build – but never a folder this script did not create. */
function cleanOutput() {
  const out = paths.out;
  if (out === root || root.startsWith(out + sep)) throw new SiteError(`Ungültiger Zielordner: ${out}`);
  if (existsSync(out)) {
    if (!existsSync(join(out, MARKER)) && readdirSync(out).length > 0) {
      throw new SiteError(`${out} ist nicht leer und stammt nicht vom Website-Build – bitte einen anderen Ordner wählen.`);
    }
    rmSync(out, { recursive: true, force: true });
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, MARKER), '');
}

const MISSING_TEXT = {
  provider: 'src/config/legal.json: „providerContact“ (Anbieterdaten) eintragen',
  hosting: 'site/site.config.json: „hosting“ (Name und Anschrift des Hosting-Anbieters) eintragen',
  supportEmail: 'site/site.config.json: „supportEmail“ eintragen (oder eine E-Mail-Adresse in „providerContact“)',
  url: 'site/site.config.json: „url“ eintragen – die Adresse der Website, z. B. https://<name>.github.io/<repository> oder die eigene Domain',
};

function build({ release }) {
  const settings = loadSettings();
  if (settings.problems.length) throw new SiteError(settings.problems.join('\n'));
  if (release && settings.missing.length) {
    throw new SiteError(
      `Die Website ist noch eine Vorlage – so nicht veröffentlichen:\n${settings.missing
        .map((key) => `✗ ${MISSING_TEXT[key]}`)
        .join('\n')}`,
    );
  }
  const store = readJson(paths.store);
  cleanOutput();

  copy(fromRoot('site/site.css'), 'assets/site.css');
  copy(fromRoot('site/language.js'), 'assets/language.js');
  copy(fromRoot('assets/brand/icon.svg'), 'assets/icon.svg');
  copy(fromRoot('assets/images/favicon.png'), 'assets/icon-196.png');
  for (const [source, target] of FONTS) copy(fromRoot(`node_modules/${source}`), `assets/fonts/${target}`);

  const pages = [];
  for (const lang of LANGUAGES) {
    const content = readContent(lang);
    for (const { file } of content.home.screenshots) {
      copy(fromRoot(`${SCREENSHOTS}/${lang}/${file}.jpg`), `assets/screens/${lang}/${file}.jpg`);
    }
    const privacy = privacyPage(lang, settings);
    const variants = {
      home: homePage(lang, content, settings, store, '../'),
      support: supportPage(content, settings),
      privacy: { ...privacy, description: content.privacy.description },
      imprint: imprintPage(content, settings),
    };
    for (const [page, variant] of Object.entries(variants)) {
      const path = `${lang}/${PAGES[page]}index.html`;
      write(path, layout({ lang, content, page, settings, ...variant }));
      pages.push(`${lang}/${PAGES[page]}`);
    }
  }
  write('index.html', rootPage(settings));
  write('404.html', notFoundPage(settings));
  write('.nojekyll', '');
  const draft = settings.missing.length > 0;
  write(
    'robots.txt',
    draft
      ? 'User-agent: *\nDisallow: /\n'
      : `User-agent: *\nAllow: /\n${settings.url ? `Sitemap: ${settings.url}/sitemap.xml\n` : ''}`,
  );
  if (settings.url) {
    write(
      'sitemap.xml',
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
        .map((page) => `<url><loc>${settings.url}/${page}</loc></url>`)
        .join('\n')}\n</urlset>\n`,
    );
  }
  return { settings, pages };
}

function report({ settings, pages }) {
  console.log(`Website gebaut: ${paths.out} (${pages.length} Seiten in ${LANGUAGES.length} Sprachen)`);
  if (settings.missing.length) {
    console.log('\n⚠ Vorlage – die Seiten zeigen einen Hinweis und werden nicht veröffentlicht, bis Folgendes eingetragen ist:');
    for (const key of settings.missing) console.log(`  ✗ ${MISSING_TEXT[key]}`);
  }
  if (settings.url) {
    console.log(`\nAdressen für die Stores (npm run site:store-urls trägt sie in store.config.json ein):`);
    for (const lang of LANGUAGES) {
      console.log(`  ${lang}: Datenschutz ${settings.url}/${lang}/privacy/ · Support ${settings.url}/${lang}/support/`);
    }
  }
}

function storeUrls() {
  const settings = loadSettings();
  if (settings.problems.length) throw new SiteError(settings.problems.join('\n'));
  if (!settings.url) throw new SiteError('site/site.config.json: „url“ fehlt – zuerst die Adresse der veröffentlichten Website eintragen.');
  const store = readJson(paths.store);
  for (const [locale, info] of Object.entries(store.apple?.info ?? {})) {
    const lang = locale.slice(0, 2);
    if (!LANGUAGES.includes(lang)) continue;
    info.marketingUrl = `${settings.url}/${lang}/`;
    info.supportUrl = `${settings.url}/${lang}/support/`;
    info.privacyPolicyUrl = `${settings.url}/${lang}/privacy/`;
  }
  writeFileSync(paths.store, `${JSON.stringify(store, null, 2)}\n`);
  console.log(`store.config.json: Website-, Support- und Datenschutz-Adressen für ${Object.keys(store.apple?.info ?? {}).join(', ')} eingetragen.`);
  console.log(`\nGoogle Play Console (eine Adresse für alle Sprachen):`);
  console.log(`  App-Inhalte → Datenschutzerklärung: ${settings.url}/en/privacy/`);
  console.log(`  Store-Eintrag → Website: ${settings.url}/en/`);
  if (settings.email) console.log(`  Store-Eintrag → E-Mail-Adresse: ${settings.email}`);
}

function preview() {
  report(build({ release: false }));
  const port = Number(option('port', 4173));
  const out = paths.out;
  createServer((request, response) => {
    let path;
    try {
      path = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    } catch {
      response.writeHead(400).end();
      return;
    }
    let file = resolve(join(out, path));
    if (file !== out && !file.startsWith(out + sep)) {
      response.writeHead(403).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) {
      if (!path.endsWith('/')) {
        response.writeHead(301, { Location: `${path}/` }).end();
        return;
      }
      file = join(file, 'index.html');
    }
    const found = existsSync(file) && statSync(file).isFile();
    const type = found ? (TYPES[extname(file)] ?? 'application/octet-stream') : TYPES['.html'];
    response.writeHead(found ? 200 : 404, { 'Content-Type': type });
    createReadStream(found ? file : join(out, '404.html')).pipe(response);
  }).listen(port, '127.0.0.1', () => console.log(`\nVorschau: http://localhost:${port}/ – beenden mit Strg+C`));
}

try {
  paths = resolvePaths();
  if (command === 'build') report(build({ release: args.includes('--release') }));
  else if (command === 'preview') preview();
  else if (command === 'store-urls') storeUrls();
  else throw new SiteError(`Unbekannter Befehl „${command}“ – build, preview oder store-urls.`);
} catch (error) {
  if (!(error instanceof SiteError)) throw error;
  console.error(error.message);
  process.exit(1);
}
