// Markdown-Hilfen für Suche, Vorschau, Titel und die Verlustbremse im Editor (Notion light, Stufe A).

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** „&amp;“ → „&“ (der Editor speichert & < > so), auch &#39; / &#x27;. */
function decodeEntities(s: string) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Markdown zu Klartext: Links nur mit ihrem Text, ohne Formatzeichen, Tabellen-Striche, Checkboxen oder Code-Zäune. */
export function mdToText(md: string) {
  const text = md
    // Link-Text darf \[ \] enthalten, die Adresse eine Klammerebene („…Wien_(Stadt)“)
    .replace(/!?\[((?:\\.|[^\]\\])*)\]\((?:[^()\s]|\([^()]*\))*(?:\s+"[^"]*")?\)/g, "$1")
    .replace(/^\s*(```|~~~).*$/gm, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/gm, "")
    .replace(/[ \t]*(?<!\\)\|[ \t]*/g, " ")
    .replace(/^\s*(#{1,6}|[-*+]|\d+\.|>)\s+/gm, "")
    .replace(/\[[ xX]\]\s*/g, "")
    .replace(/(?<!\\)[*_`~]+/g, "")
    .replace(/\\([\\`*_{}[\]()#+\-.!|>~])/g, "$1")
    .replace(/[ \t]+/g, " ")
    .replace(/^ | $/gm, "")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
  return decodeEntities(text);
}

/** Erste Zeile mit Text, als Titel für neue Text-Dokumente (wie in Apple Notes). */
export function firstLine(md: string) {
  return mdToText(md).split("\n").map((l) => l.trim()).find(Boolean) ?? "";
}

const onlyLetters = (s: string) => decodeEntities(s).toLowerCase().replace(/[^\p{L}]/gu, "");

/**
 * Verlustbremse: Steht jeder Buchstabe des gespeicherten Texts in der richtigen Reihenfolge auch in dem, was der
 * Editor daraus macht? Wenn nicht, kennt der Editor etwas nicht (z. B. eine neue Blockart aus einem neueren App-Stand)
 * und würde es beim nächsten Speichern löschen. Zahlen und Zeichen zählen nicht (Listen werden neu nummeriert),
 * Entities wie „&quot;“ auch nicht (der Editor schreibt sie anders).
 */
export function keepsAllText(saved: string, shown: string) {
  // <br> wird zum Zeilenumbruch, ohne dass Text verloren geht
  const a = onlyLetters(saved.replace(/<br\s*\/?>/gi, ""));
  const b = onlyLetters(shown);
  if (a.length > b.length) return false;
  let j = 0;
  for (const ch of a) {
    j = b.indexOf(ch, j);
    if (j < 0) return false;
    j += ch.length;
  }
  return true;
}
