import { USERS } from '../data/constants';

export const uname = (e) => USERS[e]?.name || e;
export const initials = (e) =>
  uname(e).split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export const fmtD = (t) =>
  new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
export const fmtT = (t) =>
  new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
export const fmtDT = (t) => `${fmtD(t)}, ${fmtT(t)}`;

export function ago(t) {
  const s = (Date.now() - new Date(t)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'yesterday' : d < 7 ? `${d} days ago` : fmtD(t);
}

export const daysSince = (t) => Math.floor((Date.now() - new Date(t)) / 86400000);
export const nowISO = () => new Date().toISOString();
export const fmtSize = (b) =>
  b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
export const extOf = (n) => (n.split('.').pop() || '').toLowerCase();
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Last history entry with a given action (newest first). */
export const lastEvent = (s, action) => [...s.history].reverse().find((h) => h.action === action);
export const lastRemark = (s) => {
  const h = [...s.history].reverse().find((h) => ['Modification requested', 'Rejected'].includes(h.action));
  return h ? h.remark : '';
};

/** Loose name similarity – used to warn about possible duplicate SOPs. */
export function similar(a, b) {
  const words = (x) =>
    new Set(x.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((t) => t.length > 3));
  const A = words(a), B = words(b);
  if (a.trim().toLowerCase() === b.trim().toLowerCase()) return true;
  if (!A.size || !B.size) return false;
  let n = 0;
  A.forEach((t) => B.has(t) && n++);
  return n / Math.min(A.size, B.size) >= 0.67;
}

/** Version rule: new SOP = v1; replacing the file during a modification, or "New version" on an
 *  Approved SOP, creates the next version. Editing a draft keeps the same version. */
export function nextVersion(sop, mode, hasNewFile) {
  if (!sop) return 1;
  if (mode === 'newver') return sop.version + 1;
  if (sop.status === 'Modification In Progress' && hasNewFile) return sop.version + 1;
  return sop.version;
}
