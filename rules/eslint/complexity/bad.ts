function statusLabel(status: string): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'review':
      return 'In review';
    // ...and 14 more cases
    default:
      return 'Unknown';
  }
}
