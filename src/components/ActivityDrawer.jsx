import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/StoreContext';
import { useUI } from '../store/UIContext';
import { fmtD, fmtDT, uname } from '../utils/format';
import { useDialogFocus } from './Modal';
import { Badge, Icon } from './Icon';

const ICONS = {
  Created: ['plus', 'var(--grey-bg)', 'var(--grey)'],
  Submitted: ['send', 'var(--blue-bg)', 'var(--blue)'],
  'New version submitted': ['layers', 'var(--blue-bg)', 'var(--blue)'],
  'New version drafted': ['layers', 'var(--grey-bg)', 'var(--grey)'],
  Resubmitted: ['send', 'var(--indigo-bg)', 'var(--indigo)'],
  'Modification requested': ['edit', 'var(--amber-bg)', 'var(--amber)'],
  'Changes started': ['edit', 'var(--orange-bg)', 'var(--orange)'],
  Approved: ['check', 'var(--green-bg)', 'var(--green)'],
  Rejected: ['x', 'var(--red-bg)', 'var(--red)'],
};
const iconFor = (a) => ICONS[a] || (/saved/i.test(a) ? ['save', 'var(--grey-bg)', 'var(--grey)'] : ['history', 'var(--grey-bg)', 'var(--grey)']);
const DECISIONS = ['Approved', 'Rejected', 'Modification requested'];

function exportCsv(s, toast) {
  const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [['SOP ID', 'SOP name', 'Date & time', 'Action', 'Done by', 'Email', 'Status before', 'Status after', 'Version', 'File version change', 'Remarks']]
    .concat([...s.history].reverse().map((h) => [s.id, s.name, fmtDT(h.ts), h.action, uname(h.by), h.by, h.from, h.to, 'v' + h.ver, h.verFrom ? `v${h.verFrom} → v${h.ver}` : '', h.remark]));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + rows.map((r) => r.map(q).join(',')).join('\n')], { type: 'text/csv' }));
  a.download = `${s.id}_activity.csv`;
  a.click();
  toast('Activity exported as CSV');
}

/** Screen 4 – SOP Activity: full history, newest first. */
export default function ActivityDrawer() {
  const { activityId, setActivityId, toast } = useUI();
  const { getSop } = useStore();
  const [filter, setFilter] = useState('all');
  const ref = useRef(null);
  const s = activityId ? getSop(activityId) : null;
  const close = () => setActivityId(null);
  useDialogFocus(!!s, ref, close);
  useEffect(() => setFilter('all'), [activityId]);
  if (!s) return null;

  const versions = [...new Set(s.history.map((h) => h.ver))];
  const list = [...s.history].reverse().filter((h) =>
    filter === 'all' || (filter === 'decisions' ? DECISIONS.includes(h.action) : h.ver === +filter));
  let lastDay = '';

  return (
    <div className="ov show" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="drawer" role="dialog" aria-modal="true" aria-labelledby="dTitle" ref={ref}>
        <div className="dhead">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="small muted">Activity · {s.id}</div>
              <h2 id="dTitle" style={{ margin: '2px 0 6px' }}>{s.name}</h2>
              <Badge s={s.status} /> <span className="tag">v{s.version}</span> <span className="small muted">· {s.history.length} events</span>
            </div>
            <button className="btn icon ghost" onClick={close} aria-label="Close activity"><Icon n="x" /></button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <label htmlFor="actf" className="sr">Filter activity</label>
            <select id="actf" style={{ width: 'auto' }} value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All activity</option>
              <option value="decisions">Review decisions only</option>
              {versions.map((v) => <option key={v} value={String(v)}>Version v{v}</option>)}
            </select>
            <button className="btn sm" style={{ marginLeft: 'auto' }} onClick={() => exportCsv(s, toast)}><Icon n="download" size={13} />Export CSV</button>
          </div>
        </div>
        <div className="dbody">
          {list.length ? (
            <ul className="tl">
              {list.map((h, i) => {
                const p = iconFor(h.action);
                const day = fmtD(h.ts);
                const showDay = day !== lastDay;
                lastDay = day;
                return [
                  showDay && <li key={'d' + i} className="day" aria-hidden="true">{day === fmtD(Date.now()) ? 'Today' : day}</li>,
                  <li key={i}>
                    <span className="dot" style={{ background: p[1], color: p[2] }}><Icon n={p[0]} /></span>
                    <div className="t1">
                      <b>{h.action}</b>
                      {h.verFrom ? <span className="tag green"><Icon n="layers" size={11} /> File v{h.verFrom} → v{h.ver}</span> : <span className="tag">v{h.ver}</span>}
                    </div>
                    <div className="meta">
                      <time dateTime={h.ts}>{fmtDT(h.ts)}</time> · <b style={{ color: 'var(--ink-2)' }}>{uname(h.by)}</b> <span>({h.by})</span>
                    </div>
                    <div className="st">
                      <span className="small muted">Status:</span>
                      {h.from === '—' ? <span className="small muted">—</span> : <Badge s={h.from} />}
                      <span className="muted">→</span><Badge s={h.to} />
                    </div>
                    {h.remark && <div className="rmk"><Icon n="msg" size={13} style={{ color: 'var(--muted)' }} /> {h.remark}</div>}
                  </li>,
                ];
              })}
            </ul>
          ) : <div className="empty">No activity matches this filter.</div>}
        </div>
      </div>
    </div>
  );
}
