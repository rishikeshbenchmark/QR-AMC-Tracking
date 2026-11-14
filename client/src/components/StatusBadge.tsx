import { Badge } from '@mantine/core';

interface StatusBadgeProps {
  label: string;
  color: string;
  size?: 'xs' | 'sm' | 'md';
}

/**
 * One badge style for every status shown anywhere — asset list, asset detail, and (later) the scan
 * views. Presentational: the caller supplies the label and colour, so this component knows nothing
 * about the asset vocabulary.
 *
 * The label is always rendered as text. Colour is never the sole signal (CLAUDE.md accessibility):
 * a colour-blind user or a black-and-white print still reads the status.
 */
export function StatusBadge({ label, color, size = 'sm' }: StatusBadgeProps) {
  return (
    <Badge color={color} variant="light" size={size} radius="sm">
      {label}
    </Badge>
  );
}
