export function syncAll(accounts: Account[]): void {
  for (const account of accounts) {
    if (!account.active) {
      continue;
    }

    try {
      syncOpenInvoices(account);
    } catch {
      report(account);
    }
  }
}

function syncOpenInvoices(account: Account): void {
  for (const invoice of account.invoices) {
    if (invoice.open) {
      sync(invoice);
    }
  }
}
