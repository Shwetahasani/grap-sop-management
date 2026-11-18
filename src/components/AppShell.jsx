import { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import Header from './Header';
import ActivityDrawer from './ActivityDrawer';

/** Authenticated layout: role guard, header, main region, activity drawer. */
export default function AppShell() {
  const { me } = useStore();
  const loc = useLocation();
  const mainRef = useRef(null);

  useEffect(() => {
    document.body.classList.add('inapp');
    return () => document.body.classList.remove('inapp');
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [loc.pathname]);

  if (!me) return <Navigate to="/login" replace />;
  if (!me.role) return <Navigate to="/no-access" replace />;

  return (
    <>
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}>Skip to main content</a>
      <Header />
      <main id="main" ref={mainRef} tabIndex={-1}>
        <Outlet />
      </main>
      <ActivityDrawer />
    </>
  );
}
