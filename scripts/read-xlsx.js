// Liest eine .xlsx (ZIP) ohne externe Pakete: zentrale Verzeichnisstruktur + inflateRaw
const fs = require('fs'), zlib = require('zlib');
const buf = fs.readFileSync(process.argv[2]);
const eocd = buf.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06]));
const cdCount = buf.readUInt16LE(eocd + 10), cdOff = buf.readUInt32LE(eocd + 16);
const files = {}; let p = cdOff;
for (let i = 0; i < cdCount; i++) {
  const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), nlen = buf.readUInt16LE(p + 28), elen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32), lho = buf.readUInt32LE(p + 42);
  const name = buf.slice(p + 46, p + 46 + nlen).toString();
  const lnlen = buf.readUInt16LE(lho + 26), lelen = buf.readUInt16LE(lho + 28);
  const data = buf.slice(lho + 30 + lnlen + lelen, lho + 30 + lnlen + lelen + csize);
  files[name] = method === 8 ? zlib.inflateRawSync(data) : data;
  p += 46 + nlen + elen + clen;
}
const txt = n => files[n] ? files[n].toString('utf8') : '';
const dec = s => s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
const ss = [...txt('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => dec([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]).join('')));
const wb = txt('xl/workbook.xml');
const sheets = [...wb.matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)].map(m => ({ name: m[1], rid: m[2] }));
const rels = txt('xl/_rels/workbook.xml.rels');
for (const s of sheets) {
  const target = (rels.match(new RegExp('Id="' + s.rid + '"[^>]*Target="([^"]+)"')) || rels.match(new RegExp('Target="([^"]+)"[^>]*Id="' + s.rid + '"')) || [])[1];
  const xml = txt('xl/' + target.replace(/^\/?xl\//, ''));
  const rows = [...xml.matchAll(/<row [^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)];
  console.log('=== Blatt: ' + s.name + ' (' + rows.length + ' Zeilen mit Inhalt) | dimension: ' + ((xml.match(/<dimension ref="([^"]+)"/) || [])[1]));
  for (const r of rows) {
    const cells = [...r[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)].map(c => {
      const t = (c[2].match(/t="([^"]+)"/) || [])[1]; const v = ((c[3] || '').match(/<v>([\s\S]*?)<\/v>/) || [])[1];
      const is = ((c[3] || '').match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/) || [])[1];
      let val = t === 's' ? ss[+v] : t === 'inlineStr' ? dec(is || '') : v;
      return val == null || val === '' ? null : c[1] + '=' + String(val).replace(/\s+/g, ' ').slice(0, 90);
    }).filter(Boolean);
    if (cells.length) console.log(r[1].padStart(3) + ': ' + cells.join(' | '));
  }
}
