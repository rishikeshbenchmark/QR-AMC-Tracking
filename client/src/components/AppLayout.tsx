import { AppShell, Button, Group, Text } from '@mantine/core';
import { Outlet } from 'react-router-dom';

import { useAuth } from '@/auth/AuthContext';

/** Authenticated shell: a header with the current user + logout, and the routed page below. */
export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <AppShell header={{ height: 56 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Text fw={700}>QR-AMC</Text>
          <Group gap="sm">
            {user && (
              <Text size="sm" c="dimmed">
                {user.name} · {user.role}
              </Text>
            )}
            <Button variant="light" size="xs" onClick={logout}>
              Log out
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
