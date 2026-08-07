import { AppShell, Burger, Button, Group, NavLink, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconLayoutDashboard,
  IconStack2,
} from '@tabler/icons-react';
import { Link, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/auth/AuthContext';

interface NavItem {
  label: string;
  to: string;
  icon: typeof IconLayoutDashboard;
  permission?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    to: '/',
    icon: IconLayoutDashboard,
  },
  {
    label: 'Masters',
    to: '/masters/categories',
    icon: IconStack2,
    permission: 'master.manage',
  },
];

export function AppLayout() {
  const { user, logout, can } = useAuth();
  const location = useLocation();
  const [navOpened, { toggle: toggleNav, close: closeNav }] = useDisclosure();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.permission || can(item.permission),
  );

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !navOpened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger
              opened={navOpened}
              onClick={toggleNav}
              hiddenFrom="sm"
              size="sm"
            />
            <Text fw={700}>QR-AMC</Text>
          </Group>

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

      <AppShell.Navbar p="sm">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            component={Link}
            to={item.to}
            label={item.label}
            leftSection={<item.icon size={18} stroke={1.5} />}
            active={
              item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith('/masters')
            }
            onClick={closeNav}
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}