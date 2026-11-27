# Website

Quellen der SPICY-NIGHT-Website (Start, Hilfe & Kontakt, Datenschutz, Impressum – Deutsch,
Englisch, Spanisch). Gebaut wird sie mit `npm run site:build` nach `dist-site/`; Ablauf und
Veröffentlichung stehen im [README](../README.md#website-datenschutz--support).

| Datei | Inhalt |
| --- | --- |
| `site.config.json` | **Vor dem Veröffentlichen ausfüllen:** `url` (Adresse der Website, z. B. `https://spicynight.de`), `hosting` (Name und Anschrift des Hosting-Anbieters), optional `supportEmail`, `appStoreUrl`, `googlePlayUrl` |
| `content/<sprache>.json` | Texte der Seiten: Navigation, Startseite, häufige Fragen, Impressum, 404 |
| `site.css` | Stylesheet im Look der App (Schriften liegen bei, nichts von fremden Servern) |
| `language.js` | Weiterleitung von der Wurzeladresse in die Sprache des Browsers |

Weitere Quellen: die App-Beschreibung aus `store.config.json`, die Datenschutzerklärungen aus
`docs/store/privacy-policy.<sprache>.md` (die Markierungen `<!-- provider -->` und
`<!-- hosting -->` dort nicht entfernen) und die Anbieterdaten aus `src/config/legal.json`, die
auch die App verwendet.
