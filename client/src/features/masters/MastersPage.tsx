import { Stack, Tabs, Title } from '@mantine/core';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';

const TABS = [
  { value: 'categories', label: 'Categories' },
  { value: 'customers', label: 'Customers' },
  { value: 'suppliers', label: 'Suppliers' },
];

export function MastersPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = TABS.find((tab) => location.pathname.includes(`/masters/${tab.value}`))?.value
    ?? 'categories';

  return (
    <Stack maw={960}>
      <Title order={2}>Masters</Title>

      <Tabs value={activeTab} onChange={(value) => value && navigate(`/masters/${value}`)}>
        <Tabs.List>
          {TABS.map((tab) => (
            <Tabs.Tab key={tab.value} value={tab.value}>
              {tab.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>

      <Outlet />
    </Stack>
  );
}

