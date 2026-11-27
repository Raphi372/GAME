# Store-Vorbereitung: App Store und Google Play

Alles, was SPICY NIGHT für die Einreichung braucht – außer Käufen. Was nur du festlegen
kannst (Anbieterdaten, Konten, URLs), ist unten als Checkliste markiert und steht bewusst
nicht im Repository. Den kompletten Ablauf bis zur Einreichung fasst
[`../RELEASE.md`](../RELEASE.md) zusammen; `npm run release:check` zeigt, was noch fehlt.

## Was liegt wo?

| Datei | Inhalt |
| --- | --- |
| [`../../store.config.json`](../../store.config.json) | App-Store-Texte für EAS Metadata (Deutsch, Englisch, Spanisch für Spanien und Mexiko): Name, Untertitel, Werbetext, Beschreibung, Keywords, Kategorien |
| [`google-play/<sprache>/`](google-play/) | Google-Play-Texte (`de-DE`, `en-US`, `es-ES`, `es-419`): `title.txt`, `short_description.txt`, `full_description.txt` |
| [`google-play/icon-512.png`](google-play/icon-512.png) | Play-Store-Symbol, 512 × 512 PNG mit Alphakanal |
| [`google-play/feature-graphic.jpg`](google-play/feature-graphic.jpg) | Play-Store-Vorstellungsgrafik, 1024 × 500 JPEG |
| [`screenshots/ios-6.9/`](screenshots/ios-6.9/) | iPhone 6,9″, 1320 × 2868 (deckt alle iPhone-Größen ab) |
| [`screenshots/ipad-13/`](screenshots/ipad-13/) | iPad 13″, 2064 × 2752 (Pflicht, weil die App auf dem iPad läuft) |
| [`screenshots/android-phone/`](screenshots/android-phone/) | Android-Smartphone, 1080 × 2340 |
| [`questionnaires.md`](questionnaires.md) | Antworten für App-Datenschutz, Data safety, Altersfreigabe, IARC und App-Inhalte |
| [`review-notes.md`](review-notes.md) | Hinweise für das App-Review (EN zum Einfügen, DE zum Nachlesen) |
| [`privacy-policy.de.md`](privacy-policy.de.md), [`privacy-policy.en.md`](privacy-policy.en.md), [`privacy-policy.es.md`](privacy-policy.es.md) | Datenschutzerklärung – daraus entsteht die Datenschutz-Seite der Website (`npm run site:build`, siehe [README → Website](../../README.md#website-datenschutz--support)) |

Spanisch ist neutral formuliert (mit „tú“, ohne „vosotros“ und „ustedes“) und funktioniert
in Spanien wie in Lateinamerika – deshalb stehen für Spanien und Lateinamerika dieselben Texte
in den Stores (ein Test achtet darauf, dass sie gleich bleiben).

Jede Screenshot-Reihe gibt es auf Deutsch (`de/`), Englisch (`en/`) und Spanisch (`es/`), je sechs Bilder:
Startseite, Level-Auswahl, Spicy Questions, Wahrheit oder Pflicht, Ich hab noch nie und
Random Challenges. `tests/unit/store-listing.test.ts` prüft Textlängen, Keyword-Limit,
verbotene Begriffe, Bildgrößen und dass Zahlen wie „1560 Karten“ zur App passen.

## Checkliste vor der ersten Einreichung

### Entscheidungen und Daten, die nur du liefern kannst

- [ ] **Bundle-ID / Paketname** festlegen. Aktuell steht in `app.json` der Platzhalter
      `com.spicynight.app` (iOS und Android). Nach dem ersten Upload ist er endgültig –
      am besten eine eigene Domain rückwärts verwenden, z. B. `de.deinefirma.spicynight`.
- [ ] **Anbieterdaten** in [`src/config/legal.json`](../../src/config/legal.json) eintragen
      (`providerContact`). Solange dort `null` steht, zeigen der Datenschutz-Bildschirm und
      die Website einen sichtbaren Vorlagen-Hinweis – so darf die App nicht eingereicht werden.
- [ ] **Datenschutzerklärung und Impressum** rechtlich prüfen und über die Website
      veröffentlichen: [`site/site.config.json`](../../site/site.config.json) ausfüllen
      (Adresse, Hosting-Anbieter), dann GitHub Pages oder eigener Webhoster – siehe
      [README → Website](../../README.md#website-datenschutz--support). Beide Stores
      verlangen die Datenschutz-URL.
- [ ] **Support-URL** (Apple: Pflicht) – die Seite „Hilfe & Kontakt“ der Website
      (`/<sprache>/support/`). Google Play verlangt im Store-Eintrag außerdem eine
      Kontakt-E-Mail-Adresse.
- [ ] **App-Name prüfen:** „SPICY NIGHT“ muss im App Store noch frei sein. Ist er vergeben,
      Namen in `store.config.json` (`title`) und `app.json` anpassen.

### Konten und Projekt

- [ ] Apple Developer Program und Google Play Developer-Konto (beide kostenpflichtig).
- [ ] Expo-Konto, dann einmalig `npx eas-cli@latest init` – trägt die Projekt-ID in
      `app.json` ein.
- [ ] Neue private Google-Play-Konten müssen vor dem ersten Produktions-Release einen
      geschlossenen Test mit einer Mindestzahl an Testern über mehrere Tage durchführen.
      Die aktuellen Vorgaben stehen in der Play Console.

### Builds

```bash
npm run build:ios       # Produktions-Build für den App Store
npm run build:android   # Produktions-Build (AAB) für Google Play
```

Signierschlüssel und Zertifikate verwaltet EAS beim ersten Build. Die Build-Nummern zählt
EAS selbst hoch (`appVersionSource: remote`, `autoIncrement`); die Versionsnummer für Nutzer
steht in `app.json` (`version`).

### App Store (App Store Connect)

1. App in App Store Connect anlegen (Bundle-ID wie in `app.json`, Hauptsprache Deutsch) und
   die Sprachen Englisch (USA), Spanisch (Spanien) und Spanisch (Mexiko) hinzufügen – über
   Spanisch (Mexiko) erscheint der Eintrag in den lateinamerikanischen App Stores. Die
   Sprachen der App selbst (Deutsch, Englisch, Spanisch) stehen im Build
   (`CFBundleLocalizations` über `expo-localization` in `app.json`) und erscheinen im App Store
   automatisch.
2. In `store.config.json` unter `apple` ergänzen: `copyright` (z. B. `"2026 Deine Firma"`);
   die Felder `marketingUrl`, `supportUrl` und `privacyPolicyUrl` je Sprache trägt
   `npm run site:store-urls` aus der Website-Adresse ein. Bis dahin meldet
   `npx eas-cli@latest metadata:lint` genau diese fehlende `privacyPolicyUrl` – sonst ist die
   Datei fehlerfrei.
3. Texte hochladen: `npm run store:metadata` (EAS Metadata – lädt Texte und Kategorien,
   aber keine Screenshots).
4. Screenshots aus `screenshots/ios-6.9/<sprache>/` und `screenshots/ipad-13/<sprache>/`
   in der jeweiligen Sprache hochladen (`es/` für Spanien und Mexiko).
5. **App-Datenschutz** und **Altersfreigabe (18+)** nach [`questionnaires.md`](questionnaires.md)
   ausfüllen.
6. Unter „App Review Information“ den englischen Text aus [`review-notes.md`](review-notes.md)
   einfügen und eigene Kontaktdaten angeben; „Anmeldung erforderlich“ ausschalten.
7. Build hochladen (`npm run submit:ios`), in der Version auswählen und zur Prüfung einreichen.

Falls Apple nach dem Upload einen fehlenden Eintrag im Privacy Manifest meldet
(„Missing API declaration“), die genannten Gründe unter `ios.privacyManifests` in `app.json`
ergänzen und neu bauen.

### Google Play (Play Console)

1. App in der Play Console anlegen (Standardsprache Deutsch; Englisch (USA), Spanisch
   (Spanien) und Spanisch (Lateinamerika) als Übersetzungen).
2. **Store-Eintrag:** Texte aus `google-play/de-DE/`, `google-play/en-US/`, `google-play/es-ES/`
   und `google-play/es-419/`, dazu `icon-512.png`, `feature-graphic.jpg` und die Bilder aus
   `screenshots/android-phone/<sprache>/` (`es/` für beide spanischen Einträge).
   Kategorie: Spiele → Karten (oder Gelegenheitsspiele). Website, Kontakt-E-Mail und die
   Datenschutz-URL (eine für alle Sprachen) nennt `npm run site:store-urls`.
3. **App-Inhalte, Data safety und IARC** nach [`questionnaires.md`](questionnaires.md) –
   Zielgruppe nur „18 und älter“.
4. Den **ersten** Android-Build nimmt Google nur über die Play Console an (AAB von der
   EAS-Build-Seite herunterladen). Danach geht es per `npm run submit:android`; dafür einen
   Dienstkonto-Schlüssel anlegen (Dateiname mit `service-account` – wird von Git ignoriert).
   `eas.json` lädt Builds als Entwurf in den internen Test-Track; in die Produktion gibst
   du sie in der Play Console frei.

## Premium in der Store-Version

Solange es keine echten Käufe gibt, sind die Premium-Vorschau und „Eigene Karten“
ausgeblendet ([`src/config/features.ts`](../../src/config/features.ts), `FEATURES.premium =
false`). Apple lehnt Apps mit Funktionen, die man nicht freischalten kann, und Platzhalter-
Inhalten häufig ab (Richtlinie 2.1). Startseite und Level-Auswahl zeigen deshalb keine
Verweise darauf, und Deep Links auf `/premium` oder `/custom-cards` führen zur Startseite.

Kommen Käufe dazu, werden `FEATURES.premium` und `PURCHASES_ENABLED` gemeinsam eingeschaltet
(ein Test achtet darauf). Dann vorher prüfen:

- Die Vorschau nennt „Werbefreies Spielerlebnis“, obwohl die App keine Werbung enthält –
  Text anpassen, solange das so bleibt.
- App-Datenschutz, Data safety, Datenschutzerklärung, Review-Hinweise und Screenshots neu
  prüfen bzw. erzeugen.

## Inhalte bei Google Play

Siehe Richtlinien-Hinweis in [`questionnaires.md`](questionnaires.md).

## Screenshots und Grafiken neu erzeugen

Nötig, sobald sich Design oder Texte sichtbar ändern. Die Bilder entstehen aus dem Web-Build
mit festen, harmlosen Karten und Beispielnamen.

```bash
npm i --no-save playwright && npx playwright install chromium   # einmalig, falls nicht vorhanden
npm run store:screenshots
```

Das Skript [`scripts/store-screenshots.mjs`](../../scripts/store-screenshots.mjs) überschreibt
alle Bilder in `docs/store/screenshots/` und `google-play/feature-graphic.jpg`. Danach
`npm test` laufen lassen – der Store-Test prüft die Bildgrößen. Die iPad-Bilder zeigen das
Tablet-Layout der App (breitere Spalte, größere Schrift und Karten).

Das Play-Store-Symbol `icon-512.png` ist eine verkleinerte Kopie von
`assets/images/icon.png` und muss bei einem neuen App-Symbol mit erneuert werden.
