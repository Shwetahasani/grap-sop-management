import { createHashRouter, Navigate, Outlet, RouterProvider, useParams } from 'react-router-dom';
import { StoreProvider } from './store/StoreContext';
import { UIProvider } from './store/UIContext';
import { IconSprite } from './components/Icon';
import GuidePanel from './components/GuidePanel';
import AppShell from './components/AppShell';
import Login from './pages/Login';
import NoAccess from './pages/NoAccess';
import SopList from './pages/SopList';
import SopForm from './pages/SopForm';
import SopReview from './pages/SopReview';
import NotFound from './pages/NotFound';

// `key` resets local state when the same page is opened for a different SOP.
function FormRoute({ mode }) {
  const { id } = useParams();
  return <SopForm key={mode + (id || '')} mode={mode} id={id} />;
}
function ReviewRoute({ review }) {
  const { id } = useParams();
  return <SopReview key={id + review} id={id} wantReview={review} />;
}
function Root() {
  return <><Outlet /><GuidePanel /></>;
}

// Hash routing so the build also works when opened straight from disk.
const router = createHashRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      { index: true, element: <Navigate to="/sops" replace /> },
      { path: 'login', element: <Login /> },
      { path: 'no-access', element: <NoAccess /> },
      {
        element: <AppShell />,
        children: [
          { path: 'sops', element: <SopList /> },
          { path: 'sops/new', element: <FormRoute mode="new" /> },
          { path: 'sops/:id/edit', element: <FormRoute mode="edit" /> },
          { path: 'sops/:id/new-version', element: <FormRoute mode="newver" /> },
          { path: 'sops/:id', element: <ReviewRoute review={false} /> },
          { path: 'sops/:id/review', element: <ReviewRoute review /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
]);

export default function App() {
  return (
    <StoreProvider>
      <UIProvider>
        <IconSprite />
        <RouterProvider router={router} />
      </UIProvider>
    </StoreProvider>
  );
}
