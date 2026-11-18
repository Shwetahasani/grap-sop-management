import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { useUI } from '../store/UIContext';
import { ago, initials, uname } from '../utils/format';
import { Icon } from './Icon';

const KIND = {
  in: ['var(--blue-bg)', 'var(--blue)', 'inbox'],
  ok: ['var(--green-bg)', 'var(--green)', 'check'],
  mod: ['var(--amber-bg)', 'var(--amber)', 'edit'],
  rej: ['var(--red-bg)', 'var(--red)', 'x'],
};

export default function Header() {
  const { S, me, markRead, markAllRead, reset } = useStore();
  const { F, setF, setGuideOpen, confirm, toast, resetList } = useUI();
  const nav = useNavigate();
  const loc = useLocation();
  const [menu, setMenu] = useState(null);
  const searchRef = useRef(null);
  const leaving = useRef(false);

  useEffect(() => {
    const onDown = (e) => { if (!e.target.closest('.menu,.tbtn')) setMenu(null); };
    const onKey = (e) => {
      if (e.key === 'Escape') setMenu(null);
      if (e.key === '/' && !document.querySelector('.ov.show') && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, []);
  useEffect(() => setMenu(null), [loc.pathname]);

  // Recomputed only when notifications or the signed-in user change (not on every keystroke in search).
  const notifs = useMemo(
    () => S.notifs.map((n, i) => ({ ...n, i })).filter((n) => n.to === me.email).sort((a, b) => new Date(b.ts) - new Date(a.ts)),
    [S.notifs, me.email],
  );
  const unread = useMemo(() => notifs.filter((n) => !n.read).length, [notifs]);

  const onSearch = (v) => {
    setF((f) => ({ ...f, q: v }));
    if (loc.pathname !== '/sops' && !leaving.current) {
      leaving.current = true;
      nav('/sops');
      setTimeout(() => { leaving.current = false; }, 600);
    }
  };
  const doReset = async () => {
    setMenu(null);
    if (!(await confirm({ title: 'Reset demo data?', body: 'All SOPs, uploads and history go back to the original sample data.', ok: 'Reset', tone: 'warn', icon: 'refresh' }))) return;
    reset(); resetList(); nav('/sops'); toast('Demo data reset', 'info');
  };

  return (
    <>
      <header className="top">
        <div className="wordmark" role="link" tabIndex={0} title="Go to SOP listing" onClick={() => nav('/sops')} onKeyDown={(e) => e.key === 'Enter' && nav('/sops')}>
          <span className="gtile">GRAP</span><span className="wtxt">SOP Management</span>
          <span className="pocchip" title="Proof of concept – simulated data">POC</span>
        </div>
        <div className="gs" role="search">
          <Icon n="search" />
          <label htmlFor="gsearch" className="sr">Search SOP name or ID</label>
          <input id="gsearch" ref={searchRef} type="search" placeholder="Search SOP name or ID" value={F.q} onChange={(e) => onSearch(e.target.value)} />
          <kbd>/</kbd>
        </div>
        <div className="tright">
          <button className="tbtn" aria-haspopup="true" aria-expanded={menu === 'notif'} aria-label={`Notifications, ${unread} unread`} onClick={() => setMenu(menu === 'notif' ? null : 'notif')}>
            <Icon n="bell" />{unread > 0 && <span className="ndot">{unread}</span>}
          </button>
          <button className="tbtn" aria-haspopup="true" aria-expanded={menu === 'user'} onClick={() => setMenu(menu === 'user' ? null : 'user')}>
            <span className="av">{initials(me.email)}</span>
            <span className="who"><b>{me.name}</b><span className={`role ${me.role}`}>{me.role}</span></span>
            <Icon n="down" size={14} style={{ opacity: 0.8 }} />
          </button>
          <button className="tbtn" title="Sign out" onClick={() => nav('/login?signout=1')}><Icon n="logout" /><span className="small">Sign out</span></button>
        </div>
      </header>

      {menu === 'notif' && (
        <div className="menu" role="dialog" aria-label="Notifications">
          <header>
            <b>Notifications</b>
            {unread > 0 && <button className="btn sm ghost" onClick={markAllRead}>Mark all as read</button>}
          </header>
          {notifs.length ? notifs.map((n) => {
            const k = KIND[n.kind] || KIND.in;
            return (
              <button key={n.i} className={`nitem ${n.read ? '' : 'unread'}`} onClick={() => { markRead(n.i); setMenu(null); nav(`/sops/${n.sop}`); }}>
                <span className="nic" style={{ background: k[0], color: k[1] }}><Icon n={k[2]} size={14} /></span>
                <span><span><b>{uname(n.actor)}</b> {n.verb} <b>{n.sopName}</b>{n.extra}</span><div className="small muted">{ago(n.ts)}</div></span>
              </button>
            );
          }) : (
            <div className="empty" style={{ padding: 28 }}><div className="ei"><Icon n="bell" /></div>You're all caught up.</div>
          )}
        </div>
      )}

      {menu === 'user' && (
        <div className="menu umenu" role="menu">
          <div className="uh">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span className="av">{initials(me.email)}</span>
              <div><b>{me.name}</b><div className="small muted">{me.email}</div></div>
            </div>
            <div className="small" style={{ marginTop: 8 }}>
              Persona: <span className={`tag ${me.role === 'Reviewer' ? 'brand' : 'amber'}`}>{me.role}</span> · {me.unit}
            </div>
          </div>
          <button role="menuitem" onClick={() => nav('/login?switch=1')}><Icon n="swap" />Switch demo user</button>
          <button role="menuitem" onClick={() => { setMenu(null); setGuideOpen(true); }}><Icon n="help" />POC guide</button>
          <button role="menuitem" onClick={doReset}><Icon n="refresh" />Reset demo data</button>
          <button role="menuitem" onClick={() => nav('/login?signout=1')}><Icon n="logout" />Sign out</button>
        </div>
      )}
    </>
  );
}
