import { Alert, Center, Stack, Text, Title } from '@mantine/core';
import { Outlet } from 'react-router-dom';

import { useAuth } from './AuthContext';

/**
 * Route-level permission gate — the client mirror of the server's requirePermission guard. The server
 * enforces this independently on every request; this only keeps a user out of a page they can't use.
 * A missing permission shows a forbidden notice rather than redirecting, so the user understands why.
 */
export function RequirePermission({ permission }: { permission: string }) {
  const { can } = useAuth();

  if (!can(permission)) {
    return (
      <Center mih="60vh" p="md">
        <Stack align="center" gap="sm" maw={420}>
          <Title order={3}>Not authorized</Title>
          <Alert color="yellow" variant="light">
            <Text size="sm">You don’t have permission to view this page.</Text>
          </Alert>
        </Stack>
      </Center>
    );
  }

  return <Outlet />;
}
