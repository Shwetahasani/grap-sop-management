import { Icon } from './Icon';
import { fileUrl } from '../utils/files';
import { fmtD, uname } from '../utils/format';

/** Render seeded redline markup: <x>removed</x> <y>added</y>.
 *  mode: 'new' (latest text), 'old' (previous text), 'diff' (highlighted). */
function mark(str, mode) {
  const out = [];
  const re = /<(x|y)>(.*?)<\/\1>/g;
  let last = 0, m, k = 0;
  while ((m = re.exec(str))) {
    if (m.index > last) out.push(str.slice(last, m.index));
    const [, t, txt] = m;
    if (mode === 'diff') out.push(<span key={k++} className={t === 'x' ? 'del' : 'ins'}>{txt}</span>);
    else if ((mode === 'new' && t === 'y') || (mode === 'old' && t === 'x')) out.push(txt);
    last = re.lastIndex;
  }
  if (last < str.length) out.push(str.slice(last));
  return out;
}

const STEPS = {
  Cards: ['Verify the customer and card details in CRM.', 'Fetch the transaction from the card management system.', 'Check eligibility against network rules.'],
  Payments: ['Verify the customer and fetch the transaction reference (RRN/UTR).', 'Check the transaction status with the switch / NPCI.', 'Confirm whether an auto-reversal has already happened.'],
  Loans: ['Verify the customer and loan account.', 'Check the loan ledger and charge history.', 'Validate against the applicable policy.'],
  ATM: ['Verify the customer, card and ATM ID.', 'Pull the EJ (electronic journal) and switch logs.', 'Coordinate with the branch / CRA for cash reconciliation.'],
  'Legal & Statutory': ['Log the notice in the legal register with date of receipt.', 'Identify the accounts and products involved.', 'Coordinate with the Legal / Compliance team.'],
  Deposits: ['Verify the customer and account.', 'Check the account status and documents.', 'Validate against KYC norms.'],
};

/** Sections of the simulated SOP document. */
export function docSections(s, v, mode) {
  const D = s.diff || [];
  const m = mode || (v >= s.version ? 'new' : 'old');
  const sec = (title, fallback) => {
    const d = D.find((x) => x[0] === title);
    return { changed: !!d, body: d ? mark(d[1], m) : fallback };
  };
  const proc = sec('3. Procedure', 'Draft the response using the approved template and close the case in GRAP.');
  return [
    { title: '1. Purpose', body: <>Defines how grievances related to <b>{s.sub || 'this category'}</b> are handled end to end, from receipt to closure.</> },
    { title: '2. Scope', body: 'Applies to the Nodal, CNO, PNO and MD desks handling customer grievances received through all channels.' },
    {
      title: '3. Procedure', changed: proc.changed,
      body: mode === 'diff' ? <>… {proc.body}</> : (
        <ol>{(STEPS[s.cat] || ['Verify the customer.', 'Fetch the relevant records.', 'Check against policy.']).map((x) => <li key={x}>{x}</li>)}<li>{proc.body}</li></ol>
      ),
    },
    { title: '4. Turnaround time', ...sec('4. Turnaround time', 'Resolve within the TAT defined in the CTST master for this sub-category.') },
    { title: '5. Escalation matrix', ...sec('5. Escalation matrix', 'L1 Team Lead · L2 Unit Head') },
    { title: '6. References', body: 'CTST master · Customer Rights Policy · Internal circulars as applicable.' },
  ];
}

function DocHeader({ s, v }) {
  return (
    <>
      <div className="ph"><span>Axis Bank · Internal</span><span>{s.id} · v{v}</span></div>
      <h4>{s.name || 'Untitled SOP'}</h4>
      <table><tbody>
        <tr><th>SOP ID</th><td>{s.id}</td><th>Version</th><td>v{v}</td></tr>
        <tr><th>Category</th><td>{s.cat || '—'}</td><th>Sub-category</th><td>{s.sub || '—'}</td></tr>
        <tr><th>Owner</th><td colSpan={3}>{uname(s.owner)}</td></tr>
      </tbody></table>
    </>
  );
}

const Empty = ({ title, children }) => (
  <div className="empty" style={{ padding: '40px 16px' }}>
    <div className="ei"><Icon n="file" /></div>{title && <h3>{title}</h3>}<p className="muted">{children}</p>
  </div>
);

export default function DocPreview({ file, sop, version, compact, zoom = 100 }) {
  const url = fileUrl(file);
  const paperStyle = { '--zf': `${(14 * zoom) / 100}px` };
  const viewerStyle = compact ? { maxHeight: 420 } : undefined;

  if (file?.type === 'pdf' && url)
    return <iframe className="pdfframe" style={compact ? { height: 420, minHeight: 0 } : undefined} title={`Preview of ${file.name}`} src={url} />;
  if (file?.type === 'docx' && file.paras?.length)
    return (
      <div className="viewer" style={viewerStyle}>
        <div className="paper" style={paperStyle}>
          <div className="ph"><span>{file.name}</span><span>Word preview</span></div>
          {file.paras.map((p, i) => (p.h === 1 ? <h4 key={i}>{p.t}</h4> : p.h ? <h5 key={i}>{p.t}</h5> : <p key={i}>{p.t}</p>))}
          <div className="pf">Text preview · formatting simplified</div>
        </div>
      </div>
    );
  if (file?.type === 'doc' && !file.sim)
    return <Empty title={file.name}>Preview isn't available for legacy .doc files in this POC.<br />In production the file would be converted to PDF on upload for preview.</Empty>;
  if (file?.type === 'pdf' && !file.sim && !file.sample)
    return <Empty title={file.name}>Large uploads aren't kept after a page reload in this POC, so the preview is unavailable.</Empty>;

  return (
    <div className="viewer" style={viewerStyle}>
      <div className="paper" style={paperStyle}>
        <DocHeader s={sop} v={version} />
        {docSections(sop, version).map((x) => (
          <div key={x.title}><h5>{x.title}</h5><div>{x.body}</div></div>
        ))}
        <div className="pf">Page 1 of 4 · {file?.sim ? 'sample document' : 'document preview'}</div>
      </div>
    </div>
  );
}

/** Version comparison: redline for seeded SOPs, change summary for uploads. */
export function ComparePane({ s }) {
  if (s.version < 2)
    return (
      <div className="empty"><div className="ei"><Icon n="layers" /></div><h3>This is the first version</h3><p className="muted">There's no earlier version to compare with yet.</p></div>
    );
  const pv = s.version - 1, D = s.diff;
  const vh = [...s.history].reverse().find((h) => h.ver === s.version && h.verFrom);
  return (
    <>
      <div className="vtool" style={{ borderTop: 0 }}>
        <span className="small"><b>Comparing v{pv}</b> (previous) with <b>v{s.version}</b> (this submission)</span>
        <span className="dlegend"><span><i style={{ background: '#d9f5e3' }} />Added</span><span><i style={{ background: '#fde0dd' }} />Removed</span></span>
      </div>
      <div className="viewer">
        <div className="paper">
          {D && D.length ? (
            <>
              <div className="ph"><span>v{pv} → v{s.version}</span><span>{D.length} section{D.length > 1 ? 's' : ''} changed</span></div>
              {docSections(s, s.version, 'diff').map((x) => (
                <div key={x.title} style={x.changed ? undefined : { opacity: 0.55 }}>
                  <h5>{x.title} {x.changed && <span className="tag amber" style={{ fontFamily: 'var(--font)' }}>changed</span>}</h5>
                  <div>{x.body}</div>
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="ph"><span>v{pv} → v{s.version}</span><span>Change summary</span></div>
              <table><tbody>
                <tr><th /><th>v{pv}</th><th>v{s.version}</th></tr>
                <tr><th>File</th><td>{s.files[pv]?.name || '—'}</td><td>{s.files[s.version]?.name || '—'}</td></tr>
                <tr><th>Uploaded</th><td>{fmtD(s.history.find((h) => h.ver === pv)?.ts || s.createdAt)}</td><td>{vh ? fmtD(vh.ts) : '—'}</td></tr>
              </tbody></table>
              <h5>What changed (from the creator)</h5>
              <p>{s.comments || vh?.remark || 'No change note was added.'}</p>
              <p className="pf">Line-by-line comparison is generated for Word/PDF text in production. In this POC, sample SOPs show a simulated redline.</p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
