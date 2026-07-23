import { Center, Loader } from '@mantine/core';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from './AuthContext';

/**
 * Gate for authed routes. While the session is rehydrating we show a loader (not a redirect), so
 * a page refresh on a protected URL doesn't flash the login screen. An unauthenticated user is
 * sent to /login with the attempted path remembered for post-login return.
 */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
