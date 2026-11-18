import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { useUI } from '../store/UIContext';
import { Icon } from './Icon';

export function GuideButton() {
  const { guideOpen, setGuideOpen } = useUI();
  return (
    <button className="gbtn" aria-expanded={guideOpen} onClick={() => setGuideOpen((o) => !o)}>
      <Icon n="help" />POC guide
    </button>
  );
}

export default function GuidePanel() {
  const { guideOpen, setGuideOpen, confirm, toast, resetList } = useUI();
  const { reset, me } = useStore();
  const nav = useNavigate();
  const loc = useLocation();
  if (!guideOpen) return null;

  const doReset = async () => {
    const ok = await confirm({ title: 'Reset demo data?', body: 'All SOPs, uploads and history go back to the original sample data.', ok: 'Reset', tone: 'warn', icon: 'refresh' });
    if (!ok) return;
    reset(); resetList(); setGuideOpen(false);
    if (me?.role && loc.pathname !== '/sops') nav('/sops');
    toast('Demo data reset', 'info');
  };

  return (
    <div className="guide" role="dialog" aria-label="POC guide" style={me?.role ? { bottom: 18 } : undefined}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <h3 style={{ flex: 1 }}>Try the full workflow</h3>
        <button className="btn icon ghost" aria-label="Close guide" onClick={() => setGuideOpen(false)}><Icon n="x" /></button>
      </div>
      <ol>
        <li>Sign in as <b>Anu Jha (Maker)</b> → <b>Add SOP</b> → upload any PDF/Word file (or “Use a sample file”) → <b>Save &amp; Submit</b>.</li>
        <li>Switch user (avatar menu) to <b>Priya Singh (Reviewer)</b> → <b>For My Review</b> → <b>Review</b> → <b>Request modification</b> with a remark.</li>
        <li>Switch back to Anu → <b>Make changes</b> → replace the file (creates v2) → <b>Save &amp; Resubmit</b> → status <b>Resubmitted</b>.</li>
        <li>As Priya → review again → <b>Compare versions</b> → <b>Approve &amp; publish</b>. Open <b>Activity</b> for the versioned history.</li>
        <li>Sign in as <b>Vikram Rao</b> to see <b>Access not assigned</b>.</li>
      </ol>
      <p className="muted small" style={{ margin: '8px 0' }}>SSO, file storage, notifications and knowledge-base publishing are simulated in the browser. Data is kept in this browser's local storage.</p>
      <button className="btn sm" onClick={doReset}><Icon n="refresh" />Reset demo data</button>
    </div>
  );
}
