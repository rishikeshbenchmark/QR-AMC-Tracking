import { Stack, Tabs, Title } from '@mantine/core';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const TABS = [
  { value: 'categories', label: 'Categories' },
  { value: 'customers', label: 'Customers' },
  { value: 'suppliers', label: 'Suppliers' },
  { value: 'amc-suppliers', label: 'AMC Suppliers' },
  { value: 'makes', label: 'Makes' },
  { value: 'models', label: 'Models' },
  { value: 'amc-suppliers', label: 'AMC Suppliers' }

];

export function MastersPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab =
    TABS.find((tab) => location.pathname.includes(`/masters/${tab.value}`))
      ?.value ?? 'categories';

  return (
    <Stack>
      <Title order={1}>Masters</Title>

      <Tabs
        value={activeTab}
        onChange={(value) => value && navigate(`/masters/${value}`)}
      >
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