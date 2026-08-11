import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Group, Modal, Stack, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  getApiErrorCode,
  getApiErrorMessage,
  getApiFieldErrors,
} from '@/api/client';

import type { Supplier } from './suppliers.api';
import { supplierFormSchema } from './suppliers.schemas';
import type { SupplierFormValues } from './suppliers.schemas';
import { useCreateSupplier, useUpdateSupplier } from './suppliers.queries';

interface SupplierFormModalProps {
  opened: boolean;
  supplier: Supplier | null;
  onClose: () => void;
}

/** Fields that can receive server-side validation errors. */
const FORM_FIELDS = new Set<keyof SupplierFormValues>(['name', 'email']);

export function SupplierFormModal({
  opened,
  supplier,
  onClose,
}: SupplierFormModalProps) {
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
    defaultValues: {
      name: '',
      email: '',
    },
  });

  // Load current supplier data when editing, or clear the form for create mode.
  useEffect(() => {
    if (opened) {
      reset({
        name: supplier?.name ?? '',
        email: supplier?.email ?? '',
      });

      setFormError(null);
    }
  }, [opened, supplier, reset]);

  const applyServerErrors = (error: unknown): void => {
    const fieldErrors = getApiFieldErrors(error);
    let mappedAny = false;

    for (const { field, issue } of fieldErrors) {
      if (FORM_FIELDS.has(field as keyof SupplierFormValues)) {
        setError(field as keyof SupplierFormValues, {
          message: issue,
        });

        mappedAny = true;
      }
    }

    // Duplicate supplier name.
    if (
      !mappedAny &&
      getApiErrorCode(error) === 'SUPPLIER_NAME_TAKEN'
    ) {
      setError('name', {
        message: getApiErrorMessage(error),
      });

      mappedAny = true;
    }

    if (!mappedAny) {
      setFormError(
        getApiErrorMessage(
          error,
          'Could not save the supplier. Please try again.',
        ),
      );
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      if (isEdit) {
        await updateSupplier.mutateAsync({
          id: supplier.id,
          input: values,
        });

        notifications.show({
          message: `Supplier “${values.name}” updated.`,
          color: 'green',
        });
      } else {
        await createSupplier.mutateAsync(values);

        notifications.show({
          message: `Supplier “${values.name}” created.`,
          color: 'green',
        });
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

          <TextInput
            label="Email (optional)"
            placeholder="Enter supplier email"
            error={errors.email?.message}
            {...register('email')}
          />

          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              onClick={onClose}
              disabled={isSubmitting}
            >
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