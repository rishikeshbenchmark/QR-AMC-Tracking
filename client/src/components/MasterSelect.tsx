import { Combobox, InputBase, Loader, useCombobox } from '@mantine/core';
import { useState } from 'react';

export interface MasterOption {
  value: string;
  label: string;
}

interface MasterSelectProps {
  label?: string;
  placeholder?: string;
  /** Options for the current tenant, already loaded by the feature. */
  data: MasterOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  /**
   * Creates a new master row on the fly (the backend POST doubles as this path — CLAUDE.md). Resolves
   * with the created option so the field can select it immediately. Errors bubble to the caller.
   */
  onCreate: (name: string) => Promise<MasterOption>;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  /** Options are still loading from the server. */
  loading?: boolean;
  nothingFoundMessage?: string;
}

/**
 * Searchable single-select with create-on-the-fly, used everywhere a master is picked (asset
 * register, purchase, sale). Presentational: it holds no feature knowledge and never calls the API
 * itself — the owning feature supplies `data` and the `onCreate` mutation. Built on the Mantine v8
 * Combobox primitive because Select's `creatable` prop was removed in v7.
 */
export function MasterSelect({
  label,
  placeholder = 'Search or create…',
  data,
  value,
  onChange,
  onCreate,
  error,
  required = false,
  disabled = false,
  loading = false,
  nothingFoundMessage = 'Nothing found',
}: MasterSelectProps) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  const selectedLabel = data.find((item) => item.value === value)?.label ?? '';

  const trimmedSearch = search.trim();
  const filtered = data.filter((item) =>
    item.label.toLowerCase().includes(trimmedSearch.toLowerCase()),
  );
  const hasExactMatch = data.some(
    (item) => item.label.toLowerCase() === trimmedSearch.toLowerCase(),
  );
  const canCreate = trimmedSearch.length > 0 && !hasExactMatch;

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const created = await onCreate(trimmedSearch);
      onChange(created.value);
      setSearch('');
      combobox.closeDropdown();
    } finally {
      setCreating(false);
    }
  };

  const options = filtered.map((item) => (
    <Combobox.Option value={item.value} key={item.value}>
      {item.label}
    </Combobox.Option>
  ));

  return (
    <Combobox
      store={combobox}
      withinPortal
      onOptionSubmit={(submitted) => {
        if (submitted === CREATE_OPTION_VALUE) {
          void handleCreate();
          return;
        }
        onChange(submitted);
        setSearch('');
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          label={label}
          required={required}
          disabled={disabled || loading}
          error={error}
          component="button"
          type="button"
          pointer
          rightSection={loading || creating ? <Loader size={16} /> : <Combobox.Chevron />}
          rightSectionPointerEvents="none"
          onClick={() => combobox.toggleDropdown()}
        >
          {selectedLabel || <span style={{ opacity: 0.5 }}>{placeholder}</span>}
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Search
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder={placeholder}
        />
        <Combobox.Options>
          {options}
          {canCreate && (
            <Combobox.Option value={CREATE_OPTION_VALUE}>+ Create “{trimmedSearch}”</Combobox.Option>
          )}
          {options.length === 0 && !canCreate && (
            <Combobox.Empty>{nothingFoundMessage}</Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

/** Sentinel option value for the create row — a UUID can never collide with it. */
const CREATE_OPTION_VALUE = '$create';
