import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { useUI } from '../store/UIContext';
import { Icon } from '../components/Icon';
import { GuideButton } from '../components/GuidePanel';

/** Signed in through SSO, but no Maker/Reviewer persona assigned. */
export default function NoAccess() {
  const { me } = useStore();
  const { toast } = useUI();
  const [req, setReq] = useState('idle');
  if (!me) return <Navigate to="/login" replace />;
  if (me.role) return <Navigate to="/sops" replace />;

  const request = () => {
    setReq('sending');
    setTimeout(() => {
      setReq('sent');
      toast(`Access request raised · Ref ACC-${Math.floor(100000 + Math.random() * 899999)} (simulated)`);
    }, 800);
  };

  return (
    <>
      <div className="denied">
        <div className="dcard" role="alert">
          <div className="dicon"><Icon n="lock" /></div>
          <h2>Access not assigned</h2>
          <p className="muted" style={{ margin: '8px 0 0' }}>
            You're signed in as <b>{me.name}</b> ({me.email}), but your account doesn't have a GRAP SOP Management role yet.
          </p>
          <ol>
            <li>Ask your manager to raise an access request for the <b>GRAP SOP – Maker</b> or <b>GRAP SOP – Reviewer</b> role.</li>
            <li>Once approved, sign out and sign in again — your access is picked up automatically.</li>
          </ol>
          <div className="acts" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn pri" disabled={req !== 'idle'} onClick={request}>
              {req === 'sending' ? <><span className="spin" />Sending…</> : req === 'sent' ? <><Icon n="check" />Request sent</> : 'Request access'}
            </button>
            <Link className="btn" to="/login?signout=1">Sign in with a different account</Link>
          </div>
        </div>
      </div>
      <div className="poc-ribbon" aria-hidden="true">POC · SIMULATED DATA</div>
      <GuideButton />
    </>
  );
}
