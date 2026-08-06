import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Group, Modal, Stack, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { getApiErrorCode, getApiErrorMessage, getApiFieldErrors } from '@/api/client';

import type { Customer } from './customers.api';
import { customerFormSchema } from './customers.schemas';
import type { CustomerFormValues } from './customers.schemas';
import { useCreateCustomer, useUpdateCustomer } from './customers.queries';

interface CustomersFormModalProps {
  opened: boolean;
  /** null → create mode; a customer → edit mode (name/email pre-filled). */
  customer: Customer | null;
  onClose: () => void;
}

/** The form's field names, so server `details` can only be mapped onto inputs that exist. */
const FORM_FIELDS = new Set<keyof CustomerFormValues>(['name', 'email']);

export function CustomersFormModal({ opened, customer, onClose }: CustomersFormModalProps) {
  const isEdit = customer !== null;
  const [formError, setFormError] = useState<string | null>(null);

  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: { name: '', email: '' },
  });

  // Re-seed the form each time the modal opens, so edit shows current values and create is blank.
  useEffect(() => {
    if (opened) {
      reset({ name: customer?.name ?? '', email: customer?.email ?? '' });
      setFormError(null);
    }
  }, [opened, customer, reset]);

  const applyServerErrors = (error: unknown): void => {
    const fieldErrors = getApiFieldErrors(error);
    let mappedAny = false;
    for (const { field, issue } of fieldErrors) {
      if (FORM_FIELDS.has(field as keyof CustomerFormValues)) {
        setError(field as keyof CustomerFormValues, { message: issue });
        mappedAny = true;
      }
    }
    // A duplicate name comes back as a 409 with no field details — pin it to the name input.
    if (!mappedAny && getApiErrorCode(error) === 'CUSTOMER_NAME_TAKEN') {
      setError('name', { message: getApiErrorMessage(error) });
      mappedAny = true;
    }
    if (!mappedAny) {
      setFormError(getApiErrorMessage(error, 'Could not save the customer. Please try again.'));
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (isEdit) {
        await updateCustomer.mutateAsync({ id: customer.id, input: values });
        notifications.show({ message: `Customer "${values.name}" updated.`, color: 'green' });
      } else {
        await createCustomer.mutateAsync(values);
        notifications.show({ message: `Customer "${values.name}" created.`, color: 'green' });
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
      title={isEdit ? 'Edit Customer' : 'Add Customer'}
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
            placeholder="Enter customer name"
            required
            autoFocus
            error={errors.name?.message}
            {...register('name')}
          />
          <TextInput
            label="Email (Optional)"
            placeholder="Enter email address"
            error={errors.email?.message}
            {...register('email')}
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Save
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}