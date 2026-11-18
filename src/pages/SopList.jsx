import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { emptyFilters, useUI } from '../store/UIContext';
import { CATS, EDITABLE_STATUSES, REVIEW_STATUSES, STATUSES } from '../data/constants';
import { daysSince, fmtD, fmtT, fmtDT, lastRemark, uname } from '../utils/format';
import { Badge, Icon } from '../components/Icon';

const COLS = [
  ['id', 'SOP ID'], ['name', 'SOP name'], ['version', 'Version'], ['cat', 'Category'], ['sub', 'Sub-category'],
  ['status', 'Status'], ['owner', 'Uploaded by'], ['createdAt', 'Created'], ['updatedAt', 'Last updated'], [null, 'Actions'],
];
const SK_W = [60, 85, 30, 60, 70, 70, 60, 55, 55, 90];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function Highlight({ text, q }) {
  const t = q.trim();
  if (!t) return text;
  const i = text.toLowerCase().indexOf(t.toLowerCase());
  if (i < 0) return text;
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + t.length)}</mark>{text.slice(i + t.length)}</>;
}

/** Screen 2 – SOP listing (home). */
export default function SopList() {
  const { me, mine, forReview, startChanges } = useStore();
  const { F, setF, tab, setTab, sort, setSort, flashId, setFlashId, setActivityId, toast, listLoaded } = useUI();
  const nav = useNavigate();
  const [loading, setLoading] = useState(!listLoaded.current);
  const timer = useRef(null);
  const isRev = me.role === 'Reviewer';
  const curTab = isRev ? tab : 'mine';

  const pulse = (ms) => { setLoading(true); clearTimeout(timer.current); timer.current = setTimeout(() => setLoading(false), ms); };
  useEffect(() => {
    if (!listLoaded.current) { listLoaded.current = true; pulse(550); }
    return () => clearTimeout(timer.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!flashId) return undefined;
    const t = setTimeout(() => setFlashId(null), 2000);
    return () => clearTimeout(t);
  }, [flashId, setFlashId]);

  const m = mine(), r = forReview();
  const base = curTab === 'review' ? r : m;
  // One pass over my SOPs for all the counts, recomputed only when the data changes.
  const counts = useMemo(() => {
    const c = { reqMod: 0, mod: 0, draft: 0, inReview: 0, approved: 0 };
    for (const s of m) {
      if (s.status === 'Requested Modification') c.reqMod++;
      if (/Modification/.test(s.status)) c.mod++;
      if (s.status === 'Draft') c.draft++;
      if (REVIEW_STATUSES.includes(s.status)) c.inReview++;
      if (s.status === 'Approved') c.approved++;
    }
    return c;
  }, [m]);
  const resubmitted = useMemo(() => r.filter((s) => s.status === 'Resubmitted').length, [r]);
  const needs = counts.reqMod;

  const kpis = isRev
    ? [
        ['Waiting for my review', r.length, `${resubmitted} resubmitted`, 'review', [], 'var(--blue)'],
        ['Needs my changes', counts.mod, 'Requested or in progress', 'mine', ['Requested Modification', 'Modification In Progress'], 'var(--amber)'],
        ['My drafts', counts.draft, 'Not yet submitted', 'mine', ['Draft'], 'var(--grey)'],
        ['My SOPs in review', counts.inReview, 'With other reviewers', 'mine', REVIEW_STATUSES, 'var(--indigo)'],
      ]
    : [
        ['Needs my changes', counts.mod, 'Requested or in progress', 'mine', ['Requested Modification', 'Modification In Progress'], 'var(--amber)'],
        ['My drafts', counts.draft, 'Not yet submitted', 'mine', ['Draft'], 'var(--grey)'],
        ['In review', counts.inReview, 'Waiting on a reviewer', 'mine', REVIEW_STATUSES, 'var(--blue)'],
        ['Approved & live', counts.approved, 'Published to knowledge base', 'mine', ['Approved'], 'var(--green)'],
      ];
  const kpiOn = (k) => curTab === k[3] && JSON.stringify(F.st) === JSON.stringify(k[4]);
  const clickKpi = (k) => { const on = kpiOn(k); setTab(k[3]); setF((f) => ({ ...f, st: on ? [] : [...k[4]] })); };

  const changeTab = (t) => {
    setTab(t);
    setF((f) => ({ ...f, st: f.st.filter((s) => t !== 'review' || REVIEW_STATUSES.includes(s)) }));
    pulse(300);
  };
  const toggleSort = (k) => setSort((s) => (s.k === k ? { k, dir: -s.dir } : { k, dir: k === 'updatedAt' || k === 'createdAt' ? -1 : 1 }));
  const set = (patch) => setF((f) => ({ ...f, ...patch }));
  const clear = () => setF(emptyFilters());

  // Filter + sort only when the data, filters or sort order change. Values that don't depend
  // on the row (search text, date bounds) are prepared once instead of inside the loop.
  const rows = useMemo(() => {
    const q = F.q.trim().toLowerCase();
    const from = F.from ? +new Date(F.from + 'T00:00') : null;
    const to = F.to ? +new Date(F.to + 'T23:59:59') : null;
    const out = base.filter((s) => {
      if (F.cat && s.cat !== F.cat) return false;
      if (F.sub && s.sub !== F.sub) return false;
      if (F.st.length && !F.st.includes(s.status)) return false;
      if (q && !`${s.name} ${s.id}`.toLowerCase().includes(q)) return false;
      if (from !== null || to !== null) {
        const u = +new Date(s.updatedAt);
        if (from !== null && u < from) return false;
        if (to !== null && u > to) return false;
      }
      return true;
    });
    const isDate = sort.k === 'createdAt' || sort.k === 'updatedAt';
    const key = (s) => (sort.k === 'owner' ? uname(s.owner) : isDate ? +new Date(s[sort.k]) : s[sort.k]);
    return out
      .map((s) => [key(s), s])
      .sort(([x], [y]) => (x > y ? 1 : x < y ? -1 : 0) * sort.dir)
      .map(([, s]) => s);
  }, [base, F, sort]);

  const filtered = F.q || F.cat || F.sub || F.st.length || F.from || F.to;
  const chips = [];
  if (F.q) chips.push([`Search: “${F.q}”`, { q: '' }]);
  if (F.cat) chips.push([`Category: ${F.cat}`, { cat: '', sub: '' }]);
  if (F.sub) chips.push([`Sub-category: ${F.sub}`, { sub: '' }]);
  if (F.st.length) chips.push([`Status: ${F.st.join(', ')}`, { st: [] }]);
  if (F.from || F.to) chips.push([`Updated: ${F.from ? fmtD(F.from) : '…'} – ${F.to ? fmtD(F.to) : '…'}`, { from: '', to: '' }]);

  const subs = F.cat ? CATS[F.cat] : Object.values(CATS).flat();
  const allowedSt = curTab === 'review' ? REVIEW_STATUSES : STATUSES;
  const stVal = F.st.length === 1 ? F.st[0] : F.st.length > 1 ? '__multi' : '';

  const open = (s) => nav(curTab === 'review' ? `/sops/${s.id}/review` : `/sops/${s.id}`);
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
  const makeChanges = (s) => { startChanges(s.id); toast(<>Status changed to <b>Modification In Progress</b></>, 'info'); nav(`/sops/${s.id}/edit`); };

  return (
    <section aria-labelledby="greet">
      <div className="hello">
        <div>
          <h1 id="greet">{greeting()}, {me.name.split(' ')[0]}</h1>
          <p>
            {isRev
              ? <><b>{r.length}</b> SOP{r.length === 1 ? '' : 's'} waiting for your review{needs ? <> · <b>{needs}</b> of yours need{needs === 1 ? 's' : ''} changes</> : null}.</>
              : needs ? <><b>{needs}</b> of your SOPs need{needs === 1 ? 's' : ''} changes requested by a reviewer.</> : "Here's where your SOPs stand today."}
          </p>
        </div>
        <button className="btn pri" onClick={() => nav('/sops/new')}><Icon n="plus" />Add SOP</button>
      </div>

      <div className="kpis">
        {kpis.map((k) => (
          <button key={k[0]} className={`kpi ${kpiOn(k) ? 'on' : ''}`} aria-pressed={kpiOn(k)} onClick={() => clickKpi(k)}>
            <span className="bar" style={{ background: k[5] }} />
            <span className="l">{k[0]}</span><span className="v">{k[1]}</span><span className="s">{k[2]}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={curTab === 'mine'} onClick={() => changeTab('mine')}>My SOPs<span className="cnt">{m.length}</span></button>
          {isRev && <button role="tab" aria-selected={curTab === 'review'} onClick={() => changeTab('review')}>For My Review<span className="cnt">{r.length}</span></button>}
        </div>

        <div className="filters">
          <div className="fg">
            <label htmlFor="lq">Search</label>
            <div className="lsearch"><Icon n="search" size={15} /><input id="lq" type="search" placeholder="SOP name or ID" value={F.q} onChange={(e) => set({ q: e.target.value })} /></div>
          </div>
          <div className="fg half">
            <label htmlFor="fcat">Category</label>
            <select id="fcat" value={F.cat} onChange={(e) => set({ cat: e.target.value, sub: '' })}>
              <option value="">All categories</option>
              {Object.keys(CATS).map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="fg half">
            <label htmlFor="fsub">Sub-category</label>
            <select id="fsub" value={F.sub} onChange={(e) => set({ sub: e.target.value })}>
              <option value="">All sub-categories</option>
              {subs.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="fg">
            <label htmlFor="fst">Status</label>
            <select id="fst" value={stVal} onChange={(e) => set({ st: e.target.value && e.target.value !== '__multi' ? [e.target.value] : [] })}>
              <option value="">All statuses</option>
              {F.st.length > 1 && <option value="__multi">{F.st.length} statuses</option>}
              {allowedSt.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="fg half">
            <label htmlFor="ffrom">Updated from</label>
            <input type="date" id="ffrom" value={F.from} max={F.to || undefined} onChange={(e) => set({ from: e.target.value })} />
          </div>
          <div className="fg half">
            <label htmlFor="fto">Updated to</label>
            <input type="date" id="fto" value={F.to} min={F.from || undefined} onChange={(e) => set({ to: e.target.value })} />
          </div>
        </div>

        {chips.length > 0 && (
          <div className="chips">
            {chips.map(([label, patch]) => (
              <span className="chip" key={label}>{label}
                <button aria-label={`Remove filter ${label}`} onClick={() => set(patch)}><Icon n="x" size={12} /></button>
              </span>
            ))}
            <button className="btn sm ghost" onClick={clear}>Clear all</button>
          </div>
        )}

        <div className="tmeta">
          <span id="cnt" aria-live="polite">{loading ? 'Loading SOPs…' : `Showing ${rows.length} of ${base.length} SOP${base.length === 1 ? '' : 's'}`}</span>
          {curTab === 'review' && <span><Icon n="info" size={13} /> Your own SOPs never appear here.</span>}
        </div>

        <div className="twrap">
          <table aria-describedby="cnt">
            <thead>
              <tr>
                {COLS.map(([k, l]) => k ? (
                  <th key={k} scope="col" aria-sort={sort.k === k ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none'}>
                    <button onClick={() => toggleSort(k)}>{l}<Icon n="sort" /></button>
                  </th>
                ) : <th key="a" scope="col" style={{ textAlign: 'right' }}>{l}</th>)}
              </tr>
            </thead>
            <tbody id="rows">
              {loading ? Array.from({ length: 5 }, (_, i) => (
                <tr key={i}>{SK_W.map((w, j) => <td key={j}><span className="sk" style={{ width: `${w}%` }} /></td>)}</tr>
              )) : rows.length === 0 ? (
                <tr><td colSpan={10} style={{ cursor: 'default' }}>
                  <div className="empty">
                    {filtered ? (
                      <><div className="ei"><Icon n="search" /></div><h3>No SOPs match these filters</h3><p className="muted">Try a different search or clear the filters.</p><button className="btn" onClick={clear}>Clear all filters</button></>
                    ) : curTab === 'review' ? (
                      <><div className="ei"><Icon n="check" /></div><h3>No SOPs to review</h3><p className="muted">You're all caught up. New submissions from other users will appear here.</p></>
                    ) : (
                      <><div className="ei"><Icon n="file" /></div><h3>You haven't uploaded any SOPs yet</h3><p className="muted">Upload a Word or PDF document to get started.</p><button className="btn pri" onClick={() => nav('/sops/new')}><Icon n="plus" />Add SOP</button></>
                    )}
                  </div>
                </td></tr>
              ) : rows.map((s) => {
                const rem = /Modification|Rejected/.test(s.status) ? lastRemark(s) : '';
                const wait = curTab === 'review' ? daysSince(s.updatedAt) : null;
                return (
                  <tr key={s.id} tabIndex={0} className={flashId === s.id ? 'flash' : ''} onClick={() => open(s)} onKeyDown={(e) => e.key === 'Enter' && open(s)}>
                    <td data-l="SOP ID" className="mono">{s.id}</td>
                    <td data-l="SOP name" className="first">
                      <span className="nm"><Highlight text={s.name} q={F.q} /></span>
                      {rem && <div className="sub" title={rem}><Icon n="msg" size={12} /> {rem.length > 60 ? rem.slice(0, 60) + '…' : rem}</div>}
                    </td>
                    <td data-l="Version"><b>v{s.version}</b>{s.liveVersion && s.liveVersion !== s.version && s.status !== 'Approved' && <div className="sub">Live: v{s.liveVersion}</div>}</td>
                    <td data-l="Category">{s.cat}</td>
                    <td data-l="Sub-category">{s.sub}</td>
                    <td data-l="Status">
                      <Badge s={s.status} />
                      {wait !== null && <div className="sub" style={{ marginTop: 3 }}><span className={`tag ${wait >= 3 ? 'amber' : ''}`}><Icon n="clock" size={11} /> {wait === 0 ? 'Today' : `${wait}d waiting`}</span></div>}
                    </td>
                    <td data-l="Uploaded by">{s.owner === me.email ? 'You' : uname(s.owner)}</td>
                    <td data-l="Created" className="nw">{fmtD(s.createdAt)}</td>
                    <td data-l="Last updated" className="nw" title={fmtDT(s.updatedAt)}>{fmtD(s.updatedAt)}<div className="sub">{fmtT(s.updatedAt)}</div></td>
                    <td data-l="Actions" className="acts-cell">
                      {curTab === 'review' && <button className="btn sm pri" onClick={stop(() => nav(`/sops/${s.id}/review`))}>Review</button>}
                      {curTab === 'mine' && EDITABLE_STATUSES.includes(s.status) && <button className="btn sm" onClick={stop(() => nav(`/sops/${s.id}/edit`))}><Icon n="edit" size={13} />Edit</button>}
                      {curTab === 'mine' && s.status === 'Requested Modification' && <button className="btn sm warn" onClick={stop(() => makeChanges(s))}><Icon n="edit" size={13} />Make changes</button>}
                      {curTab === 'mine' && s.status === 'Approved' && <button className="btn sm" title="Suggested: upload a revised version of a live SOP" onClick={stop(() => nav(`/sops/${s.id}/new-version`))}><Icon n="upload" size={13} />New version</button>}
                      <button className="btn sm icon ghost" title="View" aria-label={`View ${s.name}`} onClick={stop(() => nav(`/sops/${s.id}`))}><Icon n="eye" /></button>
                      <button className="btn sm icon ghost" title="Activity" aria-label={`Activity for ${s.name}`} onClick={stop(() => setActivityId(s.id))}><Icon n="history" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
