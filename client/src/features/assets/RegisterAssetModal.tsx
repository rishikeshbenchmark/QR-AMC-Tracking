import { Alert, Button, Group, Modal, Stack, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEffect, useState } from 'react';

import { getApiErrorCode, getApiErrorMessage, getApiFieldErrors } from '@/api/client';
import { MasterSelect } from '@/components/MasterSelect';
import type { MasterOption } from '@/components/MasterSelect';
import {
  useCategoryOptions,
  useCreateCategoryOption,
  useCreateMakeOption,
  useCreateModelOption,
  useCreateSupplierOption,
  useMakeOptions,
  useModelOptions,
  useSupplierOptions,
} from '@/features/masters/masterLookups';
import type { MasterOptionRow } from '@/features/masters/masterLookups';

import { registerAssetFormSchema } from './assets.schemas';
import type { RegisterAssetFormInput } from './assets.schemas';
import { useRegisterAsset } from './assets.queries';

interface RegisterAssetModalProps {
  opened: boolean;
  onClose: () => void;
  /** Called with the new asset's id once the server has created it. */
  onCreated?: (assetId: string) => void;
}

const EMPTY_FORM: RegisterAssetFormInput = {
  categoryId: null,
  makeId: null,
  modelId: null,
  serialNumber: '',
  supplierId: null,
};

type FieldName = keyof RegisterAssetFormInput;

function toOptions(rows: MasterOptionRow[] | undefined): MasterOption[] {
  return (rows ?? []).map((row) => ({ value: row.id, label: row.name }));
}

/**
 * Purchase Step 1 — what the person holding the physical box can see: what it is, its serial, and
 * who supplied it. Everything else (PO, invoice, dates, cost) is Step 2.
 *
 * The three product pickers cascade: choosing a category loads its makes, choosing a make loads its
 * models, and changing a parent clears the children — otherwise you could submit a Dell make with a
 * Canon model and get a 400 back from the server's chain check for no visible reason.
 *
 * This form is hand-managed rather than react-hook-form: <MasterSelect> is a controlled Combobox and
 * the cascade needs to clear sibling fields on change, which is plain state, not a resolver.
 */
export function RegisterAssetModal({ opened, onClose, onCreated }: RegisterAssetModalProps) {
  const [values, setValues] = useState<RegisterAssetFormInput>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const categories = useCategoryOptions();
  const makes = useMakeOptions(values.categoryId);
  const models = useModelOptions(values.makeId);
  const suppliers = useSupplierOptions();

  const createCategory = useCreateCategoryOption();
  const createMake = useCreateMakeOption();
  const createModel = useCreateModelOption();
  const createSupplier = useCreateSupplierOption();

  const registerAsset = useRegisterAsset();

  // Re-seed on each open so a cancelled registration never leaks into the next one.
  useEffect(() => {
    if (opened) {
      setValues(EMPTY_FORM);
      setFieldErrors({});
      setFormError(null);
    }
  }, [opened]);

  const clearFieldError = (field: FieldName) => {
    setFieldErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleCategoryChange = (categoryId: string | null) => {
    // A different category invalidates the make and, through it, the model.
    setValues((current) => ({ ...current, categoryId, makeId: null, modelId: null }));
    clearFieldError('categoryId');
  };

  const handleMakeChange = (makeId: string | null) => {
    setValues((current) => ({ ...current, makeId, modelId: null }));
    clearFieldError('makeId');
  };

  const applyServerErrors = (error: unknown): void => {
    const details = getApiFieldErrors(error);
    const mapped: Partial<Record<FieldName, string>> = {};
    for (const { field, issue } of details) {
      if (field in EMPTY_FORM) {
        mapped[field as FieldName] = issue;
      }
    }
    // A duplicate serial is a 409 with no field details — pin it to the serial input.
    if (Object.keys(mapped).length === 0 && getApiErrorCode(error) === 'ASSET_SERIAL_TAKEN') {
      mapped.serialNumber = getApiErrorMessage(error);
    }
    if (Object.keys(mapped).length > 0) {
      setFieldErrors(mapped);
      return;
    }
    setFormError(getApiErrorMessage(error, 'Could not register the asset. Please try again.'));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const parsed = registerAssetFormSchema.safeParse(values);
    if (!parsed.success) {
      const mapped: Partial<Record<FieldName, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as FieldName | undefined;
        if (field && !mapped[field]) mapped[field] = issue.message;
      }
      setFieldErrors(mapped);
      return;
    }

    setFieldErrors({});
    try {
      const asset = await registerAsset.mutateAsync(parsed.data);
      notifications.show({
        message: `Asset ${asset.serialNumber} registered.`,
        color: 'green',
      });
      onCreated?.(asset.id);
      onClose();
    } catch (error) {
      applyServerErrors(error);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Register asset" centered>
      <form onSubmit={handleSubmit} noValidate>
        <Stack>
          {formError && (
            <Alert color="red" role="alert" variant="light">
              {formError}
            </Alert>
          )}

          <MasterSelect
            label="Category"
            required
            data={toOptions(categories.data)}
            loading={categories.isLoading}
            value={values.categoryId}
            onChange={handleCategoryChange}
            onCreate={async (name) => {
              const created = await createCategory.mutateAsync({ name });
              handleCategoryChange(created.id);
              return { value: created.id, label: created.name };
            }}
            error={fieldErrors.categoryId}
            nothingFoundMessage="No categories yet"
          />

          <MasterSelect
            label="Make"
            required
            disabled={values.categoryId === null}
            placeholder={values.categoryId === null ? 'Pick a category first' : 'Search or create…'}
            data={toOptions(makes.data)}
            loading={makes.isFetching}
            value={values.makeId}
            onChange={handleMakeChange}
            onCreate={async (name) => {
              const created = await createMake.mutateAsync({
                name,
                categoryId: values.categoryId as string,
              });
              handleMakeChange(created.id);
              return { value: created.id, label: created.name };
            }}
            error={fieldErrors.makeId}
            nothingFoundMessage="No makes in this category yet"
          />

          <MasterSelect
            label="Model"
            required
            disabled={values.makeId === null}
            placeholder={values.makeId === null ? 'Pick a make first' : 'Search or create…'}
            data={toOptions(models.data)}
            loading={models.isFetching}
            value={values.modelId}
            onChange={(modelId) => {
              setValues((current) => ({ ...current, modelId }));
              clearFieldError('modelId');
            }}
            onCreate={async (name) => {
              const created = await createModel.mutateAsync({
                name,
                makeId: values.makeId as string,
              });
              return { value: created.id, label: created.name };
            }}
            error={fieldErrors.modelId}
            nothingFoundMessage="No models for this make yet"
          />

          <TextInput
            label="Serial number"
            required
            placeholder="As printed on the unit"
            value={values.serialNumber}
            onChange={(event) => {
              // Uppercased as you type, so the stored value is never a casing surprise.
              const serialNumber = event.currentTarget.value.toUpperCase();
              setValues((current) => ({ ...current, serialNumber }));
              clearFieldError('serialNumber');
            }}
            error={fieldErrors.serialNumber}
          />

          <MasterSelect
            label="Supplier"
            required
            data={toOptions(suppliers.data)}
            loading={suppliers.isLoading}
            value={values.supplierId}
            onChange={(supplierId) => {
              setValues((current) => ({ ...current, supplierId }));
              clearFieldError('supplierId');
            }}
            onCreate={async (name) => {
              const created = await createSupplier.mutateAsync({ name });
              return { value: created.id, label: created.name };
            }}
            error={fieldErrors.supplierId}
            nothingFoundMessage="No suppliers yet"
          />

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={onClose} disabled={registerAsset.isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={registerAsset.isPending}>
              Register
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
