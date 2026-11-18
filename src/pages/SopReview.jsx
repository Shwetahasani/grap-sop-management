import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { goTo, useUI } from '../store/UIContext';
import { EDITABLE_STATUSES, REVIEW_STATUSES } from '../data/constants';
import { ago, fmtDT, lastEvent, sleep, uname } from '../utils/format';
import { fileUrl } from '../utils/files';
import { Badge, Icon } from '../components/Icon';
import DocPreview, { ComparePane } from '../components/DocPreview';
import Modal from '../components/Modal';
import NotFound from './NotFound';

const QUICK = ['Escalation matrix is missing.', "TAT doesn't match the CTST master.", 'Please use the latest SOP template.', 'Duplicates an existing live SOP.'];
const NEXT = { Draft: 'Submitted', Submitted: 'Review decision', Resubmitted: 'Review decision', 'Requested Modification': 'Modification In Progress', 'Modification In Progress': 'Resubmitted' };

/** Screen 4 – View / Review SOP. Review controls appear only for a Reviewer who isn't the creator. */
export default function SopReview({ id, wantReview }) {
  const { me, getSop, decide, startChanges } = useStore();
  const { toast, confirm, setActivityId, setTab } = useUI();
  const nav = useNavigate();
  const s = getSop(id);
  const [docMode, setDocMode] = useState('doc');
  const [zoom, setZoom] = useState(100);
  const [rem, setRem] = useState('');
  const [remErr, setRemErr] = useState('');
  const [busy, setBusy] = useState(null);
  const [full, setFull] = useState(false);

  const canReview = !!s && me.role === 'Reviewer' && s.owner !== me.email && REVIEW_STATUSES.includes(s.status);
  const reviewMode = canReview && wantReview;
  useEffect(() => {
    if (reviewMode && s.status === 'Resubmitted' && s.version > 1)
      setTimeout(() => toast(<>Tip: use <b>Compare versions</b> to see only what changed</>, 'info'), 400);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!s) return <NotFound title="SOP not found" text={`There's no SOP with ID ${id}.`} />;

  const own = s.owner === me.email;
  const file = s.files[s.version];
  const lastMod = lastEvent(s, 'Modification requested');
  const approvedEv = lastEvent(s, 'Approved');
  const rejectedEv = lastEvent(s, 'Rejected');
  const path = [];
  s.history.forEach((h) => { if (path[path.length - 1] !== h.to) path.push(h.to); });

  const makeChanges = () => { startChanges(s.id); toast(<>Status changed to <b>Modification In Progress</b></>, 'info'); nav(`/sops/${s.id}/edit`); };
  const addRemark = (t) => { setRem((r) => (r.trim() ? r.trim() + ' ' : '') + t); setRemErr(''); document.getElementById('rem')?.focus(); };
  const download = () => {
    const url = fileUrl(file);
    if (!url) { toast(`Download of ${file?.name || 'file'} simulated in this POC`, 'info'); return; }
    const a = document.createElement('a'); a.href = url; a.download = file.name; a.click();
  };

  const onDecide = async (d) => {
    const r = rem.trim();
    if (d !== 'Approved' && !r) {
      setRemErr(`Remarks are required to ${d === 'Rejected' ? 'reject' : 'request modification'}. Tell ${uname(s.owner).split(' ')[0]} what needs to change.`);
      document.getElementById('rem')?.focus();
      return;
    }
    const quote = r ? <div className="quote" style={{ marginTop: 10 }}>{r}</div> : null;
    const cfg = {
      Approved: { title: 'Approve and publish this SOP?', ok: 'Approve & publish', tone: 'ok', icon: 'check',
        body: <><b>{s.name}</b> v{s.version} will be published to the GRAP knowledge base{s.liveVersion ? ` and will replace v${s.liveVersion}` : ''}.{quote}</> },
      Rejected: { title: 'Reject this SOP?', ok: 'Reject SOP', tone: 'danger', icon: 'x',
        body: <><b>{s.name}</b> v{s.version} will be marked <b>Rejected</b>. {uname(s.owner)} will be notified with your remarks:{quote}</> },
      'Requested Modification': { title: 'Send back for changes?', ok: 'Request modification', tone: 'warn', icon: 'edit',
        body: <>{uname(s.owner)} will be asked to update <b>{s.name}</b> with your remarks:{quote}</> },
    }[d];
    if (!(await confirm(cfg))) return;
    setBusy(d);
    await sleep(700);
    const after = decide(s.id, d, r);
    setTab('review');
    nav('/sops');
    toast(
      d === 'Approved' ? <><b>{s.id} v{after.version}</b> approved and published to the knowledge base</>
        : d === 'Rejected' ? <><b>{s.id}</b> rejected · {uname(s.owner)} notified</>
          : <>Sent back to {uname(s.owner)} for changes</>,
      'success', { label: 'Activity', fn: () => { goTo('/sops'); setTimeout(() => setActivityId(s.id), 50); } });
  };

  const nextText = {
    Draft: own ? "This is a draft. Edit it and click Save & Submit when it's ready." : 'Draft – not yet submitted.',
    Submitted: 'Waiting for a reviewer.',
    Resubmitted: 'Changes were made — waiting for a reviewer.',
    'Requested Modification': own ? 'A reviewer asked for changes. Click Make changes to start.' : 'Waiting for the creator to make changes.',
    'Modification In Progress': own ? "You're working on the requested changes. Resubmit when done." : 'The creator is working on the changes.',
    Approved: 'Published. Upload a new version when the process changes.',
    Rejected: "This SOP was not approved. See the reviewer's remarks above.",
  }[s.status];

  return (
    <section aria-labelledby="rtitle">
      <div className="pbar">
        <button className="btn icon" onClick={() => nav('/sops')} aria-label="Back to SOP listing"><Icon n="left" /></button>
        <div className="ttl">
          <div className="crumb"><Link to="/sops">SOPs</Link> / <span>{s.id}</span></div>
          <h2 id="rtitle">{s.name}</h2>
        </div>
        <span><Badge s={s.status} /> <span className="tag" style={{ marginLeft: 4 }}>v{s.version}</span></span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => setActivityId(s.id)}><Icon n="history" />Activity</button>
          {own && EDITABLE_STATUSES.includes(s.status) && <button className="btn pri" onClick={() => nav(`/sops/${s.id}/edit`)}><Icon n="edit" />Edit</button>}
          {own && s.status === 'Requested Modification' && <button className="btn pri" onClick={makeChanges}><Icon n="edit" />Make changes</button>}
          {own && s.status === 'Approved' && <button className="btn" onClick={() => nav(`/sops/${s.id}/new-version`)}><Icon n="upload" />New version</button>}
          {canReview && !reviewMode && <button className="btn pri" onClick={() => nav(`/sops/${s.id}/review`)}>Review</button>}
        </div>
      </div>

      {me.role === 'Reviewer' && own && REVIEW_STATUSES.includes(s.status) && (
        <div className="banner info"><Icon n="info" /><div><b>You can't review your own SOP</b>Another reviewer will pick this up from their “For My Review” list.</div></div>
      )}
      {s.status === 'Rejected' && rejectedEv && (
        <div className="banner red"><Icon n="x" /><div><b>Rejected by {uname(rejectedEv.by)} · {fmtDT(rejectedEv.ts)}</b>{rejectedEv.remark}</div></div>
      )}
      {s.status === 'Requested Modification' && own && lastMod && (
        <div className="banner amber"><Icon n="msg" />
          <div><b>{uname(lastMod.by)} requested changes · {fmtDT(lastMod.ts)}</b>{lastMod.remark}
            <div style={{ marginTop: 8 }}><button className="btn sm warn" onClick={makeChanges}>Make changes</button></div>
          </div>
        </div>
      )}
      {s.status === 'Approved' && approvedEv && (
        <div className="banner green"><Icon n="check" />
          <div><b>Live in the GRAP knowledge base</b>v{s.version} was approved by {uname(approvedEv.by)} on {fmtDT(approvedEv.ts)}.</div>
        </div>
      )}

      <div className="rgrid">
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="path" aria-label="Status history">
            <span className="small muted" style={{ marginRight: 4 }}>Journey:</span>
            {path.map((p, i) => <span key={i} style={{ display: 'contents' }}>{i > 0 && <span className="arr">→</span>}<Badge s={p} /></span>)}
            {NEXT[s.status] && <><span className="arr">→</span><Badge s={`Next: ${NEXT[s.status]}`} next /></>}
          </div>
          <div className="vtool">
            <div className="seg" role="tablist" aria-label="Document view">
              <button role="tab" id="tb-doc" aria-selected={docMode === 'doc'} onClick={() => setDocMode('doc')}>Document</button>
              <button role="tab" id="tb-cmp" aria-selected={docMode === 'cmp'} onClick={() => setDocMode('cmp')}>Compare versions</button>
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginLeft: 'auto', visibility: docMode === 'doc' ? 'visible' : 'hidden' }}>
              <button className="btn icon ghost" onClick={() => setZoom((z) => Math.max(70, z - 10))} aria-label="Zoom out">−</button>
              <span className="small muted" style={{ minWidth: 40, textAlign: 'center' }}>{zoom}%</span>
              <button className="btn icon ghost" onClick={() => setZoom((z) => Math.min(160, z + 10))} aria-label="Zoom in">+</button>
              <span className="sep" />
              <button className="btn icon ghost" onClick={download} aria-label="Download file" title="Download"><Icon n="download" /></button>
              <button className="btn icon ghost" onClick={() => setFull(true)} aria-label="Open full screen" title="Full screen"><Icon n="max" /></button>
            </div>
          </div>
          <div id="docpane">
            {docMode === 'doc' ? <DocPreview file={file} sop={s} version={s.version} zoom={zoom} /> : <ComparePane s={s} />}
          </div>
        </div>

        <aside className="rside">
          <div className="card pad">
            <h3 style={{ marginBottom: 12 }}>SOP details</h3>
            <dl className="kv">
              <dt>SOP ID</dt><dd className="mono">{s.id}</dd>
              <dt>SOP name</dt><dd>{s.name}</dd>
              <dt>Version</dt><dd>v{s.version}{s.liveVersion && s.liveVersion !== s.version && <span className="small muted"> (live: v{s.liveVersion})</span>}</dd>
              <dt>Category</dt><dd>{s.cat}</dd>
              <dt>Sub-category</dt><dd>{s.sub}</dd>
              <dt>Uploaded by</dt><dd>{uname(s.owner)}<div className="small muted">{s.owner}</div></dd>
              <dt>Created</dt><dd>{fmtDT(s.createdAt)}</dd>
              <dt>Last updated</dt><dd>{fmtDT(s.updatedAt)}</dd>
              <dt>File</dt><dd className="small">{file?.name || '—'}</dd>
            </dl>
            <div className="lbl" style={{ marginTop: 14 }}>Creator's comments</div>
            <div className="quote brand">{s.comments || <span className="muted">No comments added.</span>}</div>
            {s.status === 'Resubmitted' && lastMod && (
              <>
                <div className="lbl" style={{ marginTop: 14 }}>Previous review round</div>
                <div className="quote amber"><b>{uname(lastMod.by)}</b> asked (v{lastMod.ver}): {lastMod.remark}</div>
              </>
            )}
          </div>

          {reviewMode ? (
            <div className="card pad">
              <h3 style={{ marginBottom: 4 }}>Your review</h3>
              <p className="small muted" style={{ margin: '0 0 12px' }}>
                {s.status === 'Resubmitted' ? <>This SOP was resubmitted after changes. Use <b>Compare versions</b> to check only what changed.</> : 'Check the document, then record your decision.'}
              </p>
              <details className="chk" style={{ marginBottom: 12 }}>
                <summary>Review checklist (optional)</summary>
                {['Uses the latest SOP template', 'TAT matches the CTST master', 'Escalation matrix is complete', 'No conflict with an existing live SOP'].map((c) => (
                  <label key={c}><input type="checkbox" /> {c}</label>
                ))}
              </details>
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="rem">Remarks <span className="muted" style={{ fontWeight: 400 }}>— required to reject or request modification</span><span className="counter">{rem.length} / 1000</span></label>
                <textarea id="rem" maxLength={1000} aria-invalid={!!remErr} aria-describedby="e-rem" placeholder="Add your remarks for the creator…" value={rem}
                  onChange={(e) => { setRem(e.target.value); if (e.target.value.trim()) setRemErr(''); }} />
                <div className="ferr" id="e-rem" role="alert">{remErr && <><Icon n="alert" size={14} style={{ marginTop: 2 }} /><span>{remErr}</span></>}</div>
                <div className="qp" aria-label="Quick remarks">
                  {QUICK.map((q) => <button key={q} type="button" onClick={() => addRemark(q)}>{q}</button>)}
                </div>
              </div>
              <div className="decide">
                <button className="btn danger" disabled={!!busy} onClick={() => onDecide('Rejected')}>{busy === 'Rejected' ? <span className="spin" /> : <Icon n="x" />}Reject</button>
                <button className="btn warn" disabled={!!busy} onClick={() => onDecide('Requested Modification')}>{busy === 'Requested Modification' ? <span className="spin" /> : <Icon n="edit" />}Request modification</button>
                <button className="btn ok" disabled={!!busy} onClick={() => onDecide('Approved')}>{busy === 'Approved' ? <span className="spin" /> : <Icon n="check" />}Approve &amp; publish</button>
              </div>
            </div>
          ) : (
            <div className="nextbox"><Icon n="info" /><span><b>What's next:</b> {nextText}</span></div>
          )}

          <div className="card pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h3>Recent activity</h3>
              <button className="btn sm ghost" onClick={() => setActivityId(s.id)}>View all</button>
            </div>
            {[...s.history].reverse().slice(0, 3).map((h, i) => (
              <div key={i} style={{ padding: '8px 0', borderTop: '1px solid var(--line-2)', fontSize: 13 }}>
                <b>{h.action}</b> · v{h.ver}<div className="small muted">{uname(h.by)} · {ago(h.ts)}</div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <Modal open={full} onClose={() => setFull(false)} wide labelledBy="fullTitle">
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
          <b id="fullTitle">{s.name} · v{s.version}</b>
          <button className="btn icon ghost" style={{ marginLeft: 'auto' }} aria-label="Close" onClick={() => setFull(false)}><Icon n="x" /></button>
        </div>
        <DocPreview file={file} sop={s} version={s.version} />
      </Modal>
    </section>
  );
}
