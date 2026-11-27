# Release-Checkliste

Der Weg von `main` zur Einreichung in App Store und Google Play. Was die App selbst angeht,
ist alles vorbereitet; offen sind nur Schritte, die Konten, rechtliche Angaben oder deine
Entscheidung brauchen. Details zu Store-Texten, Fragebögen und Screenshots stehen in
[`store/README.md`](store/README.md).

```bash
npm run release:check   # zeigt, was im Repository noch fehlt (Anbieterdaten, URLs, EAS …)
```

## Bereits erledigt

| Thema | Wo |
| --- | --- |
| Altersfreigabe 18+, Fair-Play-Regeln, keine Käufe sichtbar | App, `src/config/features.ts` |
| Privacy-Manifest (iOS): kein Tracking, keine erfassten Daten, Gründe für die Standard-APIs von React Native | `app.json` → `ios.privacyManifests` |
| Exportkontrolle: keine eigene Verschlüsselung | `app.json` → `ios.config.usesNonExemptEncryption` |
| App-Sprachen Deutsch, Englisch, Spanisch – erscheinen so im App Store, auf iOS und Android 13+ auch als App-Sprache in den Systemeinstellungen | `app.json` → `expo-localization` (`supportedLocales`) |
| Keine Android-Sicherung in die Cloud – Spielernamen bleiben wirklich auf dem Gerät | `app.json` → `android.allowBackup: false` |
| Erlaubnistext „Fotos hinzufügen“ (iOS fragt nur, wenn jemand ein Ergebnisbild über „Bild sichern“ ablegt) auf Deutsch, Englisch und Spanisch | `app.json` → `ios.infoPlist`, [`locales/`](../locales/) |
| Gesperrte Android-Berechtigungen (Mikrofon, Speicher, Overlay) | `app.json` → `android.blockedPermissions` |
| Store-Texte DE/EN/ES, Screenshots, Play-Grafiken, Fragebögen, Review-Hinweise, Datenschutzerklärung (Vorlage) | [`store/`](store/README.md) |
| Website mit Datenschutz, Hilfe & Kontakt und Impressum (DE/EN/ES) – ohne Cookies, Tracker und fremde Server | `site/`, `npm run site:build`, `.github/workflows/site.yml` |
| Build-Profile für Entwicklung, interne Tests und die Stores | `eas.json` |

## Einmalig – nur du

1. **Konten:** Apple Developer Program, Google-Play-Developer-Konto, Expo-Konto.
2. **Bundle-ID / Paketname** endgültig festlegen (aktuell Platzhalter `com.spicynight.app` in
   `app.json`) – nach dem ersten Upload nicht mehr änderbar.
3. **EAS verknüpfen:** `npx eas-cli@latest login` und `npx eas-cli@latest init`.
4. **Rechtliches:** Anbieterdaten in `src/config/legal.json` (`providerContact`) eintragen;
   Datenschutzerklärung ([DE](store/privacy-policy.de.md), [EN](store/privacy-policy.en.md),
   [ES](store/privacy-policy.es.md)) und Impressum prüfen lassen.
5. **Website veröffentlichen** (Datenschutz- und Support-Seite für beide Stores): in
   `site/site.config.json` die Adresse (`url`), den Hosting-Anbieter (`hosting`) und bei Bedarf
   eine eigene `supportEmail` eintragen, mit `npm run site:preview` ansehen und dann über
   GitHub Pages veröffentlichen (Settings → Pages → Quelle „GitHub Actions“, danach Actions →
   „Website“ → „Run workflow“) oder `dist-site/` bei einem Webhoster hochladen. Anschließend
   trägt `npm run site:store-urls` die Adressen in `store.config.json` ein. Dieselben Angaben
   schalten in der App „Hilfe & Kontakt“ (`url`) und „Feedback senden“ (Kontakt-E-Mail) frei;
   sie werden beim Bauen übernommen – also vor dem App-Build eintragen. Details:
   [README → Website](../README.md#website-datenschutz--support).
6. **`store.config.json`:** `apple.copyright` eintragen.
7. **Spanisch gegenlesen lassen** (empfohlen): Die 1560 Karten und die Oberfläche hat Claude
   übersetzt; eine spanischsprachige Person sollte vor allem EXTREME einmal durchsehen.
8. **App Store Connect und Play Console:** App anlegen, Sprachen, Fragebögen, Altersfreigabe
   und Store-Einträge nach [`store/README.md`](store/README.md). Neue private Play-Konten
   brauchen vor der Produktion einen geschlossenen Test.
9. Sobald die App in den Stores ist: `appStoreUrl` und `googlePlayUrl` in
   `site/site.config.json` eintragen und die Website neu veröffentlichen.

`npm run release:check` meldet die Punkte 2 bis 6, solange sie offen sind.

## Bei jedem Release

1. **Version** in `app.json` (`version`) erhöhen – nach [SemVer](https://semver.org/lang/de/):
   neue Karten oder Funktionen → Minor, Fehlerbehebungen → Patch.
2. **[`CHANGELOG.md`](../CHANGELOG.md)** um die neue Version ergänzen und das Datum eintragen.
3. **Prüfen:**
   ```bash
   npm run check          # Typecheck, Lint, Kartenprüfung, Tests
   npx expo-doctor
   npm run release:check
   ```
4. **Bilder** neu erzeugen, wenn sich die Oberfläche sichtbar geändert hat:
   `npm run store:screenshots` und `npm run docs:screenshots`.
5. **Testen** mit einem internen Build (`npm run build:preview`) oder über TestFlight /
   den internen Play-Test-Track – mindestens einmal auf Deutsch, Englisch und Spanisch durch
   Einführung, ein Spiel und die Auswertung. Dabei das **Ergebnis teilen** (mit und ohne
   Namen, einmal an eine Messenger-App, einmal über „Bild sichern“ auf iOS): Das Bild muss
   scharf und vollständig ankommen – das lässt sich nur auf echten Geräten prüfen. Wichtig ist
   ein kleines Handy (z. B. iPhone SE), auf dem die Vorschau verkleinert erscheint: Das
   gesicherte Bild muss trotzdem die ganze Karte randlos in voller Größe zeigen. Hat es dort
   Ränder oder fehlt etwas, in `src/features/share/shareImage.ts` für iOS
   `useRenderInContext: true` an `captureRef` übergeben. In den Einstellungen einmal
   **Hilfe & Kontakt** (öffnet die Hilfe-Seite in der App-Sprache) und **Feedback senden**
   (E-Mail-Entwurf mit Version, System und Sprache an die Kontaktadresse) antippen.
6. **Bauen und einreichen:**
   ```bash
   npm run build:ios && npm run submit:ios
   npm run build:android && npm run submit:android
   npm run store:metadata     # App-Store-Texte; Google-Play-Texte aus docs/store/google-play/
   ```
7. Nach der Freigabe: Release-Tag setzen (z. B. `v1.0.0`) und im Changelog
   „unveröffentlicht“ durch das Datum ersetzen, falls noch nicht geschehen.

## Build-Profile (`eas.json`)

| Profil | Befehl | Wofür |
| --- | --- | --- |
| `development` | `npm run build:dev` | Entwicklungs-Build mit `expo-dev-client` für Handy/Tablet; danach `npm run start:dev` |
| `development-simulator` | `npm run build:dev:simulator` | dasselbe für den iOS-Simulator |
| `preview` | `npm run build:preview` | interne Tester (Android-APK, iOS per Ad-hoc) |
| `production` | `npm run build:ios` / `npm run build:android` | Store-Builds; Build-Nummern zählt EAS hoch |

Für die tägliche Entwicklung reicht weiterhin **Expo Go** (`npm start`): Die App nutzt nur
Module aus dem Expo SDK. Ein Entwicklungs-Build wird nötig, sobald eigener nativer Code
dazukommt – etwa für echte In-App-Käufe.
