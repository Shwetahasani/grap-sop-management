import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { useUI } from '../store/UIContext';
import { LOGIN_USERS, USERS } from '../data/constants';
import { initials, sleep } from '../utils/format';
import { Icon } from '../components/Icon';
import Modal from '../components/Modal';
import { GuideButton } from '../components/GuidePanel';

/** Screen 1 – SSO sign-in (simulated). `?signout=1` signs out, `?switch=1` re-opens the picker. */
export default function Login() {
  const { me, signIn, signOut } = useStore();
  const { toast, clearToasts, resetList, setActivityId } = useUI();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [loading, setLoading] = useState(null);
  const [picker, setPicker] = useState(false);
  const handled = useRef(false);
  const flag = sp.get('signout') ? 'signout' : sp.get('switch') ? 'switch' : null;

  const startSSO = async () => {
    setLoading({ t: 'Redirecting to bank SSO…', s: 'Microsoft Entra ID (simulated)' });
    await sleep(700);
    setLoading(null);
    setPicker(true);
  };
  const pick = async (email) => {
    setPicker(false);
    setLoading({ t: 'Signing you in…', s: email });
    await sleep(650);
    setLoading(null);
    clearToasts(); resetList(); setActivityId(null);
    signIn(email);
    nav(USERS[email].role ? '/sops' : '/no-access', { replace: true });
  };

  useEffect(() => {
    if (!flag || handled.current) return;
    handled.current = true;
    signOut(); setActivityId(null);
    setSp({}, { replace: true });
    if (flag === 'signout') { clearToasts(); toast('You have been signed out', 'info'); }
    else startSSO();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flag]);

  if (me && !flag && !loading) return <Navigate to={me.role ? '/sops' : '/no-access'} replace />;

  return (
    <>
      <div className="login">
        <section className="lside" aria-label="About GRAP">
          <div className="wordmark"><span className="gtile">GRAP</span><span>Axis Bank · RetailOps</span></div>
          <h1>SOP Management</h1>
          <p>Grievance Resolution Automation Program — upload, review and publish standard operating procedures to the GRAP knowledge base.</p>
          <ul className="lpoints">
            <li><Icon n="upload" /><span>Upload SOPs in Word or PDF and track every version</span></li>
            <li><Icon n="check" /><span>Maker–Reviewer approval before anything is published</span></li>
            <li><Icon n="history" /><span>A complete, time-stamped audit trail for every SOP</span></li>
          </ul>
          <div className="lfoot">For internal use by authorised bank employees only. Activity is logged.</div>
        </section>
        <section className="lmain">
          <div className="lcard">
            <h2>Sign in</h2>
            <p className="muted" style={{ margin: 0 }}>Use your bank single sign-on account. There is no separate GRAP username or password.</p>
            <button className="btn pri lg ssobtn" id="ssoBtn" onClick={startSSO}><Icon n="shield" />Sign in with Axis Bank SSO</button>
            <p className="small muted" style={{ textAlign: 'center', margin: 0 }}>You'll be redirected to the bank's identity provider.</p>
            <div className="divider">Need help?</div>
            <div className="notice">
              <Icon n="info" style={{ color: 'var(--brand)' }} />
              <div>Can't sign in or see “Access not assigned”? Raise an access request for the <b>GRAP SOP – Maker</b> or <b>Reviewer</b> role through IT Service Desk.</div>
            </div>
          </div>
        </section>
      </div>

      <Modal open={picker} onClose={() => setPicker(false)} labelledBy="pickTitle">
        <div className="mhead">
          <span className="mic" style={{ background: 'var(--brand-50)', color: 'var(--brand)' }}><Icon n="shield" size={20} /></span>
          <div><h3 id="pickTitle" style={{ fontSize: 17 }}>Pick an account</h3><div className="small muted">Simulated SSO — choose a demo user to sign in as</div></div>
        </div>
        <div style={{ padding: '10px 22px 4px' }}>
          {LOGIN_USERS.map((e) => {
            const u = USERS[e];
            return (
              <button key={e} className="acct" onClick={() => pick(e)}>
                <span className="av">{initials(e)}</span>
                <span className="grow"><b>{u.name}</b><div className="em">{e}</div></span>
                {u.role ? <span className={`tag ${u.role === 'Reviewer' ? 'brand' : 'amber'}`}>{u.role}</span> : <span className="tag">No GRAP role</span>}
              </button>
            );
          })}
        </div>
        <div className="mfoot"><button className="btn" onClick={() => setPicker(false)}>Cancel</button></div>
      </Modal>

      {loading && (
        <div className="overlay-load" role="alert" aria-busy="true">
          <div><div className="bigspin" /><b>{loading.t}</b><div className="muted small">{loading.s}</div></div>
        </div>
      )}
      <div className="poc-ribbon" aria-hidden="true">POC · SIMULATED DATA</div>
      <GuideButton />
    </>
  );
}
