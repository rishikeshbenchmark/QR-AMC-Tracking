import { Alert, Button, Group, Modal, Select, Stack, Text, Textarea } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEffect, useState } from 'react';

import { getApiErrorMessage } from '@/api/client';
import { StatusBadge } from '@/components/StatusBadge';

import type { AssetDetail } from './assets.api';
import { useChangeAssetStatus } from './assets.queries';
import { REMARKS_MAX } from './assets.schemas';
import type { AssetStatus } from './assets.status';
import { assetStatusColor, assetStatusLabel } from './assets.status';

interface ChangeStatusModalProps {
  opened: boolean;
  asset: AssetDetail;
  onClose: () => void;
}

/**
 * The manual status dropdown (ADR-0003) — a person owns this field; the system never sets it.
 *
 * The options are exactly the server's `allowedTransitions`, so the client never has to know the
 * lifecycle rules. An illegal move is therefore not offerable; the server still rejects it with a
 * 409 if one is submitted anyway, and the QC gate on DISPATCHED comes back as a 422 that the alert
 * surfaces verbatim.
 */
export function ChangeStatusModal({ opened, asset, onClose }: ChangeStatusModalProps) {
  const [status, setStatus] = useState<AssetStatus | null>(null);
  const [remarks, setRemarks] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const changeStatus = useChangeAssetStatus();

  useEffect(() => {
    if (opened) {
      setStatus(null);
      setRemarks('');
      setStatusError(null);
      setFormError(null);
    }
  }, [opened]);

  const options = asset.allowedTransitions.map((value) => ({
    value,
    label: assetStatusLabel(value),
  }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (status === null) {
      setStatusError('Pick a status.');
      return;
    }

    const trimmedRemarks = remarks.trim();
    try {
      await changeStatus.mutateAsync({
        id: asset.id,
        input: { status, remarks: trimmedRemarks === '' ? undefined : trimmedRemarks },
      });
      notifications.show({
        message: `${asset.serialNumber} is now ${assetStatusLabel(status)}.`,
        color: 'green',
      });
      onClose();
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Could not change the status.'));
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Change status" centered>
      <form onSubmit={handleSubmit} noValidate>
        <Stack>
          {formError && (
            <Alert color="red" role="alert" variant="light">
              {formError}
            </Alert>
          )}

          <Group gap="xs">
            <Text size="sm" c="dimmed">
              Currently
            </Text>
            <StatusBadge
              label={assetStatusLabel(asset.status)}
              color={assetStatusColor(asset.status)}
            />
          </Group>

          {options.length === 0 ? (
            <Alert color="gray" variant="light">
              {assetStatusLabel(asset.status)} is a final status — this asset cannot move any
              further.
            </Alert>
          ) : (
            <>
              <Select
                label="New status"
                required
                placeholder="Pick a status"
                data={options}
                value={status}
                onChange={(value) => {
                  setStatus(value as AssetStatus | null);
                  setStatusError(null);
                }}
                error={statusError ?? undefined}
                comboboxProps={{ withinPortal: true }}
              />

              <Textarea
                label="Remarks"
                description="Optional — the QC failure reason, discard reason, and so on."
                placeholder="Why is it moving?"
                maxLength={REMARKS_MAX}
                autosize
                minRows={2}
                value={remarks}
                onChange={(event) => setRemarks(event.currentTarget.value)}
              />
            </>
          )}

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={onClose} disabled={changeStatus.isPending}>
              {options.length === 0 ? 'Close' : 'Cancel'}
            </Button>
            {options.length > 0 && (
              <Button type="submit" loading={changeStatus.isPending}>
                Change status
              </Button>
            )}
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
