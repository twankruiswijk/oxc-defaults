export function syncAll(accounts: Account[]): void {
  for (const account of accounts) {
    if (account.active) {
      try {
        for (const invoice of account.invoices) {
          if (invoice.open) {
            sync(invoice);
          }
        }
      } catch {
        report(account);
      }
    }
  }
}
