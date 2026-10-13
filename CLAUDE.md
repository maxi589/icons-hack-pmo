# icons Hackathon PMO-Tool: Projektregeln

Internes Steuerungs-Tool für den **icons Hackathon (27./28.2.2027)**. Ersetzt WhatsApp als Ort für Aufgaben, Entscheidungen und Outreach-Stand. 5 Nutzer ohne Rollen: Maxi S, Maxi D, Manu, Tim, Kilian. **Kernstück ist die Pipeline (CRM).** Go-live 30.10.2026, Design-Freeze 24.10.2026.

Auftraggeber ist Maxi S (kein Entwickler): Deutsch, Ergebnis zuerst, einfache Sprache, Fachbegriffe beim ersten Mal übersetzen.

## Wo was steht
- `docs/Umfang_v1.md`: freigegebener Umfang und Prüfkriterien. Der Änderungsblock oben geht dem Text vor.
- `docs/design/Design-System.md`: **verbindliche Bau-Spezifikation** (Tokens, Schrift, Layout, Seiten, Sounds, Barrierefreiheit).
- `docs/design/leinwand/*.dc.html`: Referenz-Umsetzung der Boards in HTML/CSS. Werte, Aufbau und Texte von dort übernehmen.
- `docs/daten/`: Startdaten (`meilensteine.json`, `stammdaten.json`) und die Auswertung der Partner-Liste.
- Projektstand und Übergabe zwischen Chats: `C:\Users\maxis\OneDrive - WU Wien\01 icons Hack PMO\_STATUS.md` und `_UEBERGABE.md`. Nach jedem Meilenstein dort aktualisieren.
- **App-Rahmen** in `src/components/app-shell/` (Sidebar, Handy-Kopfzeile und Tab-Leiste, Befehlsleiste Strg+K, `TeamProvider` mit angemeldeter Person und Bereichen). Neue Seiten liegen in `src/app/(app)/` und beginnen mit `<PageHeader title="…" />`. Navigation und Tastenkürzel (G + Buchstabe, C/F/E) stehen zentral in `src/lib/nav.ts`.
- Original-Excels (`Partner.xlsx`, `Hackathon_Meilensteine.xlsx`) liegen nur im OneDrive-Ordner, nicht im Repo. Nie verändern. Lesen mit `node scripts/read-xlsx.js <datei.xlsx>` (kein Python vorhanden).

## Technik
- **Next.js 16** (App Router, TypeScript, Cache Components an). Vor neuem Next-Code die passende Anleitung in `node_modules/next/dist/docs/` lesen, siehe @AGENTS.md.
- Tailwind v4, **shadcn/ui mit Base UI** (Stil `base-nova`; nie `-b radix`, keine Radix-Pakete). Neue Bausteine mit `npx shadcn@latest add <name>`, danach an die Tokens anpassen (Fokusring, `--field`-Ränder, keine `dark:bg-input/…`-Flächen).
- Supabase (Postgres, Auth, Realtime), Hosting auf Vercel.
- Kanban aus **Kibo UI**. Zeitstrahl selbst gebaut. Sounds aus **soundcn**.
- Schrift **Geist** und Geist Mono über das npm-Paket `geist`. **Michroma** lokal über `next/font`, kein Abruf von Google Fonts zur Laufzeit.
- shadcn-Skill bzw. -MCP nutzen. **Keinen beUI-MCP**, keine beUI-Bausteine.

## Design (Kurzfassung, Details in `docs/design/Design-System.md`)
- Richtung **Graphit**, Signatur-Akzent **Lime**. Hell und dunkel gleichwertig, Standard ist die Systemeinstellung.
- Alle Farben nur über die Tokens in `src/app/globals.css`, keine frei erfundenen Werte. Tailwind-Namen: `bg-bg`, `bg-panel`, `bg-card`, `bg-card-2`, `bg-col`, `border-line`, `border-line-2`, `border-field`, `text-fg` / `text-fg-2` / `text-fg-3`, `bg-hover`, `bg-active`, `bg-acc` + `text-acc-text`, `text-acc-line`, Status `*-st-gray|blue|amber|green|red`, Bereiche `bg-area-*`. Schrift `font-display` = Michroma, Hilfsklassen `tabular` und `label-mono`.
- Hell/Dunkel über die Klasse `.dark` auf `<html>` (Inline-Skript in `src/app/layout.tsx`, Wahl im Cookie `theme`, sonst Systemeinstellung).
- Daten-Hilfen in `src/lib/dates.ts` (`todayInVienna`, `daysUntil`) statt eigener Datumsrechnung.
- Farbe nur für Bedeutung (Stufen, Bereichs-Punkte, Fälligkeit) plus der eine Lime-Akzent.
- **Kontrastregeln:**
  - Dünne Linien, Icons und Text in Akzentfarbe immer mit `--accLine` (hell #4d7c0f). Lime #c6f432 nur als Fläche mit `--accText` darauf.
  - Im Hellmodus Status-Farben als Text nur in den 700er-Tönen.
  - Ränder von Eingabefeldern mit `--field` (mind. 3:1). `--line` ist nur Dekoration.
  - `--text3` ist die hellste erlaubte Textfarbe.
  - Neue Farbkombinationen vor dem Einbau nachrechnen (WCAG): Text mind. 4,5:1, Bedienelemente mind. 3:1.
- **Verboten:**
  - icons-Farben (Logo nur als einfarbiger Schriftzug „icons“ in Michroma)
  - Glas-Effekte, Glow, animierte Sidebar, Kipp- und Magnet-Effekte, eigener Mauszeiger, WebGL
  - Werte oder Code von uimaxx.ing und aicss.dev (beide untersagen KI-Nutzung, nicht abrufen)
- Bewegung: 150 / 200 / 300 ms, `ease-out`, `prefers-reduced-motion` immer respektieren. Fokus: 2px `--accLine` mit 2px Abstand.
- Barrierefreiheit: echte `<button>`/`<a>`/`<label>`, Icon-Knöpfe mit `aria-label`, Status nie nur über Farbe (Punkt plus Wort).

## Handy
- Eingabefelder **16px** (sonst zoomt das iPhone), Tippflächen mind. 44px, `env(safe-area-inset-bottom)`.
- **Kein Ziehen & Ablegen am Handy**, Status wird per Bottom Sheet geändert.

## Zeit und Datum
- Zeitzone immer **Europe/Vienna**, auch auf dem Server (Vercel läuft in UTC). Die Sommerzeit endet am 25.10.2026.
- Woche beginnt am **Montag**. Formatierung mit date-fns und Locale `de`.
- Nachfass-Termine und Fristen sind **reine Daten** (Postgres `date`, kein Zeitstempel), damit nichts über Mitternacht oder die Zeitumstellung rutscht.

## Texte
- Alle UI-Texte auf **Deutsch**, Anrede **du**, kurz und konkret (Ton wie in den Boards).
- „TE“ in der UI als „Talent Elevator“ ausschreiben.

## Sounds
- Nur über soundcn: `npx shadcn add @soundcn/<name>`. Auswahl und Lautstärken laut Design-System, Abschnitt 7.
- **Nie einen Sound der Kategorie `warcraft` installieren.** Die Registry kennzeichnet sie fälschlich als CC0.
- Ton ist nie das einzige Feedback. Keine Töne bei eingehenden Nachrichten.
- Code: Sounds in `src/lib/sounds/` (nach `add` dorthin verschieben, soundcn legt sie flach in `src/lib` ab). Abspielen von überall mit `play("taskDone")`, Momente und Lautstärken stehen in `src/lib/sounds/index.ts`. Schalter „Sounds“/„Fun-Modus“ über `SoundProvider` (`user_settings`): Schalter im Handy-Menü, am Desktop über Strg+K. **Kein Lautsprecher-Knopf in der Sidebar** (Maxi, 14.10.: Sounds sind Standard, stumm geht übers Gerät).
- Wow-Moment „Meilenstein erledigt“: `celebrateMilestone()` aus `src/components/milestone-celebration.tsx`, ausgelöst zentral in `use-milestones.ts` (nur ganze Meilensteine; Unterpunkte bekommen den Haken-Ton).

## Daten und Sicherheit
- Zugriff nur für die 5 Team-Adressen: Allowlist plus Row Level Security (Zugriffsregeln direkt in der Datenbank) auf **jeder** Tabelle.
- Login mit **Mail + Passwort, nur auf Einladung**. Selbst-Registrierung ist in Supabase aus. Konten entstehen nur über „Konto einrichten“ (`src/app/login/actions.ts`): Adresse muss in `people` stehen und darf noch kein Konto haben (bewusst ohne Team-Code, Maxi will es einfach). Angelegt wird mit dem Secret Key (`src/lib/supabase/admin.ts`, nur dort verwenden). Kein Mailversand, „Passwort vergessen“ = Maxi löscht das Konto, die Person richtet es neu ein.
- Proxy in `src/proxy.ts` schickt Abgemeldete zu `/login`.
- Allowlist = Tabelle `people`; `is_team_member()` steckt in jeder RLS-Regel. Team-Adressen nur in `supabase/team.local.json` (nicht im Repo), einspielen mit `node --env-file=.env.local scripts/seed.mjs`.
- Datenbank-Änderungen nur als neue Datei in `supabase/migrations/`, einspielen mit `npx supabase db push`.
- Geheimnisse nur in `.env.local` bzw. den Vercel-Umgebungsvariablen, nie im Repo und nie im Chat. **Schlüssel und Passwörter trägt Maxi selbst ein.**
- Personenbezogene Partner-Daten (Excel-Inhalte) nicht ins Repo committen. Der Import liest die Excel aus dem OneDrive-Ordner.

## Umfang
- Nur bauen, was in `docs/Umfang_v1.md` steht, mit diesen späteren Entscheidungen (gehen vor):
  - **Keine Mails in v1.** Erwähnungen und Zuweisungen landen nur in der Inbox, dazu „Link kopieren“ für WhatsApp. Login mit Mail + Passwort statt Mail-Code.
  - Prio-Feld kennt A/B/C.
  - Venues schlank: kein Feld „Nutzung“, kein Bucket. Zuordnung in `docs/daten/Venue-Liste-v1_Analyse.md`.
  - Event-Datum **27./28.2.2027**. Ausdrücklich **nicht in v1:** eigener Chat, Teilnehmerverwaltung, Zwei-Wege-Kalender, WhatsApp-Bot, animierte Sidebar, Glas-Effekte, virtualisierte Tabelle, Ziehen im Zeitstrahl.
- Nach dem Design-Freeze (24.10.) nur noch Fehler beheben und Handy-Tests.

## Arbeitsweise
- „Fertig“ heißt: im Browser mit echten Daten geprüft (hell, dunkel, Handy-Breite), nicht nur ein grüner Build.
- Vor Deploy auf Produktion, neuen Konten, Kosten oder Nachrichten an andere: erst Maxi fragen.
- Claude legt keine Konten an und gibt keine Passwörter ein.
