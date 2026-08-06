import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Group, Modal, Stack, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { getApiErrorCode, getApiErrorMessage, getApiFieldErrors } from '@/api/client';

import type { Category } from './customers.api';
import { categoryFormSchema } from './customers.schemas';
import type { CategoryFormValues } from './customers.schemas';
import { useCreateCategory, useUpdateCategory } from './customers.queries';

interface CategoryFormModalProps {
  opened: boolean;
  /** null → create mode; a category → edit mode (name pre-filled). */
  category: Category | null;
  onClose: () => void;
}

/** The form's field names, so server `details` can only be mapped onto inputs that exist. */
const FORM_FIELDS = new Set<keyof CategoryFormValues>(['name']);

export function CategoryFormModal({ opened, category, onClose }: CategoryFormModalProps) {
  const isEdit = category !== null;
  const [formError, setFormError] = useState<string | null>(null);

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: '' },
  });

  // Re-seed the form each time the modal opens, so edit shows the current name and create is blank.
  useEffect(() => {
    if (opened) {
      reset({ name: category?.name ?? '' });
      setFormError(null);
    }
  }, [opened, category, reset]);

  const applyServerErrors = (error: unknown): void => {
    const fieldErrors = getApiFieldErrors(error);
    let mappedAny = false;
    for (const { field, issue } of fieldErrors) {
      if (FORM_FIELDS.has(field as keyof CategoryFormValues)) {
        setError(field as keyof CategoryFormValues, { message: issue });
        mappedAny = true;
      }
    }
    // A duplicate name comes back as a 409 with no field details — pin it to the name input.
    if (!mappedAny && getApiErrorCode(error) === 'CATEGORY_NAME_TAKEN') {
      setError('name', { message: getApiErrorMessage(error) });
      mappedAny = true;
    }
    if (!mappedAny) {
      setFormError(getApiErrorMessage(error, 'Could not save the category. Please try again.'));
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (isEdit) {
        await updateCategory.mutateAsync({ id: category.id, input: values });
        notifications.show({ message: `Category “${values.name}” updated.`, color: 'green' });
      } else {
        await createCategory.mutateAsync(values);
        notifications.show({ message: `Category “${values.name}” created.`, color: 'green' });
      }
      onClose();
    } catch (error) {
      applyServerErrors(error);
    }
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? 'Edit category' : 'New category'}
      centered
    >
      <form onSubmit={onSubmit} noValidate>
        <Stack>
          {formError && (
            <Alert color="red" role="alert" variant="light">
              {formError}
            </Alert>
          )}
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
