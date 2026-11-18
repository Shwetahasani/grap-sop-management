// Object URLs for files uploaded in this browser session (not persisted).
const blobCache = new Map();

export function cacheBlob(file) {
  const key = 'k' + Date.now() + Math.random().toString(36).slice(2, 6);
  blobCache.set(key, URL.createObjectURL(file));
  return key;
}
/** Free the memory held by an object URL that is no longer referenced (e.g. a replaced, unsaved upload). */
export function releaseBlob(key) {
  const url = key && blobCache.get(key);
  if (url) { URL.revokeObjectURL(url); blobCache.delete(key); }
}
export const fileUrl =(f) => (f && ((f.blob && blobCache.get(f.blob)) || f.data)) || null;

export const readDataUrl = (file) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

/** Extract paragraph text from a .docx without any library:
 *  read the ZIP central directory, inflate word/document.xml, parse <w:p>/<w:t>. */
export async function docxParas(buf) {
  const dv = new DataView(buf), td = new TextDecoder();
  let eo = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--)
    if (dv.getUint32(i, true) === 0x06054b50) { eo = i; break; }
  if (eo < 0) throw new Error('Not a zip');
  let p = dv.getUint32(eo + 16, true);
  const n = dv.getUint16(eo + 10, true);
  for (let k = 0; k < n; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), cs = dv.getUint32(p + 20, true);
    const nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true);
    const lo = dv.getUint32(p + 42, true);
    const name = td.decode(new Uint8Array(buf, p + 46, nl));
    if (name === 'word/document.xml') {
      const start = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true);
      const d = new Uint8Array(buf, start, cs);
      const xml = method === 0
        ? td.decode(d)
        : await new Response(new Blob([d]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      const out = [];
      for (const pe of doc.getElementsByTagName('w:p')) {
        const t = [...pe.getElementsByTagName('w:t')].map((x) => x.textContent).join('');
        if (!t.trim()) continue;
        const st = pe.getElementsByTagName('w:pStyle')[0];
        const sv = st ? st.getAttribute('w:val') || '' : '';
        out.push({ t, h: /heading|title/i.test(sv) ? (/title|1/.test(sv) ? 1 : 2) : 0 });
      }
      return out;
    }
    p += 46 + nl + el + cl;
  }
  throw new Error('No document.xml');
}
