import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Group, Modal, Stack, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { getApiErrorCode, getApiErrorMessage, getApiFieldErrors } from '@/api/client';
import { MasterSelect } from '@/components/MasterSelect';
import { useMakes } from '@/features/masters/makes/makes.queries';

import type { Model } from './models.api';
import { modelFormSchema } from './models.schemas';
import type { ModelFormValues } from './models.schemas';
import { useCreateModel, useUpdateModel } from './models.queries';

interface ModelFormModalProps {
  opened: boolean;
  /** null → create mode; a model → edit mode (name + make pre-filled). */
  model: Model | null;
  onClose: () => void;
}

/** The form's field names, so server `details` can only be mapped onto inputs that exist. */
const FORM_FIELDS = new Set<keyof ModelFormValues>(['name', 'makeId']);

/**
 * Make options for the parent picker. Fetches one generous page rather than reusing MakesPage's
 * 25-per-page params — same reasoning as MakeFormModal's category options.
 */
const MAKE_OPTIONS_PARAMS = { page: 1, limit: 100, sort: 'name' as const, order: 'asc' as const };

export function ModelFormModal({ opened, model, onClose }: ModelFormModalProps) {
  const isEdit = model !== null;
  const [formError, setFormError] = useState<string | null>(null);

  const createModel = useCreateModel();
  const updateModel = useUpdateModel();

  const makesQuery = useMakes(MAKE_OPTIONS_PARAMS);
  const makeOptions = (makesQuery.data?.makes ?? []).map((m) => ({
    value: m.id,
    label: m.name,
  }));

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ModelFormValues>({
    resolver: zodResolver(modelFormSchema),
    defaultValues: { name: '', makeId: '' },
  });

  // Re-seed the form each time the modal opens, so edit shows the current values and create is blank.
  useEffect(() => {
    if (opened) {
      reset({ name: model?.name ?? '', makeId: model?.makeId ?? '' });
      setFormError(null);
    }
  }, [opened, model, reset]);

  const applyServerErrors = (error: unknown): void => {
    const fieldErrors = getApiFieldErrors(error);
    let mappedAny = false;
    for (const { field, issue } of fieldErrors) {
      if (FORM_FIELDS.has(field as keyof ModelFormValues)) {
        setError(field as keyof ModelFormValues, { message: issue });
        mappedAny = true;
      }
    }
    // A duplicate name comes back as a 409 with no field details — pin it to the name input.
    if (!mappedAny && getApiErrorCode(error) === 'MODEL_NAME_TAKEN') {
      setError('name', { message: getApiErrorMessage(error) });
      mappedAny = true;
    }
    if (!mappedAny) {
      setFormError(getApiErrorMessage(error, 'Could not save the model. Please try again.'));
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (isEdit) {
        await updateModel.mutateAsync({ id: model.id, input: values });
        notifications.show({ message: `Model “${values.name}” updated.`, color: 'green' });
      } else {
        await createModel.mutateAsync(values);
        notifications.show({ message: `Model “${values.name}” created.`, color: 'green' });
      }
      onClose();
    } catch (error) {
      applyServerErrors(error);
    }
  });

  return (
    <Modal opened={opened} onClose={onClose} title={isEdit ? 'Edit model' : 'New model'} centered>
      <form onSubmit={onSubmit} noValidate>
        <Stack>
          {formError && (
            <Alert color="red" role="alert" variant="light">
              {formError}
            </Alert>
          )}
          <Controller
            name="makeId"
            control={control}
            render={({ field }) => (
              <MasterSelect
                label="Make"
                required
                data={makeOptions}
                value={field.value}
                onChange={field.onChange}
                // No onCreate here, deliberately — a make needs its own category picker to be
                // created validly, so it can't be created from a single name typed into this
                // dropdown the way Category can be from the Make modal. Create the make on the
                // Makes page first if it doesn't exist yet.
                loading={makesQuery.isLoading}
                error={errors.makeId?.message}
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
