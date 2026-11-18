declare function save(): Promise<void>;

declare function showError(error: unknown): void;

export function listen(button: HTMLButtonElement): void {
  button.addEventListener('click', () => {
    save().catch(showError);
  });
}
