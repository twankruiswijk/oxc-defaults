const STATUS_LABELS = new Map([
  ['draft', 'Draft'],
  ['review', 'In review'],
]);

function statusLabel(status: string): string {
  return STATUS_LABELS.get(status) ?? 'Unknown';
}
