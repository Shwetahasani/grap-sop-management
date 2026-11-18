import { useEffect, useRef, useState } from 'react';
import { Link, useBlocker, useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { goTo, useUI } from '../store/UIContext';
import { CATS, EDITABLE_STATUSES, MAX_MB } from '../data/constants';
import { extOf, fmtDT, fmtSize, lastEvent, nextVersion, similar, sleep, uname } from '../utils/format';
import { cacheBlob, docxParas, readDataUrl, releaseBlob } from '../utils/files';
import { Badge, Icon } from '../components/Icon';
import DocPreview from '../components/DocPreview';
import NotFound from './NotFound';

const Err = ({ id, msg }) => (
  <div className="ferr" id={id} role={id === 'e-file' ? 'alert' : undefined}>
    {msg && <><Icon n="alert" size={14} style={{ marginTop: 2 }} /><span>{msg}</span></>}
  </div>
);

/** Screen 3 – Add / Edit SOP. mode: new | edit (Draft / Modification In Progress) | newver (from Approved). */
export default function SopForm({ mode, id }) {
  const { me, S, getSop, saveSop } = useStore();
  const { toast, confirm, setTab, setFlashId, setActivityId } = useUI();
  const nav = useNavigate();
  const [s0] = useState(() => (id ? getSop(id) : null)); // snapshot when the page opened

  const [name, setName] = useState(s0?.name || '');
  const [cat, setCat] = useState(s0?.cat || '');
  const [sub, setSub] = useState(s0?.sub || '');
  const [com, setCom] = useState(s0 && mode !== 'newver' ? s0.comments || '' : '');
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [summary, setSummary] = useState([]);
  const [dup, setDup] = useState(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(null);

  const dirty = useRef(false);
  const skipGuard = useRef(false);
  const fileInput = useRef(null);
  const refs = { name: useRef(null), cat: useRef(null), sub: useRef(null), file: useRef(null) };
  const touch = () => { dirty.current = true; };

  // Unsaved-changes guard for in-app navigation (incl. sign out / switch user) and tab close.
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    dirty.current && !skipGuard.current && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    confirm({ title: 'Leave without saving?', body: 'You have unsaved changes on this SOP. If you leave now they will be lost.', ok: 'Discard changes', cancel: 'Keep editing', tone: 'warn', icon: 'alert' })
      .then((ok) => (ok ? blocker.proceed() : blocker.reset()));
  }, [blocker, confirm]);
  useEffect(() => {
    const h = (e) => { if (dirty.current && !skipGuard.current) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, []);
  useEffect(() => { setTimeout(() => refs.name.current?.focus(), 50); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- permissions ----
  if (id && !s0) return <NotFound title="SOP not found" text={`There's no SOP with ID ${id}.`} />;
  const own = s0 && s0.owner === me.email;
  if (mode === 'edit' && !(own && EDITABLE_STATUSES.includes(s0.status)))
    return <NotFound title="This SOP can't be edited" text={`Only the creator can edit an SOP, and only while it is Draft or Modification In Progress. It is currently ${s0.status}.`}><Link className="btn pri" to={`/sops/${s0.id}`}>View SOP</Link></NotFound>;
  if (mode === 'newver' && !(own && s0.status === 'Approved'))
    return <NotFound title="New version not available" text="A new version can only be uploaded by the creator of an Approved SOP."><Link className="btn pri" to={`/sops/${s0.id}`}>View SOP</Link></NotFound>;

  const isMod = s0?.status === 'Modification In Progress';
  const changing = isMod || mode === 'newver';
  const v = nextVersion(s0, mode, !!file);
  const bumped = s0 && v > s0.version;
  const currentFile = file || (s0 && mode !== 'newver' ? s0.files[s0.version] : null);
  const reqEvent = isMod ? lastEvent(s0, 'Modification requested') : null;
  const title = mode === 'new' ? 'Add SOP' : mode === 'newver' ? 'Upload new version' : isMod ? 'Make requested changes' : 'Edit draft';

  const setErr = (k, msg) => setErrors((e) => ({ ...e, [k]: msg }));

  const handleFile = async (f) => {
    const e = extOf(f.name);
    if (!['pdf', 'doc', 'docx'].includes(e)) { setErr('file', `“${f.name}” can't be uploaded. Only Word (.doc, .docx) and PDF files are allowed.`); toast('File type not allowed', 'error'); return; }
    if (f.size > MAX_MB * 1048576) { setErr('file', `“${f.name}” is ${fmtSize(f.size)}. The maximum size is ${MAX_MB} MB.`); return; }
    if (f.size === 0) { setErr('file', `“${f.name}” is empty. Please choose another file.`); return; }
    setErr('file', '');
    const out = { name: f.name, size: f.size, type: e };
    if (e === 'pdf') {
      out.blob = cacheBlob(f);
      if (f.size < 1.5 * 1048576) { try { out.data = await readDataUrl(f); } catch { /* preview stays session-only */ } }
    }
    if (e === 'docx') { try { out.paras = (await docxParas(await f.arrayBuffer())).slice(0, 400); } catch { out.paras = null; } }
    // The previous upload in this form was never saved, so its preview URL can be released.
    setFile((prev) => { if (prev?.blob) releaseBlob(prev.blob); return out; }); touch();
    if (!name.trim()) { const n = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\bv\d+\b/i, '').trim(); setName(n); checkDup(n); }
    toast(`${f.name} uploaded`);
  };
  const useSample = () => {
    setFile({ name: 'UPI_Failed_Transaction_Refund_SOP.docx', size: 286720, type: 'docx', sample: true, paras: null });
    setErr('file', ''); touch();
    if (!name.trim()) { setName('UPI Failed Transaction Refund'); checkDup('UPI Failed Transaction Refund'); }
    toast('Sample file attached');
  };
  const checkDup = (n = name) => {
    const t = n.trim();
    setDup(t.length >= 4 ? S.sops.find((x) => x.id !== id && similar(t, x.name)) || null : null);
  };

  const focusField = (k) => {
    const el = k === 'file' ? refs.file.current?.querySelector('.drop,button') : refs[k].current;
    el?.focus(); el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };
  const validate = (submit) => {
    const errs = [];
    const n = name.trim();
    if (!n) errs.push(['name', 'Enter the SOP name.']);
    else if (n.length < 5) errs.push(['name', 'SOP name must be at least 5 characters.']);
    if (submit) {
      if (!currentFile) errs.push(['file', 'Upload the SOP document (Word or PDF).']);
      if (!cat) errs.push(['cat', 'Select a category.']);
      if (!sub) errs.push(['sub', 'Select a sub-category.']);
    }
    if (mode === 'newver' && !file && !errs.some((e) => e[0] === 'file')) errs.push(['file', 'Upload the revised file to create a new version.']);
    const map = {};
    errs.forEach(([k, msg]) => { if (!map[k]) map[k] = msg; });
    setErrors(map);
    setSummary(errs.length > 1 ? errs : []);
    if (errs.length) focusField(errs[0][0]);
    return !errs.length;
  };

  const save = async (submit) => {
    if (!validate(submit)) return;
    if (submit) {
      const ok = await confirm({
        title: isMod ? 'Resubmit for review?' : 'Submit for review?', icon: 'send', ok: isMod ? 'Resubmit' : 'Submit',
        body: <><b>{name.trim()}</b> · v{v}<br />{cat} › {sub}<p className="small" style={{ margin: '10px 0 0' }}>It will be sent to Reviewers and you won't be able to edit it until it's reviewed.</p></>,
      });
      if (!ok) return;
    }
    setBusy(submit ? 'submit' : 'save');
    await sleep(600);
    const r = saveSop({ mode, id: s0?.id, name: name.trim(), cat, sub, comments: com.trim(), file, submit });
    skipGuard.current = true;
    setTab('mine'); setFlashId(r.id);
    nav('/sops');
    toast(<><b>{r.id}</b> {submit ? `${isMod ? 'resubmitted' : 'submitted'} for review` : 'saved'} · status: {r.status}</>, 'success',
      { label: 'View', fn: () => goTo(`/sops/${r.id}`) });
  };

  return (
    <section aria-labelledby="ftitle">
      <div className="pbar">
        <button className="btn icon" onClick={() => nav('/sops')} aria-label="Back to SOP listing"><Icon n="left" /></button>
        <div className="ttl">
          <div className="crumb"><Link to="/sops">SOPs</Link> / <span>{s0 ? s0.id : 'New SOP'}</span></div>
          <h2 id="ftitle">{title}{s0 ? ` – ${s0.name}` : ''}</h2>
        </div>
        {s0 && <Badge s={s0.status} />}
      </div>

      {reqEvent && (
        <div className="banner amber"><Icon n="msg" />
          <div>
            <b>Changes requested by {uname(reqEvent.by)} · {fmtDT(reqEvent.ts)}</b>{reqEvent.remark}
            <div className="small" style={{ marginTop: 6 }}>
              Address the remarks, replace the file if needed, then click <b>Save &amp; Resubmit</b>.{' '}
              <a href="#activity" onClick={(e) => { e.preventDefault(); setActivityId(s0.id); }}>View full activity</a>
            </div>
          </div>
        </div>
      )}
      {mode === 'newver' && (
        <div className="banner info"><Icon n="layers" />
          <div><b>You're creating v{s0.version + 1} of a live SOP</b>v{s0.version} stays published in the knowledge base until the new version is approved.</div>
        </div>
      )}
      {summary.length > 1 && (
        <div className="banner red" role="alert"><Icon n="alert" />
          <div><b>Please fix {summary.length} issues before submitting:</b>
            {summary.map(([k, msg], i) => (
              <span key={k + i}>{i > 0 && ' · '}<a href={`#${k}`} onClick={(e) => { e.preventDefault(); focusField(k); }}>{msg}</a></span>
            ))}
          </div>
        </div>
      )}

      <form noValidate onSubmit={(e) => e.preventDefault()} onInput={touch}>
        <div className="fgrid">
          <div className="card pad">
            <div className="sec-h"><span className="sec-n">1</span><h3>SOP document</h3></div>
            <div ref={refs.file}
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}>
              {currentFile ? (
                <>
                  <div className="fileok">
                    <span className={`ficon ${extOf(currentFile.name)}`}>{extOf(currentFile.name).toUpperCase()}</span>
                    <div className="grow">
                      <div className="fn" title={currentFile.name}>{currentFile.name}</div>
                      <div className="small muted">{fmtSize(currentFile.size)} · {file ? 'Uploaded just now' : `v${s0.version} · current file`}</div>
                    </div>
                    <button className="btn sm" type="button" onClick={() => fileInput.current.click()}><Icon n="upload" size={13} />Replace</button>
                    {file && <button className="btn sm icon ghost" type="button" aria-label="Remove file" onClick={() => { setFile(null); touch(); }}><Icon n="x" /></button>}
                  </div>
                  <div className="help">Word (.doc, .docx) or PDF · up to {MAX_MB} MB · you can also drop a file here</div>
                </>
              ) : (
                <>
                  <div className={`drop ${over ? 'over' : ''} ${errors.file ? 'bad' : ''}`} role="button" tabIndex={0} aria-describedby="e-file"
                    onClick={() => fileInput.current.click()}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.current.click(); } }}>
                    <div className="di"><Icon n="upload" size={20} /></div>
                    <b>Drag &amp; drop your SOP here, or <span style={{ color: 'var(--brand)', textDecoration: 'underline' }}>browse</span></b>
                    <div className="help">Word (.doc, .docx) or PDF · up to {MAX_MB} MB</div>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: 8 }}>
                    <button type="button" className="btn sm ghost" onClick={useSample}><Icon n="file" size={13} />Use a sample file (demo)</button>
                  </div>
                </>
              )}
            </div>
            <Err id="e-file" msg={errors.file} />
            <input type="file" id="fileInput" ref={fileInput} className="sr" tabIndex={-1}
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => { const f = e.target.files[0]; if (f) handleFile(f); e.target.value = ''; }} />
            <div className="lbl" style={{ marginTop: 16 }}>Preview</div>
            <div className="card" style={{ overflow: 'hidden', boxShadow: 'none' }}>
              {currentFile
                ? <DocPreview compact file={currentFile} version={v} sop={s0 ? { ...s0, name: name || s0.name, cat, sub } : { id: 'New', name: name || 'New SOP', cat, sub, owner: me.email }} />
                : <div className="empty" style={{ padding: '40px 16px' }}><div className="ei"><Icon n="file" /></div><p className="muted" style={{ margin: 0 }}>Upload a file to see the preview here.</p></div>}
            </div>
          </div>

          <div className="card pad">
            <div className="sec-h"><span className="sec-n">2</span><h3>SOP details</h3></div>
            <div className="field">
              <label htmlFor="fName">SOP name <span className="req" aria-hidden="true">*</span></label>
              <input type="text" id="fName" ref={refs.name} maxLength={120} aria-required="true" aria-invalid={!!errors.name} aria-describedby="e-name w-name"
                placeholder="e.g. UPI Failed Transaction Refund" value={name}
                onChange={(e) => { setName(e.target.value); if (errors.name) setErr('name', ''); }} onBlur={() => checkDup()} />
              <Err id="e-name" msg={errors.name} />
              <div className="fwarn" id="w-name">
                {dup && <><Icon n="info" size={13} /> A similar SOP already exists: <b>{dup.id} · {dup.name}</b> ({dup.status}). If this is an update, consider uploading a new version of it instead.</>}
              </div>
            </div>
            <div className="row2">
              <div className="field">
                <label htmlFor="fCat">Category <span className="req" aria-hidden="true">*</span></label>
                <select id="fCat" ref={refs.cat} aria-required="true" aria-invalid={!!errors.cat} aria-describedby="e-cat" value={cat}
                  onChange={(e) => { setCat(e.target.value); setSub(''); setErr('cat', ''); }}>
                  <option value="">Select category</option>
                  {Object.keys(CATS).map((c) => <option key={c}>{c}</option>)}
                </select>
                <Err id="e-cat" msg={errors.cat} />
              </div>
              <div className="field">
                <label htmlFor="fSub">Sub-category <span className="req" aria-hidden="true">*</span></label>
                <select id="fSub" ref={refs.sub} aria-required="true" aria-invalid={!!errors.sub} aria-describedby="e-sub" value={sub} disabled={!cat}
                  onChange={(e) => { setSub(e.target.value); setErr('sub', ''); }}>
                  <option value="">{cat ? 'Select sub-category' : 'Select a category first'}</option>
                  {(CATS[cat] || []).map((c) => <option key={c}>{c}</option>)}
                </select>
                <Err id="e-sub" msg={errors.sub} />
              </div>
            </div>
            <div className="field">
              <span className="lbl" id="fVerLbl">Version</span>
              <div className="verbox" id="fVerBox" aria-labelledby="fVerLbl">
                <b>v{v}</b>
                {bumped ? <span className="tag green"><Icon n="layers" size={11} /> new version · was v{s0.version}</span>
                  : s0 ? <span className="tag">current</span> : <span className="tag">first version</span>}
              </div>
              <div className="help">
                {!s0 ? 'Set by the system. The SOP ID stays the same across versions.'
                  : isMod ? (bumped ? 'Replacing the file creates a new version. The SOP ID stays the same.' : 'Replace the file to create a new version, or keep the current file.')
                    : mode === 'newver' ? 'A new version is created when you upload the revised file.' : 'Set by the system.'}
              </div>
            </div>
            <div className="field">
              <label htmlFor="fCom">
                {changing ? 'What changed in this version?' : 'Comments'} <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>
                <span className="counter">{com.length} / 1000</span>
              </label>
              <textarea id="fCom" maxLength={1000} value={com} onChange={(e) => setCom(e.target.value)}
                placeholder={changing ? 'e.g. Added the escalation matrix and 5-day TAT for branch reconciliation.' : 'What does this SOP cover? Anything the reviewer should know?'} />
              <div className="help">{changing ? 'Recommended — reviewers see this first, so they can focus on what changed.' : 'Shown to the reviewer alongside the document.'}</div>
            </div>
          </div>
        </div>
      </form>

      <div className="stickybar">
        <span className="grow muted small">{mode === 'newver' ? 'Upload the revised file to continue.' : 'Drafts need only a name. Everything is checked when you submit.'}</span>
        <button className="btn" onClick={() => nav('/sops')}>Cancel</button>
        <button className="btn" id="saveBtn" disabled={!!busy} onClick={() => save(false)}>
          {busy === 'save' ? <><span className="spin" />Saving…</> : <><Icon n="save" />{isMod ? 'Save changes' : 'Save as draft'}</>}
        </button>
        <button className="btn pri" id="submitBtn" disabled={!!busy} onClick={() => save(true)}>
          {busy === 'submit' ? <><span className="spin" />Submitting…</> : <><Icon n="send" />{isMod ? 'Save & Resubmit' : 'Save & Submit'}</>}
        </button>
      </div>
    </section>
  );
}
