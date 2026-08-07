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

import type { AmcSupplier } from './amc-suppliers.api';
import { amcSupplierFormSchema } from './amc-suppliers.schemas';
import type { AmcSupplierFormValues } from './amc-suppliers.schemas';
import {
  useCreateAmcSupplier,
  useUpdateAmcSupplier,
} from './amc-suppliers.queries';

interface AmcSupplierFormModalProps {
  opened: boolean;
  /** null → create mode; an AMC Supplier → edit mode. */
  amcSupplier: AmcSupplier | null;
  onClose: () => void;
}

/** The form's field names, so server details can only be mapped onto inputs that exist. */
const FORM_FIELDS = new Set<keyof AmcSupplierFormValues>(['name']);

export function AmcSupplierFormModal({
  opened,
  amcSupplier,
  onClose,
}: AmcSupplierFormModalProps) {
  const isEdit = amcSupplier !== null;
  const [formError, setFormError] = useState<string | null>(null);

  const createAmcSupplier = useCreateAmcSupplier();
  const updateAmcSupplier = useUpdateAmcSupplier();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AmcSupplierFormValues>({
    resolver: zodResolver(amcSupplierFormSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (opened) {
      reset({ name: amcSupplier?.name ?? '' });
      setFormError(null);
    }
  }, [opened, amcSupplier, reset]);

  const applyServerErrors = (error: unknown): void => {
    const fieldErrors = getApiFieldErrors(error);

    let mappedAny = false;

    for (const { field, issue } of fieldErrors) {
      if (FORM_FIELDS.has(field as keyof AmcSupplierFormValues)) {
        setError(field as keyof AmcSupplierFormValues, {
          message: issue,
        });
        mappedAny = true;
      }
    }

    if (!mappedAny && getApiErrorCode(error) === 'AMC_SUPPLIER_NAME_TAKEN') {
      setError('name', {
        message: getApiErrorMessage(error),
      });
      mappedAny = true;
    }

    if (!mappedAny) {
      setFormError(
        getApiErrorMessage(
          error,
          'Could not save the AMC Supplier. Please try again.',
        ),
      );
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      if (isEdit) {
        await updateAmcSupplier.mutateAsync({
          id: amcSupplier.id,
          input: values,
        });

        notifications.show({
          message: `AMC Supplier "${values.name}" updated.`,
          color: 'green',
        });
      } else {
        await createAmcSupplier.mutateAsync(values);

        notifications.show({
          message: `AMC Supplier "${values.name}" created.`,
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
      title={isEdit ? 'Edit AMC Supplier' : 'New AMC Supplier'}
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