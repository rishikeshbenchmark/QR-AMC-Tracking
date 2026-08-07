import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Group, Modal, Stack, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { getApiErrorCode, getApiErrorMessage, getApiFieldErrors } from '@/api/client';
import { MasterSelect } from '@/components/MasterSelect';
import { useCategories, useCreateCategory } from '@/features/masters/categories/categories.queries';

import type { Make } from './makes.api';
import { makeFormSchema } from './makes.schemas';
import type { MakeFormValues } from './makes.schemas';
import { useCreateMake, useUpdateMake } from './makes.queries';

interface MakeFormModalProps {
  opened: boolean;
  /** null → create mode; a make → edit mode (name + category pre-filled). */
  make: Make | null;
  onClose: () => void;
}

/** The form's field names, so server `details` can only be mapped onto inputs that exist. */
const FORM_FIELDS = new Set<keyof MakeFormValues>(['name', 'categoryId']);

/**
 * Category options for the parent picker. A master dropdown, not a paginated table, so we fetch a
 * single generous page rather than reusing the CategoriesPage's 25-per-page params — the category
 * list is small and bounded (it is itself a master), so one page comfortably covers it.
 */
const CATEGORY_OPTIONS_PARAMS = { page: 1, limit: 100, sort: 'name' as const, order: 'asc' as const };

export function MakeFormModal({ opened, make, onClose }: MakeFormModalProps) {
  const isEdit = make !== null;
  const [formError, setFormError] = useState<string | null>(null);

  const createMake = useCreateMake();
  const updateMake = useUpdateMake();

  const categoriesQuery = useCategories(CATEGORY_OPTIONS_PARAMS);
  const createCategory = useCreateCategory();
  const categoryOptions = (categoriesQuery.data?.categories ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MakeFormValues>({
    resolver: zodResolver(makeFormSchema),
    defaultValues: { name: '', categoryId: '' },
  });

  // Re-seed the form each time the modal opens, so edit shows the current values and create is blank.
  useEffect(() => {
    if (opened) {
      reset({ name: make?.name ?? '', categoryId: make?.categoryId ?? '' });
      setFormError(null);
    }
  }, [opened, make, reset]);

  const applyServerErrors = (error: unknown): void => {
    const fieldErrors = getApiFieldErrors(error);
    let mappedAny = false;
    for (const { field, issue } of fieldErrors) {
      if (FORM_FIELDS.has(field as keyof MakeFormValues)) {
        setError(field as keyof MakeFormValues, { message: issue });
        mappedAny = true;
      }
    }
    // A duplicate name comes back as a 409 with no field details — pin it to the name input.
    if (!mappedAny && getApiErrorCode(error) === 'MAKE_NAME_TAKEN') {
      setError('name', { message: getApiErrorMessage(error) });
      mappedAny = true;
    }
    if (!mappedAny) {
      setFormError(getApiErrorMessage(error, 'Could not save the make. Please try again.'));
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (isEdit) {
        await updateMake.mutateAsync({ id: make.id, input: values });
        notifications.show({ message: `Make “${values.name}” updated.`, color: 'green' });
      } else {
        await createMake.mutateAsync(values);
        notifications.show({ message: `Make “${values.name}” created.`, color: 'green' });
      }
      onClose();
    } catch (error) {
      applyServerErrors(error);
    }
  });

  return (
    <Modal opened={opened} onClose={onClose} title={isEdit ? 'Edit make' : 'New make'} centered>
      <form onSubmit={onSubmit} noValidate>
        <Stack>
          {formError && (
            <Alert color="red" role="alert" variant="light">
              {formError}
            </Alert>
          )}
          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <MasterSelect
                label="Category"
                required
                data={categoryOptions}
                value={field.value}
                onChange={field.onChange}
                onCreate={async (name) => {
                  const created = await createCategory.mutateAsync({ name });
                  return { value: created.id, label: created.name };
                }}
                loading={categoriesQuery.isLoading}
                error={errors.categoryId?.message}
              />
            )}
          />
          <TextInput
            label="Name"
            required
            autoFocus
            error={errors.name?.message}
            {...register('name')}
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
