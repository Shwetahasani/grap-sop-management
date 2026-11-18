import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Modal from '../components/Modal';
import { Icon } from '../components/Icon';

/** UI-only state: toasts, confirmation dialog, activity drawer, guide, and the
 *  listing's tab / filters / sort (kept here so they survive navigation). */
const UICtx = createContext(null);
export const emptyFilters = () => ({ q: '', cat: '', sub: '', st: [], from: '', to: '' });

const TONES = {
  pri: ['var(--brand-50)', 'var(--brand)', 'pri', {}],
  ok: ['var(--green-bg)', 'var(--green)', 'ok', {}],
  danger: ['var(--red-bg)', 'var(--red)', 'danger', { background: 'var(--red)', color: '#fff', borderColor: 'var(--red)' }],
  warn: ['var(--amber-bg)', 'var(--amber)', 'warn', { background: '#b77700', color: '#fff', borderColor: '#b77700' }],
};

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((msg, type = 'success', action) => {
    const id = Math.random();
    setToasts((t) => [...t.slice(-1), { id, msg, type, action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? 6000 : 3800);
  }, []);
  const clearToasts = useCallback(() => setToasts([]), []);

  const [conf, setConf] = useState(null);
  const resolver = useRef(null);
  const confirm = useCallback((opts) => new Promise((res) => { resolver.current = res; setConf(opts); }), []);
  const closeConfirm = (v) => { setConf(null); resolver.current?.(v); resolver.current = null; };

  const [activityId, setActivityId] = useState(null);
  const [guideOpen, setGuideOpen] = useState(false);

  const [F, setF] = useState(emptyFilters);
  const [tab, setTab] = useState('mine');
  const [sort, setSort] = useState({ k: 'updatedAt', dir: -1 });
  const [flashId, setFlashId] = useState(null);
  const listLoaded = useRef(false); // skeleton only on the first list load after sign-in
  const resetList = useCallback(() => { setF(emptyFilters()); setTab('mine'); setSort({ k: 'updatedAt', dir: -1 }); listLoaded.current = false; }, []);

  const tone = TONES[conf?.tone || 'pri'];
  // Memoised so consumers don't re-render when only toasts / the confirm dialog change.
  const value = useMemo(() => ({
    toast, clearToasts, confirm, activityId, setActivityId, guideOpen, setGuideOpen,
    F, setF, tab, setTab, sort, setSort, flashId, setFlashId, resetList, listLoaded,
  }), [toast, clearToasts, confirm, activityId, guideOpen, F, tab, sort, flashId, resetList]);

  return (
    <UICtx.Provider value={value}>
      {children}

      <Modal open={!!conf} onClose={() => closeConfirm(false)} labelledBy="mTitle">
        {conf && (
          <>
            <div className="mhead">
              <span className="mic" style={{ background: tone[0], color: tone[1] }}><Icon n={conf.icon || 'info'} size={20} /></span>
              <div><h3 id="mTitle" style={{ fontSize: 17, marginTop: 8 }}>{conf.title}</h3></div>
            </div>
            <div className="mbody">{conf.body}</div>
            <div className="mfoot">
              {conf.cancel !== false && <button className="btn" onClick={() => closeConfirm(false)}>{conf.cancel || 'Cancel'}</button>}
              <button className={`btn ${tone[2]}`} style={tone[3]} data-autofocus data-confirm onClick={() => closeConfirm(true)}>
                {conf.ok || 'Confirm'}
              </button>
            </div>
          </>
        )}
      </Modal>

      <div className="toastwrap" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span className="ti"><Icon n={t.type === 'error' ? 'x' : t.type === 'info' ? 'info' : 'check'} /></span>
            <span>{t.msg}</span>
            {t.action && (
              <button onClick={() => { t.action.fn(); setToasts((x) => x.filter((y) => y.id !== t.id)); }}>{t.action.label}</button>
            )}
          </div>
        ))}
      </div>
    </UICtx.Provider>
  );
}

export const useUI = () => useContext(UICtx);

/** Navigate from places that may outlive their component (e.g. toast actions). */
export const goTo = (path) => { window.location.hash = '#' + path; };
