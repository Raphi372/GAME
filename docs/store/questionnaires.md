# Store-Fragebögen: Datenschutz und Altersfreigabe

Antworten für App Store Connect und die Google Play Console – passend zum aktuellen Stand der
App (keine Netzwerkverbindung, keine Käufe, keine Werbung, keine Analyse-Dienste). Die
Formulare ändern sich gelegentlich; im Zweifel immer ehrlich nach dem tatsächlichen
Verhalten der App antworten. **Kommen später Käufe, Werbung oder ein Absturzbericht-Dienst
dazu, müssen alle Angaben hier neu geprüft werden.**

## App Store Connect

### App-Datenschutz („App Privacy“)

| Frage | Antwort |
| --- | --- |
| Erheben Sie oder Drittanbieter Daten aus dieser App? | **Nein, wir erheben keine Daten aus dieser App.** |

Begründung: Apple zählt nur Daten als „erhoben“, die das Gerät verlassen. SPICY NIGHT
speichert Spielernamen, eigene Karten, Spielstand und Einstellungen ausschließlich lokal und
baut keine Verbindung auf. Ergebnis im Store: **„Keine Daten erfasst“**.

Das **Ergebnisbild** ändert daran nichts: Es entsteht auf dem Gerät, und die Person gibt es
selbst über das Teilen-Menü des Systems an eine andere App weiter – weder wir noch ein
Drittanbieter-SDK erhalten es. Namen stehen nur darauf, wenn sie eingeschaltet werden.

Weitere Felder:

- **Datenschutz-URL:** öffentliche Adresse von [`privacy-policy.de.md`](privacy-policy.de.md),
  [`privacy-policy.en.md`](privacy-policy.en.md) bzw. [`privacy-policy.es.md`](privacy-policy.es.md) (Pflicht).
- **Tracking (App Tracking Transparency):** nicht nötig – die App trackt nicht.
- **Fotos hinzufügen:** Die App fragt nie selbst nach Fotozugriff. Wählt jemand im
  Teilen-Menü „Bild sichern“, fragt iOS mit dem Text aus `NSPhotoLibraryAddUsageDescription`
  (`app.json`, übersetzt in `locales/`) nach der Erlaubnis, Fotos hinzuzufügen – lesen kann
  die App die Mediathek nicht.
- **Verschlüsselung (Export Compliance):** bereits beantwortet über
  `ios.config.usesNonExemptEncryption: false` in `app.json`.

### Altersfreigabe („Age Rating“)

Ziel: **18+**. Die App ist ausdrücklich nur für Erwachsene, hat eine 18+-Bestätigung beim
Start und Karten mit sexuellen Themen (ohne Darstellung, ohne Nacktheit).

| Bereich | Empfohlene Antwort |
| --- | --- |
| Profanity or Crude Humor | Infrequent/Mild |
| Horror/Fear Themes | None |
| Alcohol, Tobacco, or Drug Use or References | None – Karten verlangen nie Alkohol; die Texte sagen nur „kein Alkohol nötig“ |
| Mature or Suggestive Themes | **Frequent/Intense** |
| Sexual Content or Nudity | Infrequent/Mild (Gesprächsthemen, keine Darstellung, keine Nacktheit) |
| Graphic Sexual Content and Nudity | None |
| Violence (alle Fragen) | None |
| Medical or Treatment Information | None |
| Gambling / Simulated Gambling / Contests / Loot Boxes | None / No |
| Unrestricted Web Access | No |
| User-Generated Content | No – eigene Karten bleiben auf dem Gerät und werden nicht geteilt |
| Messaging and Chat | No |
| Advertising | No |
| Fragen zu Dating- oder Beziehungsinhalten (falls angezeigt) | Yes – Flirt, Dating und Beziehungen sind Kernthema |
| Parental Controls / Age Assurance | No (die 18+-Abfrage ist eine Selbstauskunft, keine Altersverifikation) |

Ergibt der Fragebogen weniger als 18+, über die Option für eine **höhere Altersfreigabe**
manuell **18+** wählen.

### Kategorien

Bereits in `store.config.json`: primär **Spiele** (Unterkategorien Karten, Gelegenheitsspiele),
sekundär **Unterhaltung**.

## Google Play Console

### Datensicherheit („Data safety“)

| Frage | Antwort |
| --- | --- |
| Erhebt oder teilt deine App erforderliche Nutzerdatentypen? | **Nein** |

Damit entfallen alle Folgefragen (Verschlüsselung bei der Übertragung, Löschanfragen). Google
zählt – wie Apple – nur Daten, die das Gerät verlassen. Ergebnis im Store: **„Keine Daten
erhoben“** und **„Keine Daten mit Dritten geteilt“**. Das Ergebnisbild gibt die Person
selbst über das Teilen-Menü an eine andere App weiter; die App überträgt dabei nichts.

### App-Inhalte („App content“)

| Abschnitt | Antwort |
| --- | --- |
| Datenschutzerklärung | öffentliche URL der Datenschutzerklärung (Pflicht) |
| App-Zugriff | Alle Funktionen sind ohne besonderen Zugriff verfügbar (kein Login; Altersabfrage einfach bestätigen) |
| Werbung | Nein, die App enthält keine Werbung |
| Zielgruppe und Inhalte | **Nur „18 und älter“** auswählen; die App spricht keine Kinder an |
| Nachrichten-App | Nein |
| Gesundheits-, Finanz-, Regierungs-Apps | Nein |

### Einstufung des Inhalts (IARC-Fragebogen)

- **Kategorie:** Spiel.
- **Sexualität:** Ja zu sexuellen Themen/Anspielungen in Textform; **keine** Nacktheit,
  **keine** sexuellen Handlungen in Bild oder Ton.
- **Gewalt, Angst, Glücksspiel, Drogen, Alkohol, Tabak:** Nein.
- **Grobe Sprache:** höchstens vereinzelt mild.
- **Nutzerinteraktion (Chat, Teilen von Inhalten, Standort, digitale Käufe):** Nein. Das
  Ergebnisbild wird nur an das Teilen-Menü des Systems übergeben; innerhalb der App tauschen
  Nutzer nichts miteinander aus.

IARC vergibt die Einstufung je Region selbst (z. B. USK, PEGI). Die Zielgruppe „18 und
älter“ legst du unabhängig davon unter „Zielgruppe und Inhalte“ fest.

### Richtlinien-Hinweis

Google Play lässt keine Apps zu, deren Zweck sexuelle Befriedigung ist, und keine sexuellen
Schlüsselwörter im Store-Eintrag. SPICY NIGHT ist ein Partyspiel mit Gesprächsfragen ohne
explizite Inhalte, und der Store-Eintrag verzichtet bewusst auf entsprechende Begriffe (das
prüft `tests/unit/store-listing.test.ts`). Eine Ablehnung ist trotzdem nicht ausgeschlossen –
dann zuerst die beanstandeten Karten bzw. Texte entschärfen und Einspruch einlegen.
