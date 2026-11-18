import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { STORE_KEY, SESSION_KEY, USERS, REVIEW_STATUSES } from '../data/constants';
import { seed } from '../data/seed';
import { nowISO, nextVersion } from '../utils/format';

/**
 * Data layer for the POC. In production each action below maps to one API call
 * (POST /sops, PUT /sops/:id, POST /sops/:id/decision …) and the history entries
 * are written server-side as the audit log.
 */
const StoreCtx = createContext(null);

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE_KEY));
    if (d && d.sops) return d;
  } catch { /* ignore */ }
  return null;
}

export function StoreProvider({ children }) {
  const [S, setS] = useState(() => load() || seed());
  const [meEmail, setMeEmail] = useState(() => {
    try { const e = sessionStorage.getItem(SESSION_KEY); return USERS[e] ? e : null; } catch { return null; }
  });

  // Latest state, so actions never work on a stale copy (e.g. two commits in one tick).
  const stateRef = useRef(S);
  stateRef.current = S;

  // Persist with a short debounce instead of serialising everything on every change.
  const saveNow = () => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(stateRef.current)); }
    catch (e) { console.warn('SOP data could not be saved to localStorage (storage may be full).', e); }
  };
  useEffect(() => {
    const t = setTimeout(saveNow, 250);
    return () => clearTimeout(t);
  }, [S]); // eslint-disable-line react-hooks/exhaustive-deps
  // Flush immediately when the tab is hidden/closed or the provider unmounts, so nothing is lost.
  useEffect(() => {
    window.addEventListener('pagehide', saveNow);
    return () => { window.removeEventListener('pagehide', saveNow); saveNow(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    try { meEmail ? sessionStorage.setItem(SESSION_KEY, meEmail) : sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  }, [meEmail]);

  const me = useMemo(() => (meEmail ? { email: meEmail, ...USERS[meEmail] } : null), [meEmail]);

  // Apply a change to a copy of the state and return a value from it.
  const commit = (fn) => { const n = structuredClone(stateRef.current); const r = fn(n); stateRef.current = n; setS(n); return r; };
  const notify = (n, to, verb, sop, extra, kind) =>
    n.notifs.push({ to, ts: nowISO(), actor: meEmail, verb, sopName: sop.name, extra: extra || '', sop: sop.id, read: false, kind });

  // Derived lists are computed once per state change, not on every render of every consumer.
  const mineList = useMemo(() => S.sops.filter((s) => s.owner === meEmail), [S.sops, meEmail]);
  const reviewList = useMemo(
    () => (me?.role === 'Reviewer' ? S.sops.filter((s) => s.owner !== meEmail && REVIEW_STATUSES.includes(s.status)) : []),
    [S.sops, me, meEmail],
  );

  /* eslint-disable react-hooks/exhaustive-deps */
  const api = useMemo(() => ({
    S, me,
    signIn: (email) => setMeEmail(email),
    signOut: () => setMeEmail(null),
    reset: () => setS(seed()),

    mine: () => mineList,
    forReview: () => reviewList,
    getSop: (id) => S.sops.find((s) => s.id === id),

    /** Create / edit / new version. Returns { id, status }. */
    saveSop: ({ mode, id, name, cat, sub, comments, file, submit }) => commit((n) => {
      const t = nowISO(), by = meEmail;
      let s = id ? n.sops.find((x) => x.id === id) : null;
      const isMod = s && s.status === 'Modification In Progress';
      const v = nextVersion(s, mode, !!file);
      if (!s) {
        s = { id: 'SOP-' + String(n.seq++).padStart(4, '0'), owner: by, status: '—', version: 1, liveVersion: null,
          createdAt: t, history: [], files: {}, diff: null };
        n.sops.unshift(s);
      }
      const prevV = s.version, bumped = v > prevV;
      Object.assign(s, { name, cat, sub, comments, updatedAt: t, version: v });
      if (file) s.files[v] = { ...file };
      if (bumped) s.diff = null;
      const log = (action, to, remark, ver, verFrom) => {
        s.history.push({ ts: t, action, by, from: s.status, to, remark: remark || '', ver, verFrom: verFrom || null });
        s.status = to;
      };
      if (mode === 'new') {
        log('Created', 'Draft', comments, 1);
        if (submit) log('Submitted', 'Submitted', '', 1);
      } else if (mode === 'newver') {
        log(submit ? 'New version submitted' : 'New version drafted', submit ? 'Submitted' : 'Draft', comments, v, prevV);
      } else if (isMod) {
        if (submit) log('Resubmitted', 'Resubmitted', comments, v, bumped ? prevV : null);
        else log(bumped ? 'Changes saved · file replaced' : 'Changes saved', 'Modification In Progress', comments, v, bumped ? prevV : null);
      } else if (submit) log('Submitted', 'Submitted', comments, v);
      else log(file ? 'Saved as draft · file replaced' : 'Saved as draft', 'Draft', comments, v);

      if (submit)
        Object.keys(USERS)
          .filter((e) => USERS[e].role === 'Reviewer' && e !== by)
          .forEach((e) => notify(n, e, isMod ? 'resubmitted' : 'submitted', s, ` (v${v}) for review`, 'in'));
      return { id: s.id, status: s.status };
    }),

    /** Requested Modification -> Modification In Progress (creator opens the SOP to edit). */
    startChanges: (id) => commit((n) => {
      const s = n.sops.find((x) => x.id === id);
      s.history.push({ ts: nowISO(), action: 'Changes started', by: meEmail, from: s.status, to: 'Modification In Progress', remark: '', ver: s.version, verFrom: null });
      s.status = 'Modification In Progress';
      s.updatedAt = nowISO();
    }),

    /** Reviewer decision: Approved | Rejected | Requested Modification */
    decide: (id, d, remark) => commit((n) => {
      const s = n.sops.find((x) => x.id === id), t = nowISO();
      const action = d === 'Approved' ? 'Approved' : d === 'Rejected' ? 'Rejected' : 'Modification requested';
      s.history.push({ ts: t, action, by: meEmail, from: s.status, to: d, remark, ver: s.version, verFrom: null });
      s.status = d;
      s.updatedAt = t;
      if (d === 'Approved') s.liveVersion = s.version;
      notify(n, s.owner, d === 'Approved' ? 'approved' : d === 'Rejected' ? 'rejected' : 'requested changes on', s,
        d === 'Approved' ? ` v${s.version} — now live` : '', d === 'Approved' ? 'ok' : d === 'Rejected' ? 'rej' : 'mod');
      return s;
    }),

    markRead: (idx) => commit((n) => { n.notifs[idx].read = true; }),
    markAllRead: () => commit((n) => { n.notifs.forEach((x) => { if (x.to === meEmail) x.read = true; }); }),
  }), [S, me, meEmail, mineList, reviewList]);
  /* eslint-enable react-hooks/exhaustive-deps */

  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>;
}

export const useStore = () => useContext(StoreCtx);
