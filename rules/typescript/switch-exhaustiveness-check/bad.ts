type Status = 'draft' | 'review' | 'published';

export function statusLabel(status: Status): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'review':
      return 'In review';
  }
}
