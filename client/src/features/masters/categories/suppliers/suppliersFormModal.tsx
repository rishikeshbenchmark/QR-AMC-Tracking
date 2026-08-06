import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Group, Modal, Stack, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { getApiErrorCode, getApiErrorMessage, getApiFieldErrors } from '@/api/client';

import type { Supplier } from './suppliers.api';
import { supplierFormSchema } from './suppliers.schemas';
import type { SupplierFormValues } from './suppliers.schemas';
import { useCreateSupplier, useUpdateSupplier } from './suppliers.queries';

interface SupplierFormModalProps {
  opened: boolean;
  /** null → create mode; a supplier → edit mode (name pre-filled). */
  supplier: Supplier | null;
  onClose: () => void;
}

/** The form's field names, so server `details` can only be mapped onto inputs that exist. */
const FORM_FIELDS = new Set<keyof SupplierFormValues>(['name']);

export function SupplierFormModal({ opened, supplier, onClose }: SupplierFormModalProps) {
  const isEdit = supplier !== null;
  const [formError, setFormError] = useState<string | null>(null);

  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: { name: '' },
  });

  // Re-seed the form each time the modal opens, so edit shows the current name and create is blank.
  useEffect(() => {
    if (opened) {
      reset({ name: supplier?.name ?? '' });
      setFormError(null);
    }
  }, [opened, supplier, reset]);

  const applyServerErrors = (error: unknown): void => {
    const fieldErrors = getApiFieldErrors(error);
    let mappedAny = false;
    for (const { field, issue } of fieldErrors) {
      if (FORM_FIELDS.has(field as keyof SupplierFormValues)) {
        setError(field as keyof SupplierFormValues, { message: issue });
        mappedAny = true;
      }
    }
    // A duplicate name comes back as a 409 with no field details — pin it to the name input.
    if (!mappedAny && getApiErrorCode(error) === 'CATEGORY_NAME_TAKEN') {
      setError('name', { message: getApiErrorMessage(error) });
      mappedAny = true;
    }
    if (!mappedAny) {
      setFormError(getApiErrorMessage(error, 'Could not save the supplier. Please try again.'));
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (isEdit) {
        await updateSupplier.mutateAsync({ id: supplier.id, input: values });
        notifications.show({ message: `Supplier “${values.name}” updated.`, color: 'green' });
      } else {
        await createSupplier.mutateAsync(values);
        notifications.show({ message: `Supplier “${values.name}” created.`, color: 'green' });
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
      title={isEdit ? 'Edit supplier' : 'New supplier'}
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
