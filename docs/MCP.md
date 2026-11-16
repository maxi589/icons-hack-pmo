# hack-vienna HQ: MCP-Konnektor (16.11.2026)

Damit kann jede Person im Team ihren eigenen KI-Agenten (Claude, ChatGPT o. Ä.) mit dem Tool verbinden: Pipeline lesen, Firmen pflegen, Kommentare und Aufgaben anlegen. Muster aus Karriere HQ.

## Verbinden
1. Im Tool auf den eigenen Avatar → **KI verbinden** → **Schlüssel** → Name (z. B. „Claude“) → **Anlegen**. Die Adresse wird kopiert und ist nur jetzt sichtbar.
2. **claude.ai / Claude-App:** Einstellungen → Konnektoren → Eigenen Konnektor hinzufügen → Name „hack-vienna HQ“, URL = kopierte Adresse `https://hack-vienna-hq.vercel.app/api/mcp/hv_…`.
3. **Claude Code:** `claude mcp add --transport http --scope user hack-vienna-hq https://hack-vienna-hq.vercel.app/api/mcp/hv_…`
4. **ChatGPT** (Developer Mode): Connector mit derselben Adresse, ohne Anmeldung.

Ein Schlüssel je Ort. Verloren oder geteilt: im Profil **Widerrufen**, neuen anlegen.

## Technik
- Routen `src/app/api/mcp/route.ts` (Header `Authorization: Bearer hv_…`) und `src/app/api/mcp/[token]/route.ts` (Schlüssel in der Adresse). JSON-RPC ohne Sitzung in `src/lib/mcp/server.ts`, Werkzeuge in `src/lib/mcp/tools.ts`, Anleitung für den Agenten in `src/lib/mcp/texts.ts`.
- Tabelle `mcp_tokens`: nur SHA-256-Hash und letzte 4 Zeichen, für Clients gesperrt; anlegen, auflisten, widerrufen über `src/lib/mcp-actions.ts`.
- Daten über den Secret Key (Team-Daten wie in der App). Private Termine anderer bleiben verborgen.
- Jede Änderung: Verlauf mit der Person des Schlüssels und `data.via = "mcp"`, im Firmen-Verlauf als „(über KI)“.

## Werkzeuge
| Lesen | Schreiben |
|---|---|
| `ueberblick`, `firmen_suchen`, `firma_lesen`, `suchen` | `firma_aendern` (inkl. `notiz_anhaengen`), `stufe_aendern` (nur Recherche, Kontaktiert, Im Gespräch), `firma_anlegen`, `kommentar_schreiben`, `aufgabe_anlegen`, `aufgabe_erledigen` |

**Bewusst nicht:** löschen, Zugesagt/Fix/Abgesagt (dort hängen Standard-Aufgaben dran, nur in der App), Mails senden.
