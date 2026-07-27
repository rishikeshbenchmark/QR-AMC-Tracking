import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';

interface ConfirmDialogProps {
  opened: boolean;
  title: string;
  /** Body — a warning sentence, or richer content (e.g. the record name in bold). */
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button for irreversible actions (delete); false for neutral confirmations. */
  destructive?: boolean;
  /** Disables buttons and shows a spinner on confirm while the action is in flight. */
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Reusable confirmation modal — presentational, no feature knowledge. Used before every destructive
 * action (delete a master, discard an asset). Buttons lock while `loading` so the action can't be
 * fired twice (CLAUDE.md: never submit twice).
 */
export function ConfirmDialog({
  opened,
  title,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      centered
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
      withCloseButton={!loading}
    >
      <Stack>
        <Text size="sm">{children}</Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button color={destructive ? 'red' : undefined} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
