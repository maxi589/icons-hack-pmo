// Liest eine .xlsx ohne externe Pakete (kein Python, keine npm-Abhängigkeit).
// Ergebnis: { "Blattname": { 12: { A: "BCG", B: "Corporate", … }, … } }, Werte ungekürzt.
// Zahlen bleiben Zahlen (z. B. Excel-Datumszahl 46309), Text bleibt Text.

import fs from "node:fs";
import zlib from "node:zlib";

const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

function unzip(buf) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error("Keine gültige .xlsx-Datei");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = {};
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28);
    const elen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const lho = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nlen).toString();
    const start = lho + 30 + buf.readUInt16LE(lho + 26) + buf.readUInt16LE(lho + 28);
    const data = buf.subarray(start, start + csize);
    files[name] = method === 8 ? zlib.inflateRawSync(data) : data;
    p += 46 + nlen + elen + clen;
  }
  return files;
}

export function readWorkbook(path) {
  const files = unzip(fs.readFileSync(path));
  const txt = (n) => (files[n] ? files[n].toString("utf8") : "");

  const shared = [...txt("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    decode([...m[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join(""))
  );
  const rels = txt("xl/_rels/workbook.xml.rels");
  const sheets = {};
  for (const m of txt("xl/workbook.xml").matchAll(/<sheet [^>]*?name="([^"]+)"[^>]*?r:id="([^"]+)"/g)) {
    const rid = m[2];
    const target = (rels.match(new RegExp(`Id="${rid}"[^>]*Target="([^"]+)"`)) ||
      rels.match(new RegExp(`Target="([^"]+)"[^>]*Id="${rid}"`)))[1];
    const xml = txt("xl/" + target.replace(/^\/?xl\//, ""));
    const rows = {};
    for (const r of xml.matchAll(/<row [^>]*?r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells = {};
      for (const c of r[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const type = (c[2].match(/t="([^"]+)"/) || [])[1];
        const inner = c[3] || "";
        const v = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        let val;
        if (type === "s") val = shared[Number(v)];
        else if (type === "inlineStr") val = decode([...inner.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join(""));
        else if (type === "str" || type === "e") val = v == null ? null : decode(v);
        else if (type === "b") val = v === "1";
        else val = v == null ? null : Number(v);
        if (typeof val === "string") val = val.trim();
        if (val !== null && val !== undefined && val !== "") cells[c[1]] = val;
      }
      if (Object.keys(cells).length) rows[Number(r[1])] = cells;
    }
    sheets[decode(m[1])] = rows;
  }
  return sheets;
}

/** Excel-Datumszahl (Tage seit 30.12.1899) → "2026-10-14". */
export function excelDate(serial) {
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000);
  return d.toISOString().slice(0, 10);
}
