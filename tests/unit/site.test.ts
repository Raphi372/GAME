/**
 * The website build (scripts/site.mjs): pages, links, privacy, draft and release mode, store
 * addresses. Every test builds into its own temporary folder – the repository stays untouched.
 */
import { de } from '@/i18n/de';
import { en } from '@/i18n/en';
import { es } from '@/i18n/es';

/*
 * Node's modules come in through small local types, like in store-listing.test.ts – the
 * project's type check stays without global Node types.
 */
declare const __dirname: string;
interface FileSystem {
  existsSync(path: string): boolean;
  mkdirSync(path: string): void;
  mkdtempSync(prefix: string): string;
  readdirSync(path: string): string[];
  readFileSync(path: string): Uint8Array;
  readFileSync(path: string, encoding: 'utf8'): string;
  rmSync(path: string, options: { recursive: boolean; force: boolean }): void;
  statSync(path: string): { isDirectory(): boolean };
  writeFileSync(path: string, data: string | Uint8Array): void;
}
interface ChildProcess {
  spawnSync(
    command: string,
    args: string[],
    options: { cwd: string; encoding: 'utf8' },
  ): { status: number | null; stdout: string; stderr: string };
}
interface Path {
  dirname(path: string): string;
  join(...parts: string[]): string;
  resolve(...parts: string[]): string;
}
const { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } =
  jest.requireActual<FileSystem>('fs');
const { spawnSync } = jest.requireActual<ChildProcess>('child_process');
const { tmpdir } = jest.requireActual<{ tmpdir(): string }>('os');
const { dirname, join, resolve } = jest.requireActual<Path>('path');
const { execPath } = jest.requireActual<{ execPath: string }>('process');

const ROOT = resolve(__dirname, '../..');
const SCRIPT = join(ROOT, 'scripts/site.mjs');
const LANGUAGES = ['de', 'en', 'es'] as const;
const PAGES = ['', 'support/', 'privacy/', 'imprint/'];

const LEGAL = { providerContact: 'Beispiel GmbH\nBeispielweg 1\n12345 Beispielstadt\nDeutschland\nhallo@example.com' };
const CONFIG = {
  url: 'https://spicynight.example/',
  supportEmail: null,
  hosting: 'Beispiel-Hosting AG, Serverstraße 2, 54321 Hoststadt',
  appStoreUrl: 'https://apps.apple.com/app/id1234567890',
  googlePlayUrl: null,
};

let work: string;
beforeAll(() => {
  work = mkdtempSync(join(tmpdir(), 'spicy-night-site-'));
});
afterAll(() => rmSync(work, { recursive: true, force: true }));

function writeJson(name: string, value: unknown): string {
  const file = join(work, name);
  writeFileSync(file, JSON.stringify(value));
  return file;
}

function run(args: string[]) {
  return spawnSync(execPath, [SCRIPT, ...args], { cwd: ROOT, encoding: 'utf8' });
}

interface BuildOptions {
  legal?: object;
  config?: object;
  release?: boolean;
}

function build(name: string, { legal, config, release = false }: BuildOptions = {}) {
  const out = join(work, name);
  const args = ['build', '--out', out];
  if (legal) args.push('--legal', writeJson(`${name}-legal.json`, legal));
  if (config) args.push('--config', writeJson(`${name}-config.json`, config));
  if (release) args.push('--release');
  return { out, result: run(args) };
}

const read = (out: string, path: string) => readFileSync(join(out, path), 'utf8');

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return entry.endsWith('.html') ? [path] : [];
  });
}

/** Visible text of the main content, without tags. */
const mainText = (html: string) =>
  (/<main[^>]*>([\s\S]*?)<\/main>/.exec(html)?.[1] ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('website build', () => {
  let draft: string;
  let release: string;

  beforeAll(() => {
    const draftBuild = build('draft');
    expect(draftBuild.result.status).toBe(0);
    draft = draftBuild.out;
    const releaseBuild = build('release', { legal: LEGAL, config: CONFIG, release: true });
    expect(releaseBuild.result.stderr).toBe('');
    expect(releaseBuild.result.status).toBe(0);
    release = releaseBuild.out;
  });

  it('builds the four pages in every language, the language choice and a 404 page', () => {
    for (const lang of LANGUAGES) {
      for (const page of PAGES) {
        const html = read(draft, `${lang}/${page}index.html`);
        expect(html).toContain(`<html lang="${lang}">`);
        expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
        expect(html).toMatch(/<title>[^<]+<\/title>/);
        expect(html).toMatch(/<meta name="description" content="[^"]{20,}">/);
        expect(html).toContain('<a class="skip" href="#main">');
        expect(html).toContain('<main id="main"');
        expect(html).toContain('http-equiv="Content-Security-Policy"');
      }
    }
    expect(read(draft, 'index.html')).toContain('<script src="assets/language.js"></script>');
    expect(read(draft, '404.html')).toContain('Page not found');
  });

  it('loads nothing from other servers and every link points to an existing file', () => {
    for (const file of htmlFiles(draft)) {
      const html = readFileSync(file, 'utf8');
      expect(html).not.toMatch(/\ssrc="(https?:)?\/\//);
      for (const [, attribute = '', target = ''] of html.matchAll(/\s(href|src)="([^"]+)"/g)) {
        if (/^(mailto:|#)/.test(target) || (attribute === 'href' && /^https:\/\//.test(target))) continue;
        if (file.endsWith('404.html')) continue; // links from the site root, wherever it is served
        const path = resolve(dirname(file), target.split(/[?#]/)[0]!);
        const resolved = existsSync(path) && statSync(path).isDirectory() ? join(path, 'index.html') : path;
        expect({ file, target, exists: existsSync(resolved) }).toEqual({ file, target, exists: true });
      }
    }
    const css = read(draft, 'assets/site.css');
    expect(css).not.toMatch(/url\(['"]?(https?:)?\/\//);
    for (const [, font] of css.matchAll(/url\('([^']+)'\)/g)) expect(existsSync(join(draft, 'assets', font!))).toBe(true);
    // Fonts are served with their licence.
    expect(existsSync(join(draft, 'assets/fonts/OFL-Unbounded.txt'))).toBe(true);
    expect(existsSync(join(draft, 'assets/fonts/OFL-Manrope.txt'))).toBe(true);
  });

  it('keeps the page when switching the language', () => {
    const html = read(draft, 'de/privacy/index.html');
    expect(html).toContain('<a href="../../en/privacy/" hreflang="en" lang="en">English</a>');
    expect(html).toContain('<a href="../../es/privacy/" hreflang="es" lang="es">Español</a>');
    expect(html).toContain('<a href="../../de/privacy/" aria-current="page">Datenschutz</a>');
  });

  it('marks a build without provider details as a draft that search engines skip', () => {
    for (const lang of LANGUAGES) {
      const html = read(draft, `${lang}/privacy/index.html`);
      expect(html).toContain('<aside class="draft">');
      expect(html).toContain('<meta name="robots" content="noindex">');
      expect(html).toContain('<span class="placeholder">');
    }
    expect(read(draft, 'de/index.html')).toContain('Es fehlt noch: Anbieterdaten (src/config/legal.json)');
    expect(read(draft, 'robots.txt')).toContain('Disallow: /');
    expect(existsSync(join(draft, 'sitemap.xml'))).toBe(false);
  });

  it('turns the privacy policies into pages without the template note', () => {
    const html = read(release, 'de/privacy/index.html');
    expect(html).toContain('<h1>Datenschutzerklärung – SPICY NIGHT</h1>');
    expect(html).toContain('<h2>Diese Website</h2>');
    expect(html).toContain('<li>die Namen, die du für die Mitspieler eingibst,</li>');
    expect(html).toContain('<strong>Einstellungen → Daten</strong>');
    expect(html).not.toContain('Vorlage.');
    expect(html).not.toContain('<!--');
    expect(read(release, 'en/privacy/index.html')).toContain('<h2>This website</h2>');
    expect(read(release, 'es/privacy/index.html')).toContain('<h2>Este sitio web</h2>');
  });

  it('fills in provider, hosting and contact – nothing is left to fill in', () => {
    for (const lang of LANGUAGES) {
      for (const page of PAGES) {
        const html = read(release, `${lang}/${page}index.html`);
        expect(html).not.toContain('class="draft"');
        expect(html).not.toContain('noindex');
        expect(html).not.toContain('placeholder');
        expect(mainText(html)).not.toMatch(/\[[^\]]+\]/);
      }
      const address = '<p class="address">Beispiel GmbH<br>Beispielweg 1<br>12345 Beispielstadt<br>Deutschland<br>hallo@example.com</p>';
      expect(read(release, `${lang}/privacy/index.html`)).toContain(address);
      expect(read(release, `${lang}/imprint/index.html`)).toContain(address);
      expect(read(release, `${lang}/privacy/index.html`)).toContain(CONFIG.hosting);
      // Without its own support address the e-mail from the provider details is used.
      expect(read(release, `${lang}/support/index.html`)).toContain(
        '<a class="mail" href="mailto:hallo@example.com?subject=SPICY%20NIGHT">hallo@example.com</a>',
      );
    }
  });

  it('knows its address once it is set: language versions, sitemap, robots', () => {
    const html = read(release, 'en/support/index.html');
    expect(html).toContain('<link rel="alternate" hreflang="de" href="https://spicynight.example/de/support/">');
    expect(html).toContain('<link rel="canonical" href="https://spicynight.example/en/support/">');
    expect(read(release, 'sitemap.xml').match(/<loc>/g)).toHaveLength(12);
    expect(read(release, 'robots.txt')).toContain('Sitemap: https://spicynight.example/sitemap.xml');
    expect(read(release, '404.html')).toContain('href="https://spicynight.example/de/"');
  });

  it('shows the app with the store description and links only to stores that are set', () => {
    const store = JSON.parse(readFileSync(join(ROOT, 'store.config.json'), 'utf8'));
    const html = read(release, 'de/index.html');
    expect(html).toContain('<h1 class="wordmark"><span class="spicy">SPICY</span> <span class="night">NIGHT</span></h1>');
    expect(html).toContain(`<p class="subtitle">${store.apple.info['de-DE'].subtitle}</p>`);
    expect(html).toContain('<h2>FÜNF SPIELMODI</h2>');
    expect(html).toContain('<li>Kein Alkohol nötig – getrunken wird nicht</li>');
    expect(html).toContain(`<meta name="description" content="${store.apple.info['de-DE'].promoText}">`);
    expect(html).toContain('<a class="button" href="https://apps.apple.com/app/id1234567890">Im App Store</a>');
    expect(html).not.toContain('Google Play</a>');
    expect(read(draft, 'de/index.html')).toContain('<p class="soon">Bald im App Store und bei Google Play.</p>');
    // The age notice of the description is in the footer of every page – once.
    expect(html.match(/ab 18 Jahren/g)).toHaveLength(1);
    for (const lang of LANGUAGES) {
      for (const [, src] of read(release, `${lang}/index.html`).matchAll(/<img src="\.\.\/(assets\/screens\/[^"]+)"/g)) {
        expect(existsSync(join(release, src!))).toBe(true);
      }
    }
  });

  it('refuses to publish a draft', () => {
    const { out, result } = build('refused', { release: true });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('src/config/legal.json: „providerContact“');
    expect(result.stderr).toContain('site/site.config.json: „hosting“');
    expect(result.stderr).toContain('„supportEmail“');
    expect(result.stderr).toContain('„url“');
    expect(existsSync(out)).toBe(false);
  });

  it('needs the address of the website before it may be published', () => {
    // Without it the 404 page could not link back – on GitHub Pages the site lives in a subfolder.
    const { result } = build('no-address', { legal: LEGAL, config: { ...CONFIG, url: null }, release: true });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('site/site.config.json: „url“ eintragen');
    expect(result.stderr).not.toContain('providerContact');
  });

  it('keeps dollar signs in the provider details and the hosting as they are', () => {
    const { out, result } = build('dollars', {
      legal: { providerContact: "Spiel $& Spaß GmbH\nWeg $' 1\nhallo@example.com" },
      config: { ...CONFIG, hosting: 'Host $$ AG' },
      release: true,
    });
    expect(result.status).toBe(0);
    const html = read(out, 'de/privacy/index.html');
    expect(html).toContain('<p class="address">Spiel $&amp; Spaß GmbH<br>Weg $&#39; 1<br>hallo@example.com</p>');
    expect(html).toContain('Diese Website wird bei Host $$ AG gehostet.');
  });

  it('explains an option without a value instead of crashing', () => {
    const result = run(['build', '--out']);
    expect(result.status).toBe(1);
    expect(result.stderr.trim()).toBe('Die Option --out braucht einen Wert.');
  });

  it('rejects store links and addresses without https', () => {
    const { result } = build('insecure', { config: { ...CONFIG, googlePlayUrl: 'http://play.example/app' } });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('„googlePlayUrl“ muss eine Adresse mit https:// sein');
  });

  it('rejects a contact address that would break the mail link', () => {
    const { result } = build('bad-mail', { config: { ...CONFIG, supportEmail: 'hilfe#app@example.com' } });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('„supportEmail“ ist keine gültige E-Mail-Adresse');
  });

  it('never deletes a folder it did not create', () => {
    const out = join(work, 'foreign');
    mkdirSync(out);
    writeFileSync(join(out, 'keep.txt'), 'mine');
    const result = run(['build', '--out', out]);
    expect(result.status).toBe(1);
    expect(readFileSync(join(out, 'keep.txt'), 'utf8')).toBe('mine');
  });
});

describe('store addresses', () => {
  const storeCopy = () => {
    const file = join(work, `store-${Math.random().toString(36).slice(2)}.json`);
    writeFileSync(file, readFileSync(join(ROOT, 'store.config.json')));
    return file;
  };

  it('writes the website, support and privacy address of every store language', () => {
    const file = storeCopy();
    const before = JSON.parse(readFileSync(file, 'utf8'));
    const result = run(['store-urls', '--config', writeJson('urls-config.json', CONFIG), '--store-config', file]);
    expect(result.status).toBe(0);
    const after = JSON.parse(readFileSync(file, 'utf8'));
    for (const [locale, lang] of [
      ['de-DE', 'de'],
      ['en-US', 'en'],
      ['es-ES', 'es'],
      ['es-MX', 'es'],
    ] as const) {
      expect(after.apple.info[locale]).toEqual({
        ...before.apple.info[locale],
        marketingUrl: `https://spicynight.example/${lang}/`,
        supportUrl: `https://spicynight.example/${lang}/support/`,
        privacyPolicyUrl: `https://spicynight.example/${lang}/privacy/`,
      });
    }
    expect(result.stdout).toContain('Datenschutzerklärung: https://spicynight.example/en/privacy/');
  });

  it('needs the address of the website first', () => {
    const file = storeCopy();
    const result = run(['store-urls', '--config', writeJson('no-url.json', { ...CONFIG, url: null }), '--store-config', file]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('„url“ fehlt');
    expect(readFileSync(file, 'utf8')).toBe(readFileSync(join(ROOT, 'store.config.json'), 'utf8'));
  });
});

describe('website and app', () => {
  const DICTIONARIES: Record<(typeof LANGUAGES)[number], Record<string, string>> = { de, en, es };
  /** Every way into the settings named in bold, e.g. **Einstellungen → Daten**, split into its steps. */
  const settingsPaths = (source: string) =>
    [...source.matchAll(/\*\*([^*\n]*→[^*\n]*)\*\*/g)].map((match) => (match[1] ?? '').split(' → '));

  it.each(LANGUAGES)('name the settings exactly like the app does (%s)', (language) => {
    const dictionary = DICTIONARIES[language];
    const labels = Object.values(dictionary);
    const help = readFileSync(join(ROOT, `site/content/${language}.json`), 'utf8');
    const privacy = readFileSync(join(ROOT, `docs/store/privacy-policy.${language}.md`), 'utf8');

    const paths = [...settingsPaths(help), ...settingsPaths(privacy)];
    expect(paths.length).toBeGreaterThan(3);
    for (const [settings, ...steps] of paths) {
      expect(settings).toBe(dictionary['settings.title']);
      for (const step of steps) expect(labels).toContain(step);
    }
    // The help page and both privacy texts point to "Send feedback" by its name in the app.
    expect(help).toContain(`**${dictionary['settings.title']} → ${dictionary['settings.feedback']}**`);
    expect(privacy).toContain(dictionary['settings.feedback']);
    expect(dictionary['privacy.sharing.body']).toContain(dictionary['settings.feedback']);
  });
});
