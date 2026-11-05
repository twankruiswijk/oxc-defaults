export function notify(active: boolean, email: string | undefined): void {
  if (active) {
    if (email) {
      sendEmail(email);
    }
  }
}
