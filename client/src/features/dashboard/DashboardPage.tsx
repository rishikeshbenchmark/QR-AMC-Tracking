import { Badge, Card, Group, Stack, Text, Title } from '@mantine/core';

import { useAuth } from '@/auth/AuthContext';

/**
 * Placeholder authed landing. Its real job in Day 2 is to prove the loop end-to-end: it only
 * renders because /auth/me (during login or rehydrate) returned this user. Day 3+ replaces it
 * with the real dashboard.
 */
export function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <Stack maw={640}>
      <Title order={3}>Welcome, {user.name}</Title>
      <Card withBorder radius="md" p="lg">
        <Stack gap="xs">
          <Text>
            <Text span fw={600}>
              Email:
            </Text>{' '}
            {user.email}
          </Text>
          <Text>
            <Text span fw={600}>
              Role:
            </Text>{' '}
            {user.role}
          </Text>
          <Text fw={600}>Permissions</Text>
          <Group gap="xs">
            {user.permissions.map((permission) => (
              <Badge key={permission} variant="light">
                {permission}
              </Badge>
            ))}
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
}
